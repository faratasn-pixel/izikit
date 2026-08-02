// GET /api/auth/oauth/facebook/callback
//
// Sequence (mirrors the Google callback, adapted for Facebook's non-OIDC flow):
//   1. Provider env check         → OAUTH_PROVIDER_DISABLED
//   2. Read state + next cookies (cleared on every exit branch)
//   3. State match strict equality → OAUTH_STATE_MISMATCH on any failure
//   4. validateAuthorizationCode(code) — no PKCE verifier for Facebook
//      - OAuth2RequestError       → OAUTH_CODE_EXCHANGE_FAILED
//      - other thrown errors      → OAUTH_GENERIC + log.error
//   5. fetchFacebookProfile(accessToken) via Graph API
//   6. profile.email missing → OAUTH_GENERIC (Facebook omits it when the
//      user has no verified email or withheld the `email` permission — we
//      have no separate email_verified flag to check, unlike Google's OIDC)
//   7. Find-or-create:
//      a. OAuthAccount.findUnique({ provider_providerAccountId }) — returning user
//      b. else User.findUnique({ email }) — silent linking; leave User.name/avatarUrl untouched
//      c. else $transaction → User + OAuthAccount; isNewUser = true
//   8. setAuthCookies(access, refresh) + setCsrfCookie()
//   9. If isNewUser: createNotification(prisma, welcomeNotification(userId, email))
//   10. Consume app-oauth-next cookie (re-validate same-origin); fall back to APP_URL
//   11. Clear ephemeral cookies; 302 redirect
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { OAuth2RequestError } from 'arctic';
import { cookies } from 'next/headers';
import { tryCreateFacebookProvider, fetchFacebookProfile } from '@/lib/server/oauth/facebook';
import { redirectToAuthError, isSameOriginNext } from '@/lib/server/oauth/error-redirect';
import {
  setAuthCookies,
  setCsrfCookie,
  createAccessToken,
  createRefreshToken,
} from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { createNotification } from '@/lib/server/notifications';
import { welcomeNotification } from '@/lib/server/notifications/templates';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';

const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'app';
const OAUTH_STATE_COOKIE = `${COOKIE_PREFIX}-oauth-fb-state`;
const OAUTH_NEXT_COOKIE = `${COOKIE_PREFIX}-oauth-next`;

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

async function clearEphemeralCookies(): Promise<void> {
  const store = await cookies();
  const expireOpts = {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax' as const,
    path: '/api/auth/oauth',
    maxAge: 0,
  };
  store.set(OAUTH_STATE_COOKIE, '', expireOpts);
  store.set(OAUTH_NEXT_COOKIE, '', expireOpts);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const appUrl = process.env.APP_URL ?? '';
    const redirectOpts = appUrl ? { appUrl } : {};

    const provider = tryCreateFacebookProvider();
    if (!provider) {
      await clearEphemeralCookies();
      return redirectToAuthError('OAUTH_PROVIDER_DISABLED', redirectOpts);
    }

    const url = req.nextUrl;
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const store = await cookies();
    const stateCookie = store.get(OAUTH_STATE_COOKIE)?.value;
    const nextCookie = store.get(OAUTH_NEXT_COOKIE)?.value;

    if (!code || !state || !stateCookie || state !== stateCookie) {
      await clearEphemeralCookies();
      return redirectToAuthError('OAUTH_STATE_MISMATCH', redirectOpts);
    }

    let accessToken: string;
    try {
      const tokens = await provider.client.validateAuthorizationCode(code);
      accessToken = tokens.accessToken();
    } catch (err) {
      await clearEphemeralCookies();
      if (err instanceof OAuth2RequestError) {
        log.warn('oauth.facebook.callback: code exchange failed', {
          code: err.code,
          description: err.description,
        });
        return redirectToAuthError('OAUTH_CODE_EXCHANGE_FAILED', redirectOpts);
      }
      log.error('oauth.facebook.callback: unexpected error', { err: String(err) });
      return redirectToAuthError('OAUTH_GENERIC', redirectOpts);
    }

    let profile: Awaited<ReturnType<typeof fetchFacebookProfile>>;
    try {
      profile = await fetchFacebookProfile(accessToken);
    } catch (err) {
      await clearEphemeralCookies();
      log.error('oauth.facebook.callback: Graph API fetch failed', { err: String(err) });
      return redirectToAuthError('OAUTH_GENERIC', redirectOpts);
    }

    // Facebook has no separate email_verified claim — presence of `email`
    // means the user has a confirmed email and granted the permission.
    if (!profile.email) {
      await clearEphemeralCookies();
      log.warn('oauth.facebook.callback: no email on profile', { sub: profile.id });
      return redirectToAuthError('OAUTH_GENERIC', redirectOpts);
    }

    // ───── Find-or-create ─────────────────────────────────────────────────
    let userId: string;
    let isNewUser = false;
    const existingByProvider = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: { provider: 'facebook', providerAccountId: profile.id },
      },
      select: { userId: true },
    });
    if (existingByProvider) {
      userId = existingByProvider.userId;
    } else {
      const normalizedEmail = profile.email.toLowerCase();
      const existingByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (existingByEmail) {
        // Silent linking — leave User.name/avatarUrl untouched (mirrors Google).
        await prisma.oAuthAccount.create({
          data: {
            userId: existingByEmail.id,
            provider: 'facebook',
            providerAccountId: profile.id,
          },
        });
        userId = existingByEmail.id;
      } else {
        const created = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: normalizedEmail,
              emailVerifiedAt: new Date(),
              name: profile.name ?? null,
              avatarUrl: profile.picture?.data?.url ?? null,
              passwordHash: null,
            },
            select: { id: true },
          });
          await tx.oAuthAccount.create({
            data: {
              userId: newUser.id,
              provider: 'facebook',
              providerAccountId: profile.id,
            },
          });
          return newUser;
        });
        userId = created.id;
        isNewUser = true;
      }
    }

    // ───── Issue session cookies ───────────────────────────────────────────
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, tokenVersion: true },
    });
    if (!u) {
      // Defensive — should never happen since we just created/linked.
      await clearEphemeralCookies();
      log.error('oauth.facebook.callback: user disappeared after create', { userId });
      return redirectToAuthError('OAUTH_GENERIC', redirectOpts);
    }
    const access = await createAccessToken({
      sub: u.id,
      email: u.email,
      tokenVersion: u.tokenVersion,
    });
    const refresh = await createRefreshToken(u.id, u.tokenVersion);
    await setAuthCookies(access, refresh);
    await setCsrfCookie();

    if (isNewUser) {
      await createNotification(prisma, welcomeNotification(u.id, u.email));
    }

    // Consume next cookie (defense-in-depth re-validation against same-origin).
    let target: string;
    if (nextCookie && appUrl) {
      let pathOnly: string | null = null;
      try {
        if (nextCookie.startsWith('/')) {
          pathOnly = nextCookie;
        } else {
          const parsed = new URL(nextCookie);
          pathOnly = `${parsed.pathname}${parsed.search}`;
        }
      } catch {
        pathOnly = null;
      }
      const validated = pathOnly ? isSameOriginNext(pathOnly, appUrl) : null;
      target = validated ?? appUrl;
    } else {
      target = appUrl || '/';
    }

    await clearEphemeralCookies();
    log.info('oauth.facebook.callback: success', { userId: u.id, isNewUser });
    return NextResponse.redirect(target, 302);
  });
}
