// POST /api/auth/login — AUTH-02 + AUTH-10 lockout integration.
//
// Source: RESEARCH.md Pattern 9 (sequence) + Pattern 8 (constant-time error
// path) + Pattern 10 (lockout-store integration).
//
// Identifier is the account email address. Rate-limit/lockout helpers are
// keyed by a generic identifier string — we pass the email.
//
// Order is load-bearing per D-24 (enumeration resistance):
//   1. Zod validate body
//   2. Per-identifier rate limit (10/15m — D-08)
//   3. Lockout flag check (Redis) — early-out before bcrypt cost
//   4. User lookup by email
//   5. No-user branch: dummy bcrypt compare → INVALID_CREDENTIALS (no recordFailure)
//   6. verifyPassword → on fail recordFailure → LOCKED_OUT or INVALID_CREDENTIALS
//   7. emailVerifiedAt check (after credential match — D-24)
//   8. recordSuccess + issue 3 cookies
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  setCsrfCookie,
  verifyPassword,
} from '@/lib/server/auth';
import { isLockedOut, recordFailure, recordSuccess } from '@/lib/server/auth/lockout';
import { dummyBcryptCompare } from '@/lib/server/auth/dummy-bcrypt';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { getRedis } from '@/lib/server/redis';
import { prisma } from '@/lib/server/prisma';
import { zEmail } from '@/lib/server/zod-helpers';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';

const LoginSchema = z.object({
  email: zEmail,
  password: z.string().min(1),
});

// Module-level limiter — D-08: 10 attempts / 15 min per identifier.
const redis = getRedis() ?? undefined;
const limiter = createEmailLimiter(
  { ...(redis ? { redis } : {}) },
  {
    bucket: 'auth:login',
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? 10),
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Try again later.',
  },
);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    // 1. Validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid JSON body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    const { email, password } = parsed.data;

    // 2. Rate limit per identifier
    const rl = await limiter.check(req, email);
    if (rl) {
      rl.headers.set('x-request-id', ctx.requestId);
      return rl;
    }

    // 3. Lockout flag check — early out before bcrypt
    if (await isLockedOut(email)) {
      log.warn('login blocked by lockout', { email });
      return NextResponse.json(
        { error: 'LOCKED_OUT', message: 'Account temporarily locked.' },
        { status: 423, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // 4. User lookup by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerifiedAt: true,
        tokenVersion: true,
        status: true,
      },
    });

    // 5. No-user (or OAuth-only) branch: dummy bcrypt then INVALID_CREDENTIALS.
    //    No recordFailure here per D-24 — Pattern 9 step 4 only counts failures
    //    against accounts that exist (otherwise an attacker can DoS arbitrary
    //    email addresses by guessing).
    if (!user || !user.passwordHash) {
      await dummyBcryptCompare(password);
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid email address or password.' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // 6. verifyPassword → on fail, recordFailure
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const r = await recordFailure(email);
      if (r.locked) {
        return NextResponse.json(
          { error: 'LOCKED_OUT', message: 'Account temporarily locked.' },
          { status: 423, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid email address or password.' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // 7. emailVerifiedAt check — after credential match (D-24).
    //    Don't recordFailure here; it's not a credential failure.
    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first.' },
        { status: 403, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // 7b. D-ADMIN-02 — refuse SUSPENDED users AFTER credentials verify (no
    //     enumeration leak: same code path as a non-existent phone up to here)
    //     but BEFORE issuing cookies.
    //
    //     WR-04: clear the lockout counter for SUSPENDED users via
    //     `recordSuccess`. The credentials already passed verifyPassword, so
    //     the account holder is legitimate — there is nothing more to deter
    //     by pinning the counter. Without this, every login attempt by a
    //     suspended user accrues toward the lockout, and a SUPERADMIN
    //     restore leaves the user one failed attempt away from a fresh
    //     lockout. Clearing here keeps the counter clean across the
    //     suspend → restore lifecycle.
    if (user.status === 'SUSPENDED') {
      await recordSuccess(email);
      return NextResponse.json(
        {
          error: 'ACCOUNT_SUSPENDED',
          message: 'This account has been suspended. Contact support.',
        },
        { status: 403, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // 8. Reset failure count and issue cookies.
    await recordSuccess(email);

    const accessToken = await createAccessToken({
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });
    const refreshToken = await createRefreshToken(user.id, user.tokenVersion);
    await setAuthCookies(accessToken, refreshToken);
    await setCsrfCookie();

    return NextResponse.json(
      { ok: true, user: { sub: user.id, email: user.email } },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
