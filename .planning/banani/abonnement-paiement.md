# Abonnement & Paiement — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `iB8MbJT5-w3v` ("Abonnement Paiement"), fetched live via MCP 2026-07-30.
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`).

## Scope decision (confirmed with the user)
This screen is materially larger than Mon Agence / Documents légaux: full
recurring billing, a token/wallet system, and a "visites virtuelles" (VR)
feature that doesn't exist anywhere else in the app. Building all of that for
real (renewal cron, Bictorys webhook-driven wallet ledger, a VR-visit domain
model, card tokenization) was explicitly ruled out as too large for this
pass. Confirmed scope:
- **Real**: current plan + plan catalog (Gratuit/Pro Agent/Agence Premium),
  changing plan. Downgrading to the free plan is immediate (no charge).
  Upgrading to a paid plan creates a real one-time Bictorys charge via the
  **existing** `POST /api/orders` route (reused as-is, not duplicated) with
  `metadata.kind = 'subscription_plan_change'`; the webhook activates the new
  plan once Bictorys confirms payment. Cancelling an active paid plan is
  real (flips to `CANCELED`, access nominally continues until
  `currentPeriodEnd` — see limitations below).
- **Illustrative/disabled** (same convention as Agent Dashboard KPIs / Mon
  Agence stat chips): jetons VR balance + usage, VR-visit counters, saved
  payment methods, payment history table. These reproduce the mockup's
  numbers verbatim behind a "Bientôt disponible" note — no real wallet
  ledger, no real payment-method storage/tokenization, no real receipts.
- **Explicit limitation, not silently swept under the rug**: there is no
  renewal cron. `currentPeriodEnd` is stored and displayed (purchase date +
  30 days) but nothing automatically expires/downgrades a subscription when
  it passes, and a cancellation takes effect in the DB immediately
  (`status: CANCELED`) rather than waiting for `currentPeriodEnd` — the UI
  copy says "accès valable jusqu'au …" but nothing enforces that cutoff
  server-side yet. Flagged here and in the component so a future pass can
  wire a real `cron/subscription-expire` route mirroring `order-expiration`.

## System context
- `Order` + the Bictorys `PaymentProvider` (charge/webhook) already exist and
  are fully battle-tested (idempotency, circuit breaker, Serializable webhook
  tx, outbox). Reusing `POST /api/orders` for the one-time "plan change"
  charge — rather than building a parallel charge-creation route — avoids
  duplicating CF-02/D-PAY-01..04 entirely. The frontend calls it directly
  with a `metadata.kind` tag the webhook recognizes.
- No subscription/billing model exists in the schema at all before this
  pass.
- `frontend/src/app/api/webhooks/bictorys/route.ts` is explicitly listed as
  project surface ("fair to modify") in CLAUDE.md — the underlying
  `webhook/handler.ts` factory (Serializable tx + idempotency) stays
  untouched; only this route's `onPaid` handler gains a branch that reads
  `order.metadata.kind` and activates the plan.
- `POST /api/orders`'s `successUrl`/`failureUrl` point at
  `${publicUrl}/orders/${order.id}/success` / `/failed` — those pages don't
  exist anywhere in the app yet (a pre-existing gap from the earlier
  payments phase, not specific to subscriptions). Without them the checkout
  flow dead-ends at a 404 after a real Bictorys redirect, which would make
  "changement de plan réel" not actually work end-to-end — so this pass adds
  minimal confirmation pages at those two paths (generic receipt copy +
  link back to `/settings`, modeled on `examples/frontend-pages/payment-success.tsx`).

## Prisma changes
New model `Subscription` (migration `11_add_subscriptions`):
`userId` (`@unique`, → `User`, cascade delete), `planKey` (default `FREE`),
`status` (default `ACTIVE`, values `ACTIVE|CANCELED`), `currentPeriodEnd`
(nullable `DateTime`), `canceledAt` (nullable `DateTime`). Absence of a row
for a user means "on the Free plan" — a row is only created on first
upgrade (find-or-create, same convention as `Organization`).

## Plan catalog
New shared (client + server safe, no secrets) constant
`frontend/src/lib/subscription-plans.ts` — single source of truth for
`planKey`, label, price (FCFA, integer), and feature list, imported by both
the API routes (validate `planKey`, resolve price for the Order amount) and
the settings component (render the 3 plan cards) so price never drifts
between what's charged and what's displayed.

## Component breakdown
- **NEW** `frontend/src/app/api/subscriptions/me/route.ts` — `GET` returns
  the caller's subscription (defaults to `{ planKey: 'FREE', status:
  'ACTIVE', currentPeriodEnd: null, canceledAt: null }` when no row exists).
- **NEW** `frontend/src/app/api/subscriptions/change-plan/route.ts` —
  `POST { planKey }`. Only handles moves to a **free** target plan
  (immediate, no charge) — moving to a paid plan returns 400
  `UPGRADE_REQUIRES_PAYMENT` telling the client to `POST /api/orders`
  instead (keeps this route from becoming a second, competing charge path).
- **NEW** `frontend/src/app/api/subscriptions/cancel/route.ts` — `POST`,
  no body. Refuses if there's no active paid subscription (400
  `NO_ACTIVE_SUBSCRIPTION`). Sets `status: CANCELED`, `canceledAt: now`.
- Update `frontend/src/app/api/webhooks/bictorys/route.ts`'s `onPaid` — after
  marking the `Order` `PAID`, if `order.metadata.kind ===
  'subscription_plan_change'`, upsert `Subscription` for `order.userId` to
  the target `planKey`, `status: ACTIVE`, `currentPeriodEnd: +30d`,
  `canceledAt: null`.
- **NEW** `frontend/src/app/orders/[id]/success/page.tsx` and
  `frontend/src/app/orders/[id]/failed/page.tsx` — minimal confirmation
  pages (no DB read — the webhook already updated state server-side by the
  time the user is redirected back).
- **NEW** `frontend/src/components/settings/SubscriptionCard.tsx` — plan
  banner (current plan, price, "Changer de plan" scroll-to-grid) + 3-plan
  comparison grid (Gratuit/Pro Agent/Agence Premium) wired to
  change-plan/orders/cancel.
- **NEW** `frontend/src/components/settings/TokensCard.tsx`,
  `PaymentMethodsCard.tsx`, `PaymentHistoryCard.tsx` — illustrative-only,
  Banani's exact numbers reproduced, each with a "Bientôt disponible" note
  (same convention as prior placeholder cards this session).
- Update `SettingsSideNav.tsx`: "Abonnement & paiement" moves from
  `AGENCY_INERT_ITEMS` to a real tab.
- Update `settings/page.tsx`: extend `SettingsTabKey` with `'abonnement'`.

## Responsive plan
Mobile-first as with every other settings card: plan banner stacks price
below title on narrow screens, 3-plan grid becomes `grid-cols-1
md:grid-cols-3`, payment-history table scrolls horizontally inside its own
`overflow-x-auto` wrapper below `lg:`.

## Interactions / state
- "Passer à Pro"/"Passer à Premium" → `POST /api/orders` (client-generated
  `Idempotency-Key`, `metadata.kind`/`planKey`) → redirect
  `window.location.href = paymentUrl` (real Bictorys hosted checkout).
- "Rétrograder" (on the Free card, when a paid plan is active) →
  `POST /api/subscriptions/change-plan { planKey: 'FREE' }` — immediate,
  confirmed via a lightweight browser `confirm()`-free inline toast (no
  charge to reverse).
- "Résilier mon abonnement" → confirmation modal (reuses the pattern from
  `PasswordConfirmModal` minus the password field — a plain yes/no confirm)
  → `POST /api/subscriptions/cancel`.
- Loading/error via `useToast`, same as every other settings card this
  session.

## Implementation checklist
- [ ] Prisma migration `11_add_subscriptions`
- [ ] `frontend/src/lib/subscription-plans.ts` catalog
- [ ] `GET /api/subscriptions/me`, `POST /api/subscriptions/change-plan`,
      `POST /api/subscriptions/cancel` + tests
- [ ] `onPaid` webhook branch for `subscription_plan_change` + tests
- [ ] `/orders/[id]/{success,failed}` pages
- [ ] `SubscriptionCard`, `TokensCard`, `PaymentMethodsCard`,
      `PaymentHistoryCard` components
- [ ] Wire `'abonnement'` tab into `SettingsSideNav` + `settings/page.tsx`
- [ ] `pnpm format && lint && typecheck && test`
- [ ] Update `.planning/banani/STATUS.md`

## Open questions for user
None outstanding — scope (real plan + real one-time charge via existing
Order/Bictorys pipeline, no renewal cron, wallet/payment-methods/history
illustrative) was confirmed before writing this plan.
