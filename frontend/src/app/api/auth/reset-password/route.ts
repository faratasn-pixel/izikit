// AUTH-08 — POST /api/auth/reset-password
//
// Consumes a PASSWORD_RESET code and updates the user's password. In a single
// tx: hashes the new password, updates User.passwordHash, bumps
// User.tokenVersion (RESEARCH.md Open Question #4 — kicks all existing
// sessions, including any attacker-held one), and marks the code usedAt.
// Does NOT issue cookies — user must log in fresh after a reset.
//
// Identifier is EMAIL (mirrors /api/auth/forgot-password). The lockout
// counter cleared below is still PHONE-keyed to match /api/auth/login's
// bucket, so the user's phone is resolved from the email lookup.
//
// Password policy gates run BEFORE looking up the user/code so banned/short
// passwords don't burn a code attempt.
//
// CSRF carve-out: pre-session route — the bearer of the code is the proof.
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { zEmail } from '@/lib/server/zod-helpers';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';
import { VERIFICATION_CODE_REGEX, hashPassword } from '@/lib/server/auth';
import { isBanned } from '@/lib/server/auth/banned-passwords';
import { isPwned } from '@/lib/server/auth/hibp';
import { recordSuccess } from '@/lib/server/auth/lockout';

const PASSWORD_MIN = Number(process.env.AUTH_PASSWORD_MIN_LENGTH ?? 10);

const Body = z.object({
  email: zEmail,
  code: z.string().regex(VERIFICATION_CODE_REGEX, 'Invalid verification code format'),
  newPassword: z.string().min(1),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'auth:reset',
  windowMs: 15 * 60 * 1000, // 15 min (D-08)
  max: Number(process.env.AUTH_RESET_RATE_LIMIT_MAX ?? 5),
  code: 'TOO_MANY_RESET_ATTEMPTS',
  message: 'Too many password-reset attempts. Try again later.',
});

function formatIssues(err: z.ZodError) {
  return err.issues.map((e) => ({ path: e.path.join('.'), message: e.message }));
}

export async function POST(req: NextRequest): Promise<Response> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      const res = NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: formatIssues(parsed.error) },
        { status: 400 },
      );
      res.headers.set('x-request-id', ctx.requestId);
      return res;
    }
    const { email, code, newPassword } = parsed.data;

    // WR-01 — rate-limit BEFORE password policy gates. Otherwise an
    // unauthenticated attacker can probe HIBP / banned-list state for arbitrary
    // passwords without ever burning the per-identifier rate budget (rotate
    // emails, vary newPassword). The limiter is a single Redis incr — cheap to
    // run first, and it forces the attacker to spend budget before learning
    // anything about HIBP/banned state.
    const rateFail = await limiter.check(req, email);
    if (rateFail) return rateFail;

    // Password policy gates AFTER limiter — short/banned/HIBP passwords still
    // short-circuit before the DB lookup so they don't burn a code attempt.
    if (isBanned(newPassword)) {
      const res = NextResponse.json(
        { error: 'PASSWORD_BANNED', message: 'This password is too common.' },
        { status: 400 },
      );
      res.headers.set('x-request-id', ctx.requestId);
      return res;
    }
    if (newPassword.length < PASSWORD_MIN) {
      const res = NextResponse.json(
        {
          error: 'PASSWORD_TOO_SHORT',
          message: `Password must be at least ${PASSWORD_MIN} characters`,
        },
        { status: 400 },
      );
      res.headers.set('x-request-id', ctx.requestId);
      return res;
    }
    if (process.env.PASSWORD_HIBP_CHECK === '1' && (await isPwned(newPassword))) {
      const res = NextResponse.json(
        {
          error: 'PASSWORD_PWNED',
          message: 'This password appeared in a known data breach.',
        },
        { status: 400 },
      );
      res.headers.set('x-request-id', ctx.requestId);
      return res;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, phone: true },
    });
    if (!user) {
      const res = NextResponse.json(
        {
          error: 'VERIFICATION_CODE_INVALID',
          message: 'Verification code is invalid.',
        },
        { status: 400 },
      );
      res.headers.set('x-request-id', ctx.requestId);
      return res;
    }

    const codeRow = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code,
        type: 'PASSWORD_RESET',
        usedAt: null,
      },
      select: { id: true, expiresAt: true },
    });
    if (!codeRow) {
      const res = NextResponse.json(
        {
          error: 'VERIFICATION_CODE_INVALID',
          message: 'Verification code is invalid.',
        },
        { status: 400 },
      );
      res.headers.set('x-request-id', ctx.requestId);
      return res;
    }
    if (codeRow.expiresAt.getTime() < Date.now()) {
      const res = NextResponse.json(
        {
          error: 'VERIFICATION_CODE_EXPIRED',
          message: 'Verification code has expired.',
        },
        { status: 400 },
      );
      res.headers.set('x-request-id', ctx.requestId);
      return res;
    }

    const passwordHash = await hashPassword(newPassword);
    // WR-05 — close the TOCTOU window between findFirst (usedAt:null) and the
    // update below. Use updateMany with the usedAt:null guard so the second
    // concurrent request finds 0 rows and we surface INVALID.
    try {
      await prisma.$transaction(async (tx) => {
        const consumed = await tx.verificationCode.updateMany({
          where: { id: codeRow.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (consumed.count === 0) {
          throw new Error('VERIFICATION_CODE_RACE');
        }
        await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            tokenVersion: { increment: 1 },
          },
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'VERIFICATION_CODE_RACE') {
        const res = NextResponse.json(
          {
            error: 'VERIFICATION_CODE_INVALID',
            message: 'Verification code is invalid.',
          },
          { status: 400 },
        );
        res.headers.set('x-request-id', ctx.requestId);
        return res;
      }
      throw err;
    }

    // WR-02 — clear lockout counter on successful reset. Old password
    // failures shouldn't carry over to the new password. Keyed by phone to
    // match /api/auth/login's lockout bucket (also phone-keyed) — resolved
    // from the email lookup above since the request identifier is email.
    // Phone is nullable (e.g. Google-only accounts) — nothing to clear then.
    if (user.phone) {
      await recordSuccess(user.phone);
    }

    log.info('password reset', { userId: user.id });
    const res = NextResponse.json({ ok: true });
    res.headers.set('x-request-id', ctx.requestId);
    return res;
  });
}
