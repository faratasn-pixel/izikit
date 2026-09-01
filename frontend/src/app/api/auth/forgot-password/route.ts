// AUTH-07 — POST /api/auth/forgot-password
//
// Enumeration-resistant: returns 200 { ok: true } regardless of whether the
// email is registered (D-23). When the user exists, creates a
// PASSWORD_RESET code + email outbox event in one tx. When the user does not
// exist, runs dummyBcryptCompare for timing parity. No cookies are touched
// here — the flow continues at /api/auth/reset-password.
//
// Lookup is by EMAIL. Note that /api/auth/login and its lockout bucket are
// still PHONE-keyed — /api/auth/reset-password resolves the user's phone
// after finding them by email so a successful reset still clears that
// phone-keyed lockout (see the comment there).
//
// Timing-parity strategy (CR-01 fix): both branches run dummyBcryptCompare
// (~150-300ms at cost 12) AND are anchored to a fixed wall-clock target
// latency floor. The bcrypt compare is the dominant cost on BOTH branches —
// the user-exists branch's $transaction (verificationCode.create + outbox
// enqueue, ~20-80ms) is dwarfed by it. The wall-clock floor smooths out any
// residual jitter (Neon cold-start, outbox latency spikes) so a network
// observer cannot distinguish branches by response time.
//
// CSRF carve-out: pre-session route.
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { zEmail } from '@/lib/server/zod-helpers';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';
import { generateVerificationCode } from '@/lib/server/auth';
import { dummyBcryptCompare } from '@/lib/server/auth/dummy-bcrypt';
import { enqueueOutbox } from '@/lib/server/outbox';

const VERIFICATION_TTL_MS = Number(process.env.AUTH_VERIFICATION_TTL_MIN ?? 15) * 60 * 1000;

// CR-01 — wall-clock floor for both branches. 350ms covers a cost-12 bcrypt
// compare worst-case + a single $transaction roundtrip + jitter, so the
// no-user branch never finishes faster than the user-exists branch even on
// fast Neon-pooler responses. Override via env if observed P99 differs.
const TARGET_LATENCY_MS = Number(process.env.AUTH_FORGOT_TARGET_LATENCY_MS ?? 350);

const Body = z.object({ email: zEmail });

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'auth:forgot',
  windowMs: 60 * 60 * 1000, // 1 hour (D-08)
  max: Number(process.env.AUTH_FORGOT_RATE_LIMIT_MAX ?? 3),
  code: 'TOO_MANY_FORGOT_ATTEMPTS',
  message: 'Too many password-reset requests. Try again later.',
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
    const { email } = parsed.data;

    const rateFail = await limiter.check(req, email);
    if (rateFail) return rateFail;

    // CR-01 — anchor BOTH branches to a fixed wall-clock target latency so a
    // network observer cannot distinguish user-exists from no-user by timing.
    const startedAt = Date.now();

    // CR-01 — run dummyBcryptCompare on BOTH branches so bcrypt-cost is the
    // dominant cost regardless of branch. The user-exists branch's
    // $transaction (~20-80ms) is dwarfed by the ~150-300ms bcrypt compare.
    await dummyBcryptCompare(email);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
      await prisma.$transaction(async (tx) => {
        await tx.verificationCode.create({
          data: {
            userId: user.id,
            code,
            type: 'PASSWORD_RESET',
            expiresAt,
          },
        });
        await enqueueOutbox(tx, {
          kind: 'email.password_reset',
          payload: {
            to: user.email,
            code,
            expiresAt: expiresAt.toISOString(),
          },
        });
      });
      log.info('forgot-password code issued', { userId: user.id });
    } else {
      log.info('forgot-password no-user (enumeration-resist)');
    }

    // CR-01 — wall-clock floor: pad to TARGET_LATENCY_MS so residual jitter
    // (Neon cold-start, outbox latency spikes) cannot reveal the branch.
    const elapsed = Date.now() - startedAt;
    if (elapsed < TARGET_LATENCY_MS) {
      await new Promise((r) => setTimeout(r, TARGET_LATENCY_MS - elapsed));
    }

    const res = NextResponse.json({ ok: true });
    res.headers.set('x-request-id', ctx.requestId);
    return res;
  });
}
