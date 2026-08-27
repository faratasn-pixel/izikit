/**
 * POST /api/webhooks/moneroo — Moneroo payment webhook adapter.
 *
 * Thin shim over the battle-tested factory at `lib/server/webhook/handler.ts`
 * (PROTECTED — never modified). Mirrors `webhooks/bictorys/route.ts` — same
 * factory, same `fulfillPaidOrder` shared side-effects, different provider.
 *
 * CLAUDE.md invariants honored here:
 *   - runtime = 'nodejs' is exported below (Buffer/crypto + Prisma — the
 *     runtime-enforcement test fails CI otherwise).
 *   - dynamic = 'force-dynamic' is exported below (prevents accidental POST
 *     caching by Next.js).
 *   - This file NEVER reads the request body. The factory itself reads the
 *     raw bytes for byte-identical HMAC verification.
 *   - Side-effects run inside the factory's Serializable tx via
 *     `fulfillPaidOrder`, which itself uses enqueueOutbox(tx, ...) — never
 *     after-commit closures (D-04 outbox-not-closures invariant).
 *
 * Moneroo does not document a distinct "refunded" webhook event — only
 * success / failed / cancelled — so there is no `onRefunded` handler here
 * (cancelled maps to `kind: 'failed'` in the adapter's classifyStatus).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { createWebhookHandler } from '@/lib/server/webhook/handler';
import { monerooWebhookProvider } from '@/lib/server/webhook/moneroo';
import { fulfillPaidOrder } from '@/lib/server/payments/fulfill-order';
import { prisma } from '@/lib/server/prisma';

export const POST = createWebhookHandler({
  prisma,
  provider: monerooWebhookProvider,

  async onPaid(payload, tx) {
    const externalRef = String(payload.data?.id ?? '');
    if (!externalRef) return {}; // no id to correlate

    const order = await tx.order.findFirst({
      where: { providerChargeId: externalRef },
    });
    if (!order) return {}; // unknown charge — log + drop (no DB row to update)

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await fulfillPaidOrder(tx, order);

    return {};
  },

  async onFailed(payload, tx) {
    const externalRef = String(payload.data?.id ?? '');
    if (!externalRef) return {};
    const order = await tx.order.findFirst({
      where: { providerChargeId: externalRef },
    });
    if (!order) return {};
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'FAILED' },
    });
    return {};
  },
});
