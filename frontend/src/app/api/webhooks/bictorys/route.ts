/**
 * POST /api/webhooks/bictorys — Bictorys payment webhook adapter.
 *
 * Thin shim over the battle-tested factory at `lib/server/webhook/handler.ts`
 * (PROTECTED — never modified). The factory does ALL the hard work: raw-body
 * read via arrayBuffer, HMAC verify, Serializable transaction, WebhookLog
 * upsert + dedup, dispatch, processedAt write-back. This file only wires:
 *   - the Bictorys-specific WebhookProvider (HMAC + payload parser)
 *   - per-event handlers that update Order rows + emit outbox events
 *
 * CLAUDE.md invariants honored here:
 *   - runtime = 'nodejs' is exported below (Buffer/crypto + Prisma — the
 *     runtime-enforcement test fails CI otherwise).
 *   - dynamic = 'force-dynamic' is exported below (prevents accidental POST
 *     caching by Next.js).
 *   - This file NEVER reads the request body. The factory itself reads the
 *     raw bytes for byte-identical HMAC verification — reading the body here
 *     would be a silent HMAC regression.
 *   - Side-effects use enqueueOutbox(tx, ...) INSIDE the same Serializable tx
 *     the factory opens — never via after-commit closures (D-04 outbox-not-
 *     closures invariant).
 *
 * Phase 5 / Plan 05-02. WH-01 + WH-02.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { createWebhookHandler } from '@/lib/server/webhook/handler';
import { bictorysWebhookProvider } from '@/lib/server/webhook/bictorys';
import { fulfillPaidOrder } from '@/lib/server/payments/fulfill-order';
import { prisma } from '@/lib/server/prisma';

export const POST = createWebhookHandler({
  prisma,
  provider: bictorysWebhookProvider,

  async onPaid(payload, tx) {
    const externalRef = String(payload.charge_id ?? payload.chargeId ?? payload.id ?? '');
    if (!externalRef) return {}; // no id to correlate

    const order = await tx.order.findFirst({
      where: { providerChargeId: externalRef },
    });
    if (!order) return {}; // unknown charge — log + drop (no DB row to update)

    const paymentMethod = payload.payment_method ? String(payload.payment_method) : null;

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        ...(paymentMethod !== null ? { paymentMethod } : {}),
      },
    });

    // Subscription activation / token-wallet crediting / outbox emits are
    // provider-agnostic — shared with the Moneroo webhook route so the two
    // never drift. Runs inside this same Serializable tx.
    await fulfillPaidOrder(tx, order);

    return {};
  },

  async onRefunded(payload, tx) {
    const externalRef = String(payload.charge_id ?? payload.chargeId ?? payload.id ?? '');
    if (!externalRef) return {};
    const order = await tx.order.findFirst({
      where: { providerChargeId: externalRef },
    });
    if (!order) return {};
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' },
    });
    // No outbox emit in v1 — `notification.refund_received` kind is not
    // declared in outbox/types.ts (RESEARCH §"Pattern 1" + A6). Adding it
    // would touch the PROTECTED dispatcher; deferred to a follow-up phase.
    return {};
  },

  async onFailed(payload, tx) {
    const externalRef = String(payload.charge_id ?? payload.chargeId ?? payload.id ?? '');
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
