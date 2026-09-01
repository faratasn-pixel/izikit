// PAY-01 — POST /api/orders.
//
// Sequence (RESEARCH.md Pattern 3 + Pitfalls 3 & 7):
//   1. verifyCsrf(req)           — CF-02 (mutating route, before auth)
//   2. requireAuth()              — D-PAY-03 (no guest checkout in v1)
//   3. Idempotency-Key header     — D-PAY-01 (Stripe-grade replay)
//   4. Replay branch              — Pitfall 3 (replay outcome, not row)
//   5. Zod parse body             — D-PAY-04
//   6. getProvider() lazy init    — Pitfall 7 (503 not 500 on missing env)
//   7. Insert PENDING Order row   — stable externalRef for the charge call
//   8. breaker.execute(provider.charge) — D-PAY-02 (single-instance breaker)
//   9. Update Order with charge id + paymentUrl, return 201
//
// Error mapping:
//   missing Idempotency-Key  → 400 IDEMPOTENCY_KEY_REQUIRED
//   Idempotency-Key too long → 400 IDEMPOTENCY_KEY_INVALID
//   replay PENDING/PAID      → 200 with prior row's paymentUrl
//   replay body mismatch     → 422 IDEMPOTENCY_KEY_BODY_MISMATCH (CR-02)
//   replay FAILED/EXPIRED/REFUNDED → 503 PAYMENT_PROVIDER_UNAVAILABLE
//   Zod failure              → 400 VALIDATION_FAILED
//   missing MONEROO_* env    → 503 PAYMENT_PROVIDER_UNCONFIGURED
//   CircuitOpenError         → 503 PAYMENT_PROVIDER_UNAVAILABLE + Retry-After
//   provider.charge throw    → 502 PAYMENT_FAILED (breaker has counted it)
//
// CR-02 — body fingerprint binding for Idempotency-Key replays.
// The fingerprint is a SHA-256 of canonicalized `{amount, currency}` JSON,
// stored on `Order.metadata.idempotencyBodyHash` at insert time. On replay
// with the same key but a different body, we 422 instead of returning the
// prior order's paymentUrl. This is Stripe-grade semantics. We use the
// existing `metadata` Json column rather than introducing a new dedicated
// column to keep the live fix migration-free; a follow-up plan should
// promote this to a typed `Order.idempotencyBodyHash String?` column.
//
// `runtime = 'nodejs'` is required by the runtime-enforcement test
// (frontend/src/lib/server/observability/runtime-enforcement.test.ts).
export const runtime = 'nodejs';

import 'server-only';
import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { CircuitOpenError } from '@/lib/server/payments/circuit-breaker';
import {
  breaker,
  getProvider,
  PaymentProviderUnconfiguredError,
} from '@/lib/server/payments/provider-singleton';

// CR-02 helpers ────────────────────────────────────────────────────────
// Idempotency-Key length cap. 200 chars matches Stripe's documented limit
// and prevents unbounded keyspace abuse via huge keys.
const IDEM_KEY_MAX_LEN = 200;

// SHA-256 of the canonicalized request body. Only the fields that affect
// the charge outcome are included — amount + currency. Optional fields
// (customerEmail, customerPhone, customerName, metadata) are excluded
// because they do not change what the user is billed; including them
// would generate spurious 422s for cosmetic re-tries.
function fingerprintBody(input: { amount: number; currency: string }): string {
  const canonical = JSON.stringify({ amount: input.amount, currency: input.currency });
  return createHash('sha256').update(canonical).digest('hex');
}

// D-PAY-04 — body schema. amount must be a positive integer in the smallest
// currency unit (CF-10). currency defaults to XOF (FCFA, Senegal). All
// customer/metadata fields optional; customerEmail defaults to the auth
// session's email if absent.
const Body = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3).default('XOF'),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h PENDING window

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    // 1. CSRF (CF-02 — before auth)
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    // 2. Auth (D-PAY-03 — no guest checkout in v1)
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // 3. Idempotency-Key header (D-PAY-01)
    const idemKey = req.headers.get('idempotency-key') ?? '';
    if (!idemKey) {
      return NextResponse.json(
        {
          error: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'Idempotency-Key header required',
        },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    // CR-02: bound the key length so an attacker cannot exhaust the unique
    // index with arbitrarily large keys.
    if (idemKey.length > IDEM_KEY_MAX_LEN) {
      return NextResponse.json(
        {
          error: 'IDEMPOTENCY_KEY_INVALID',
          message: `Idempotency-Key exceeds ${IDEM_KEY_MAX_LEN} characters`,
        },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // 4. Zod (D-PAY-04) — parsed BEFORE replay so we can fingerprint the
    // current body and compare against the stored fingerprint of the row
    // that originally created this idempotency key (CR-02).
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Invalid request body',
          issues: parsed.error.issues,
        },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    const bodyHash = fingerprintBody({
      amount: parsed.data.amount,
      currency: parsed.data.currency,
    });

    // 5. Replay (Pitfall 3 — echo the outcome, not the row)
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: idemKey },
    });
    if (existing) {
      // CR-02 — body fingerprint binding. If the prior order was created
      // under a different (amount, currency), refuse the replay with 422
      // (Stripe semantics). The stored fingerprint lives on metadata
      // until a dedicated column is added.
      const existingMeta = (existing.metadata ?? null) as { idempotencyBodyHash?: unknown } | null;
      const storedHash =
        existingMeta && typeof existingMeta.idempotencyBodyHash === 'string'
          ? existingMeta.idempotencyBodyHash
          : null;
      // Defensive fallback: if the stored row predates the fingerprint
      // (no hash recorded), fall back to comparing the load-bearing fields
      // directly. This protects rows created before the CR-02 deploy.
      const matchesBody =
        storedHash !== null
          ? storedHash === bodyHash
          : existing.amount === parsed.data.amount && existing.currency === parsed.data.currency;
      if (!matchesBody) {
        return NextResponse.json(
          {
            error: 'IDEMPOTENCY_KEY_BODY_MISMATCH',
            message: 'Idempotency-Key already used for a different request body.',
          },
          { status: 422, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      if (existing.status === 'PENDING' || existing.status === 'PAID') {
        // WR-01 — guard against the in-flight crash race. If the prior
        // request crashed between `prisma.order.create` and the post-charge
        // `update` that sets paymentUrl, this row is PENDING with a null
        // paymentUrl. Returning that to the client leaves them stuck (no
        // URL to redirect to) and the breaker.execute side never runs again
        // because the row already exists. Emit 503 PAYMENT_IN_FLIGHT with a
        // Retry-After so the client can poll until the prior attempt either
        // populates paymentUrl or transitions to FAILED via the Vercel
        // cron expiration job.
        if (existing.status === 'PENDING' && !existing.paymentUrl) {
          return NextResponse.json(
            {
              error: 'PAYMENT_IN_FLIGHT',
              message: 'Prior attempt did not complete; retry shortly.',
            },
            {
              status: 503,
              headers: {
                'x-request-id': ctx.requestId,
                'Retry-After': '5',
              },
            },
          );
        }
        return NextResponse.json(
          {
            id: existing.id,
            paymentUrl: existing.paymentUrl,
            status: existing.status,
          },
          { status: 200, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      // FAILED / EXPIRED / REFUNDED — don't replay an empty paymentUrl into
      // the frontend redirect; tell the client the prior attempt didn't
      // complete and a fresh Idempotency-Key is required to retry.
      return NextResponse.json(
        {
          error: 'PAYMENT_PROVIDER_UNAVAILABLE',
          message:
            'A previous attempt with this Idempotency-Key did not complete; submit a new key to retry.',
        },
        { status: 503, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // 6. Lazy provider init (Pitfall 7 — translate to 503, never 500)
    let provider;
    try {
      provider = getProvider();
    } catch (err) {
      if (err instanceof PaymentProviderUnconfiguredError) {
        return NextResponse.json(
          {
            error: 'PAYMENT_PROVIDER_UNCONFIGURED',
            message: 'Payment provider not configured',
          },
          { status: 503, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      throw err;
    }

    // 6b. WR-06 — fail closed when PUBLIC_URL is unset in production.
    // The success/failure URLs handed to the payment provider are baked
    // into the hosted checkout; a forgotten PUBLIC_URL env var in prod
    // means real charges redirect users to http://localhost:3000 after
    // payment. Surface this as the same 503 PAYMENT_PROVIDER_UNCONFIGURED
    // disposition (boot-time misconfig). In dev/test we keep the
    // localhost fallback so local development still works.
    const envPublicUrl = process.env.PUBLIC_URL;
    if (!envPublicUrl && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error: 'PAYMENT_PROVIDER_UNCONFIGURED',
          message: 'PUBLIC_URL not set; cannot construct success/failure redirect URLs.',
        },
        { status: 503, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    const publicUrl = envPublicUrl ?? 'http://localhost:3000';

    // 7. Insert PENDING Order — gives us a stable id usable as externalRef
    // and the row that Pitfall 3's replay branch will read on retry.
    //
    // CR-02 — store the body fingerprint inside `metadata` under the
    // reserved key `idempotencyBodyHash`. We merge with any client-supplied
    // metadata so domain fields are preserved. A future migration should
    // promote this to a dedicated typed column on Order.
    const mergedMetadata: Prisma.InputJsonValue = {
      ...(parsed.data.metadata ?? {}),
      idempotencyBodyHash: bodyHash,
    };
    const order = await prisma.order.create({
      data: {
        userId: auth.user.sub,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        provider: provider.name,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + ORDER_EXPIRY_MS),
        idempotencyKey: idemKey,
        customerEmail: parsed.data.customerEmail ?? auth.user.email,
        ...(parsed.data.customerPhone ? { customerPhone: parsed.data.customerPhone } : {}),
        ...(parsed.data.customerName ? { customerName: parsed.data.customerName } : {}),
        metadata: mergedMetadata,
      },
    });

    // 8. Wrap charge in CircuitBreaker (D-PAY-02)
    try {
      const result = await breaker.execute(() =>
        provider.charge({
          amount: parsed.data.amount,
          currency: parsed.data.currency,
          customer: {
            email: parsed.data.customerEmail ?? auth.user.email,
            ...(parsed.data.customerPhone ? { phone: parsed.data.customerPhone } : {}),
            ...(parsed.data.customerName ? { name: parsed.data.customerName } : {}),
          },
          successUrl: `${publicUrl}/orders/${order.id}/success`,
          failureUrl: `${publicUrl}/orders/${order.id}/failed`,
          externalRef: order.id,
        }),
      );

      // 9. Persist provider refs + return 201
      await prisma.order.update({
        where: { id: order.id },
        data: {
          providerChargeId: result.providerChargeId,
          paymentUrl: result.paymentUrl,
        },
      });

      return NextResponse.json(
        {
          id: order.id,
          paymentUrl: result.paymentUrl,
          status: 'PENDING',
        },
        { status: 201, headers: { 'x-request-id': ctx.requestId } },
      );
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        // Mark FAILED so a retry with the same Idempotency-Key correctly
        // replays the adverse outcome (Pitfall 3) instead of returning 200
        // with an empty paymentUrl.
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'FAILED' },
        });
        const retryAfterSec = Math.max(1, Math.ceil((err.retryAt.getTime() - Date.now()) / 1000));
        return NextResponse.json(
          {
            error: 'PAYMENT_PROVIDER_UNAVAILABLE',
            message: 'Payment provider temporarily unavailable. Try again shortly.',
          },
          {
            status: 503,
            headers: {
              'x-request-id': ctx.requestId,
              'Retry-After': String(retryAfterSec),
            },
          },
        );
      }

      // Real provider failure (HTTP error / network). The breaker has
      // already counted this; surface it to the client. Mark Order FAILED
      // so the next replay with the same Idempotency-Key emits 503 not 200.
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' },
      });
      const message = err instanceof Error ? err.message : 'Unknown payment error';
      return NextResponse.json(
        { error: 'PAYMENT_FAILED', message },
        { status: 502, headers: { 'x-request-id': ctx.requestId } },
      );
    }
  });
}
