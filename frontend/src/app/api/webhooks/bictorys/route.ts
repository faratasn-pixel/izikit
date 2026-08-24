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
import { enqueueOutbox } from '@/lib/server/outbox';
import { prisma } from '@/lib/server/prisma';
import { isPlanKey } from '@/lib/subscription-plans';
import { TOKEN_PACK_CATALOG, isTokenPackKey } from '@/lib/token-packs';

const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

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

    // Settings → "Abonnement & paiement" plan changes ride the existing
    // Order/Bictorys one-time-charge pipeline instead of a parallel charge
    // route — POST /api/orders is called directly with this metadata tag.
    // Activate the plan here, inside the same Serializable tx, once payment
    // is confirmed. No renewal cron exists yet (see
    // .planning/banani/abonnement-paiement.md) — currentPeriodEnd is
    // informational only.
    const meta = (order.metadata ?? null) as {
      kind?: unknown;
      planKey?: unknown;
      packKey?: unknown;
    } | null;
    if (order.userId && meta?.kind === 'subscription_plan_change' && isPlanKey(meta.planKey)) {
      await tx.subscription.upsert({
        where: { userId: order.userId },
        create: {
          userId: order.userId,
          planKey: meta.planKey,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + SUBSCRIPTION_PERIOD_MS),
        },
        update: {
          planKey: meta.planKey,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + SUBSCRIPTION_PERIOD_MS),
          canceledAt: null,
        },
      });
    }

    // "Acheter des jetons" rides the same Order/Bictorys one-time-charge
    // pipeline as the subscription upgrade above — POST /api/orders is
    // called directly with this metadata tag from the /jetons page. Credit
    // the wallet here, inside the same Serializable tx, once payment is
    // confirmed: this is core financial state, not a side-effect, so it
    // does NOT go through the outbox.
    if (order.userId && meta?.kind === 'token_purchase' && isTokenPackKey(meta.packKey)) {
      const pack = TOKEN_PACK_CATALOG[meta.packKey];
      const wallet = await tx.tokenWallet.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId, balance: pack.tokens },
        update: { balance: { increment: pack.tokens } },
      });
      await tx.tokenTransaction.create({
        data: {
          userId: order.userId,
          type: 'PURCHASE',
          amount: pack.tokens,
          balanceAfter: wallet.balance,
          description: `Achat pack ${pack.label}`,
          orderId: order.id,
        },
      });
    }

    // Outbox emits stay inside the factory's Serializable tx so the rows
    // commit atomically with the status change. The drain cron picks them up
    // out-of-band.
    if (order.userId) {
      await enqueueOutbox(tx, {
        kind: 'notification.payment_received',
        payload: {
          userId: order.userId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      });
    }
    if (order.customerEmail) {
      await enqueueOutbox(tx, {
        kind: 'email.payment_confirmation',
        payload: {
          to: order.customerEmail,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      });
    }

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
