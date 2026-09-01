// POST /api/auth/sessions/revoke-others — Settings → Sécurité →
// "Déconnecter tous les autres appareils".
//
// No per-device session tracking exists in this starter (see CLAUDE.md —
// only `User.tokenVersion` global invalidation). Bumping tokenVersion
// invalidates EVERY outstanding access/refresh token, including the one on
// the browser tab that made this request — so, exactly like change-password
// and set-password, we immediately mint fresh tokens with the bumped
// version and reissue cookies so the current session survives while every
// other device is logged out on its next request.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import {
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  setCsrfCookie,
  verifyCsrf,
} from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) {
      csrfFail.headers.set('x-request-id', ctx.requestId);
      return csrfFail;
    }

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.sub },
      data: { tokenVersion: { increment: 1 } },
      select: { id: true, email: true, tokenVersion: true },
    });

    const access = await createAccessToken({
      sub: updated.id,
      email: updated.email,
      tokenVersion: updated.tokenVersion,
    });
    const refresh = await createRefreshToken(updated.id, updated.tokenVersion);
    await setAuthCookies(access, refresh);
    await setCsrfCookie();

    log.info('sessions.revoke-others success', { userId: updated.id });

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
