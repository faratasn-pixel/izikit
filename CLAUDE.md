# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠️ **Do NOT run `/init` on this project.** This CLAUDE.md is shipped with the starter and contains battle-tested invariants (runtime=nodejs enforcement, protected file list, OAuth refusal of `email_verified=false`, advisory-lock withdrawals, outbox pattern, raw-body HMAC ordering, …). Running `/init` would regenerate this file from the codebase and erase those invariants. Claude Code already loads this file automatically at session start — no command needed.

## What this project is

**A v1-shipped, headless Next.js 16 monolith starter.** Single full-stack app (App Router API Route Handlers + Server Actions + Prisma 5 + PostgreSQL + Upstash + Cloudinary + Brevo + Bictorys + Sentry). There is no separate Express backend anymore — server logic lives under `frontend/src/app/api/*` and `frontend/src/lib/server/*`. The app **ships only logic** — no UI components — so each fork designs its own UX.

Origin: bootstrapped from `amadou-template` (the legacy monorepo predecessor) on 2026-05-07; the port to a single Next.js 16 app shipped through 7 phases (auth → OAuth/notifs → admin → uploads/withdrawals → webhooks/cron → docs/tests → final pass). 555/555 unit tests green (the storage swap dropped the now-obsolete `/api/files/[...key]` proxy tests).

**For an AI agent picking up this repo:** the architecture sections below describe what's already been built. Anything not listed under "Files Claude must NOT modify" is fair game to extend, refactor, or replace per your fork's needs — that's the point of a starter. The protected list is the small set of files where the invariants are subtle (refresh-token races, HMAC integrity, advisory locks…); everything else is the fork's surface area.

**Beginner workflow (vibe coding)** — clone, plug a PostgreSQL `DATABASE_URL` (PlanetHoster N0C by default), open Claude Code, describe what you want, ship. See [WORKFLOW.md](WORKFLOW.md). The starter ships:
- [.mcp.json](.mcp.json) — empty MCP server map by default. Banani is optional; if the user wants it, the `setup-kit` skill walks through pasting their MCP connection block.
- [.planning/features.json](.planning/features.json) — machine-readable manifest of the optional surfaces (payments, oauth-google, uploads-cloudinary, email-resend, admin-backoffice, multi-tenancy, …) — declares what each surface needs so manual pruning per [PRUNING.md](PRUNING.md) stays safe.
- GSD (`get-shit-done-cc`) is **not** a prerequisite. It's an optional level-up workflow surfaced after a beginner's first feature, not by default.

Read [README.md](README.md) for the public-facing contract (endpoints, env vars, design swap, deploy) and [STATUS.md](STATUS.md) for the historical port roadmap. Reference pages live in [examples/frontend-pages/](examples/frontend-pages/) — copy/restyle freely, they all consume the same `/api/*` JSON contract.

## Commands

pnpm workspace — run from repo root unless noted. The root `package.json` is a thin orchestrator: every script delegates to `pnpm --filter frontend run X` (the workspace currently has a single package, but the root layer is preserved as an architectural seam).

| Task | Command |
|---|---|
| Dev (Next.js on :3000, Turbopack) | `pnpm dev` |
| Build | `pnpm build` |
| Apply Prisma schema (dev iteration) | `pnpm db:push` |
| Versioned migrations | `pnpm db:migrate:dev` (local) / `pnpm db:migrate:deploy` (CI/prod) |
| Migration status | `pnpm db:migrate:status` |
| Open Prisma Studio (:5555) | `pnpm db:studio` |
| Bootstrap first SUPERADMIN | `pnpm db:make-superadmin <email>` |
| Unit tests (Vitest) | `pnpm test` |
| Single test file | `pnpm --filter frontend exec vitest run src/lib/server/<file>.test.ts` |
| Single test by name | `pnpm --filter frontend exec vitest run -t "<test name>"` |
| Watch one test | `pnpm --filter frontend exec vitest src/lib/server/<file>.test.ts` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Format | `pnpm format` (or `pnpm format:check`) |

Integration tests are deferred (no formal harness in v1) — `pnpm smoke:auth` provides a manual UAT script for the auth happy path against a running `pnpm dev`. See README.

**Before committing:** `pnpm format && pnpm lint && pnpm typecheck && pnpm test` — must all pass.

## High-level architecture

**Single Next.js 16 App Router app** at `frontend/`. The root `package.json` keeps the pnpm-workspace shell so a future package (e.g. shared types) can be added without re-plumbing scripts. There is no `backend/` package — all server code is colocated under `frontend/src/`.

**Boot flow** — Next.js owns the server lifecycle, so there is no hand-rolled middleware chain. Three things matter:
1. **`frontend/instrumentation.ts`** is Next's `register()` hook — Sentry inits here (server + edge via `sentry.{server,edge}.config.ts`; client via `sentry.client.config.ts`). No DSN env → silent no-op.
2. **Every Route Handler MUST `export const runtime = 'nodejs'`** (Prisma + bcrypt + raw-body needs). [frontend/src/lib/server/observability/runtime-enforcement.test.ts](frontend/src/lib/server/observability/runtime-enforcement.test.ts) walks `app/api/**/route.ts` and fails CI if any route forgets it.
3. **Per-request observability** flows through [frontend/src/lib/server/observability/request-context.ts](frontend/src/lib/server/observability/request-context.ts) (`makeRequestContext` + `withRequestContext` + scoped `log`). Handlers wrap their body in `withRequestContext()` so logs auto-attach `requestId` / `userId` / `route`.

**Optional providers boot conditionally.** If `CLOUDINARY_*` / `RESEND_*` / `BICTORYS_*` / `GOOGLE_*` envs are absent, the corresponding routes either 404 silently or return 503 (e.g., `/api/upload` → 503 STORAGE_NOT_CONFIGURED when Cloudinary creds are missing). `frontend/src/lib/server/redis.ts` exposes `redis: Redis | null` (returns `null` rather than throwing when env is missing — call sites decide fallback). The app still boots and `/api/auth` still works. `log.warn` announces which providers are inert.

**Auth model** ([frontend/src/lib/server/auth.ts](frontend/src/lib/server/auth.ts)): access JWT (15min, all paths) + refresh JWT (7d, scoped to `/api/auth` for blast-radius reduction) + CSRF token (7d, double-submit cookie). All cookies are namespaced by `COOKIE_PREFIX` (default `app`) and set via `cookies()` from `next/headers` (async). All mutating endpoints require the `x-csrf-token` header echoed from the `<prefix>-csrf` cookie — `verifyCsrf(req)` returns a `NextResponse | null` you bail on at the top of each handler. **Signup is enumeration-resistant**: identical 201 response regardless of email existence, no cookies issued at signup — cookies are issued by `POST /verify-email` after the user enters their 8-char Crockford code. Per-email rate limits (login 10/15m, signup 5/h, etc.) sit on top of the global IP limiter via [frontend/src/lib/server/middleware/rate-limit-by-email.ts](frontend/src/lib/server/middleware/rate-limit-by-email.ts).

**Middleware HOFs** ([frontend/src/lib/server/middleware/index.ts](frontend/src/lib/server/middleware/index.ts)) — `requireAuth` / `requireAdmin` / `requireSuperadmin` / `requireOrgRole` / `optionalAuth` each return `Context | NextResponse`. Pattern in handlers: `if (auth instanceof NextResponse) return auth;`.

**Frontend `api()` wrapper** ([frontend/src/lib/api.ts](frontend/src/lib/api.ts)): auto-refreshes on 401 with a single-flight lock, attaches CSRF, and **only retries `GET`/`HEAD` on network errors** — never mutating verbs (would risk duplicate charges/withdrawals). `ApiError.code` exposes the server's stable error code (e.g. `PIN_REQUIRED`, `INSUFFICIENT_BALANCE`) — switch on `.code`, not on `.message`.

**Webhook idempotency + outbox:** [frontend/src/lib/server/webhook/handler.ts](frontend/src/lib/server/webhook/handler.ts) returns `(NextRequest) => Promise<NextResponse>` and reads the raw body via `await req.arrayBuffer()` (preserves byte-identical HMAC). The handler runs a `Serializable` Prisma transaction with `WebhookLog @@unique([externalId, eventType])` for dedup. Side-effects (emails, notifications) must NOT run as a postCommit closure — they go to the **outbox** ([frontend/src/lib/server/outbox/](frontend/src/lib/server/outbox/)) inside the same tx, drained by a cron route ([frontend/src/app/api/cron/outbox-drain/route.ts](frontend/src/app/api/cron/outbox-drain/route.ts), scheduled from the N0C panel every 5 min).

**Withdrawals are race-free:** the route runs guards + PENDING insert inside a `Serializable` Prisma transaction guarded by `pg_advisory_xact_lock(hashtext(userId))` ([frontend/src/lib/server/withdrawals/lock.ts](frontend/src/lib/server/withdrawals/lock.ts)). Two concurrent attempts for the same user serialize on the lock, so the second one sees the first's PENDING reservation and is correctly rejected as `INSUFFICIENT_BALANCE`.

**Payments are pluggable** behind the `PaymentProvider` interface ([frontend/src/lib/server/payments/](frontend/src/lib/server/payments/)). Bictorys is the default. A single in-memory `CircuitBreaker` guards charge calls. Webhook replay window defaults to 60s (`BICTORYS_WEBHOOK_REPLAY_WINDOW_MS` to override).

**Cron strategy.** No `setInterval` loops — the Node.js host (Passenger on N0C) recycles processes and won't keep long-lived timers. Background work runs as cron routes under `app/api/cron/<name>/route.ts`, each gated by `Authorization: Bearer ${CRON_SECRET}`. On PlanetHoster N0C these are scheduled from the panel's Cron section (see `docs/deploy/n0c-crons.md`); the frequent drains (`outbox-drain`, `email-queue-drain`, `order-expiration`) run every 5 minutes (N0C discourages every-minute jobs). Targets: `outbox-drain` (5m), `email-queue-drain` (5m), `verification-cleanup` (hourly), `order-expiration` (5m), `webhook-log-purge` (daily), `email-job-purge` (daily — purges SENT EmailJob rows older than `EMAIL_JOB_RETENTION_DAYS`, default 30). Multi-instance coordination still uses [frontend/src/lib/server/leader-lease.ts](frontend/src/lib/server/leader-lease.ts) Redis leases where two crons could collide. The Bictorys charge `CircuitBreaker` is still in-memory single-instance — replace with a Redis-backed variant for multi-pod prod (documented limitation).

**Google OAuth (Sign in with Google)** — [frontend/src/lib/server/oauth/google.ts](frontend/src/lib/server/oauth/google.ts) + Phase 2 route handlers under `frontend/src/app/api/auth/oauth/google/{start,callback}/route.ts`. Implemented with `arctic` (OAuth 2.0 + PKCE). `start` issues state + PKCE-verifier cookies (5min, path-scoped to `/api/auth/oauth`) and 302s to Google. `callback` validates state, exchanges code, decodes ID token, refuses unverified emails, find-or-create user with account linking by email, then issues our standard auth cookies. Frontend errors land on `/auth/error?code=…` (see [examples/frontend-pages/auth-error.tsx](examples/frontend-pages/auth-error.tsx)). Inert without `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`.

**Multi-tenancy is opt-in.** [frontend/src/lib/server/middleware/require-org-role.ts](frontend/src/lib/server/middleware/require-org-role.ts) ships role types + rank helpers (`OWNER` > `ADMIN` > `MEMBER`). Default project surface stays user-owned (`Order.userId`, `Withdrawal.userId`). Apps that need orgs add `organizationId String?` on their domain models case by case and gate routes via `requireOrgRole('ADMIN', 'orgId')` from the middleware HOFs. Owner promotion is transactional (3 ops in a single tx). Non-members get **404, not 403**, to avoid leaking org existence.

**Admin back-office** — [frontend/src/lib/server/admin/audit.ts](frontend/src/lib/server/admin/audit.ts) + [frontend/src/lib/server/middleware/require-admin.ts](frontend/src/lib/server/middleware/require-admin.ts). App-wide role on `User` (`USER` < `ADMIN` < `SUPERADMIN`). Phase-5 endpoints under `/api/admin/*` cover users (search/detail/role-change), orders (filter), withdrawals (filter + manual cancel), audit-log (paginated/filterable), and `/me` (admin probe). Every mutation calls `logAdminAction(prisma, {...})` → `AdminAction` row so we can answer "who did what when" during incidents. Bootstrap the first SUPERADMIN with `pnpm db:make-superadmin <email>` (the script lives at [frontend/scripts/make-superadmin.ts](frontend/scripts/make-superadmin.ts)).

## Files Claude must NOT modify (battle-tested)

- [frontend/src/lib/server/auth.ts](frontend/src/lib/server/auth.ts), [crypto.ts](frontend/src/lib/server/crypto.ts), [logger.ts](frontend/src/lib/server/logger.ts), [redis.ts](frontend/src/lib/server/redis.ts), [rate-limit-store.ts](frontend/src/lib/server/rate-limit-store.ts), [slug.ts](frontend/src/lib/server/slug.ts), [zod-helpers.ts](frontend/src/lib/server/zod-helpers.ts) — refresh-token races, log-redaction holes, retry storms on POSTs all live here
- [frontend/src/lib/server/webhook/handler.ts](frontend/src/lib/server/webhook/handler.ts) — Serializable transaction + idempotency + raw-body invariants
- [frontend/src/lib/server/payments/circuit-breaker.ts](frontend/src/lib/server/payments/circuit-breaker.ts) — single-instance semantics by design
- [frontend/src/lib/server/oauth/google.ts](frontend/src/lib/server/oauth/google.ts) — state/PKCE cookie scoping, account-linking, ID-token decode are all interdependent (Phase 2 route handlers in `frontend/src/app/api/auth/oauth/google/*` consume this and are also off-limits)
- [frontend/src/lib/server/outbox/dispatcher.ts](frontend/src/lib/server/outbox/dispatcher.ts) — atomic claim + backoff invariants
- [frontend/src/lib/server/admin/audit.ts](frontend/src/lib/server/admin/audit.ts) — every back-office mutation MUST go through this; bypass = unaudited action
- [frontend/src/lib/server/middleware/index.ts](frontend/src/lib/server/middleware/index.ts), [require-admin.ts](frontend/src/lib/server/middleware/require-admin.ts), [require-org-role.ts](frontend/src/lib/server/middleware/require-org-role.ts) — role precedence + Context shape consumed by every route
- [frontend/src/lib/server/observability/request-context.ts](frontend/src/lib/server/observability/request-context.ts) — `requestId` propagation; breaking it silently strips correlation IDs from logs
- [frontend/instrumentation.ts](frontend/instrumentation.ts) — Sentry register hook; must run before any other server code
- [frontend/src/lib/api.ts](frontend/src/lib/api.ts) — auto-refresh + CSRF + retry-only-GET; do not extend retry to mutating verbs

If a change is genuinely required in any of these, surface a brief "I am about to modify X because Y — confirm?" before editing.

## Files Claude SHOULD modify (project surface)

- [frontend/prisma/schema.prisma](frontend/prisma/schema.prisma) — add domain models alongside the generic ones (User, Order, Withdrawal, Organization, AdminAction, OAuthAccount, …). Do not rename the generic models.
- `frontend/src/app/api/<resource>/route.ts` — add new Route Handlers; always `export const runtime = 'nodejs'`, call `verifyCsrf(req)` for mutations, `requireAuth(req)` (or admin/org variants) at the top.
- [frontend/src/lib/server/notifications/templates.ts](frontend/src/lib/server/notifications/templates.ts) — add typed wrappers per notification type (must include a `dedupeKey` for at-most-once delivery)
- [frontend/src/lib/server/payments/](frontend/src/lib/server/payments/) — add new providers behind the `PaymentProvider` interface (use `bictorys.ts` as reference)
- [frontend/src/lib/server/withdrawals/guards.ts](frontend/src/lib/server/withdrawals/guards.ts) — add KYC / tier / AML guards (project-specific, not shipped)
- [frontend/src/lib/server/oauth/](frontend/src/lib/server/oauth/) — add new OAuth providers (`github.ts`, `apple.ts`, …) modeled on `google.ts`; add a sibling route handler under `frontend/src/app/api/auth/oauth/<provider>/{start,callback}/route.ts`
- [frontend/src/app/](frontend/src/app/) — your pages, your design (including `/admin/*` if you keep the back-office)
- `frontend/src/lib/server/cron/` — extend with `verifyCronSecret(req)` consumers; add new cron route handlers under `frontend/src/app/api/cron/<name>/route.ts` mirroring the 5 existing crons; ALL cron handlers must verify `Authorization: Bearer ${CRON_SECRET}` via the shared `verifyCronSecret` helper
- [frontend/src/lib/server/webhook/bictorys.ts](frontend/src/lib/server/webhook/bictorys.ts) — webhook provider re-export with the `kind: 'refunded'` upgrade; replace per project (Phase 5 default); the underlying `webhook/handler.ts` stays PROTECTED
- [frontend/src/lib/server/orders/expire.ts](frontend/src/lib/server/orders/expire.ts) — `expirePendingOrders({ prisma, batchSize? })`: extend per project to add post-expiration side-effects (e.g. notify the user, write a refund job to outbox); the cron route at `app/api/cron/order-expiration/route.ts` calls this

## Critical invariants

- **Every Route Handler MUST `export const runtime = 'nodejs'`.** The runtime-enforcement test in `frontend/src/lib/server/observability/` fails CI otherwise (Prisma + bcrypt break on edge).
- Webhook handlers read the raw body via `await req.arrayBuffer()` and hash it BEFORE any JSON parse — calling `await req.json()` first is a silent HMAC-verification regression.
- Notification dispatchers MUST go through `createNotification(prisma, input)` — never `prisma.notification.create` directly (skips the dedup `P2002` catch).
- Webhook handlers emit side-effects via the **outbox** (`enqueueOutbox(tx, event)` inside the tx) — never via fire-and-forget closures.
- Withdrawals must use the advisory-lock + Serializable tx pattern (the `withdrawals/lock.ts` helper does this — just call it). Calling guards + insert outside a tx is a double-spend regression.
- Payment amounts are **integer in smallest currency unit** (FCFA = no decimals; USD = cents). Never store decimals.
- `BICTORYS_API_KEY` (charges) and `BICTORYS_PRIVATE_KEY` (payouts) are distinct keys — must NEVER be confused.
- Withdrawal balance check is ON by default (`WITHDRAWAL_BALANCE_CHECK=0` to disable). Disabling on a real-money project is a financial-safety risk — only do it if you have an alternative ledger.
- Withdrawal guards return **stable error codes** (`AMOUNT_BELOW_MIN`, `AMOUNT_ABOVE_MAX`, `DAILY_LIMIT_EXCEEDED`, `COOLDOWN_ACTIVE`, `PIN_NOT_SET`, `PIN_REQUIRED`, `PIN_INVALID`, `INSUFFICIENT_BALANCE`). Frontend switches on `ApiError.code`, not translated messages.
- Frontend `api()` retries only `GET`/`HEAD` on network errors. Do not extend to `POST`/`PUT`/`PATCH`/`DELETE`.
- Signup never sets cookies and never reveals email existence. Cookies are issued by `/verify-email` after the user enters their code.
- Upload route enforces magic-byte validation against `UPLOAD_ALLOWED_MIME` via [frontend/src/lib/server/upload/sniff.ts](frontend/src/lib/server/upload/sniff.ts) — don't bypass by trusting `File.type` alone.
- Admin mutations MUST go through `logAdminAction(prisma, {...})` — every back-office write is auditable. Skipping it is a compliance regression.
- Admin role precedence: `USER` < `ADMIN` < `SUPERADMIN`. Only SUPERADMIN can change roles. The route refuses to demote the **last** SUPERADMIN to avoid locking the org out.
- Org role precedence: `MEMBER` < `ADMIN` < `OWNER`. `requireOrgRole(min, paramName)` returns **404** to non-members (not 403) so org existence isn't leaked.
- OAuth callback MUST refuse `email_verified !== true` from Google — otherwise an attacker with an unverified Google account matching a victim's email can take over the account via auto-linking.
- Cron handlers MUST verify `Authorization: Bearer ${CRON_SECRET}` to prevent unauthenticated invocation of background work.
- Cookies stay `httpOnly` + `Secure` (prod) + `SameSite=Lax`.
- Sentry init stays in [frontend/instrumentation.ts](frontend/instrumentation.ts) `register()` — do not move it into a route module (the hook fires before app code, route imports do not).

## Design system — fully swappable (no UI shipped)

The starter is **headless on purpose**. Touchpoints if a fork wants a specific design:

- [frontend/src/app/page.tsx](frontend/src/app/page.tsx) — `return null`. Write your homepage here. No layout assumption is baked into the API.
- [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) — Inter font + 2 client contexts (`AuthProvider`, `ToastProvider`). Both are logic-only — swap the font, restyle toasts in your own components, keep the providers (they wrap the `api()` wrapper's auto-refresh + the toast queue).
- [frontend/src/app/globals.css](frontend/src/app/globals.css) — one line: `@import 'tailwindcss';` (Tailwind v4 zero-config). Drop it + remove `@tailwindcss/postcss` from [frontend/postcss.config.mjs](frontend/postcss.config.mjs) to leave Tailwind out entirely.
- [frontend/src/app/error.tsx](frontend/src/app/error.tsx) — Tailwind-styled fallback. Replace freely.
- [examples/frontend-pages/](examples/frontend-pages/) — 11 reference pages (login/signup/verify-email/forgot-reset-password/dashboard/withdrawals/payment-success+failure/auth-error/admin/*). They are NOT imported anywhere — they live as Tailwind references to copy or rebuild.

**No server lib reaches into the DOM.** Routes only return `NextResponse.json(...)`. The same backend feeds plain React, shadcn/ui, Mantine, a SwiftUI client, a Flutter app — pick anything.

### Bundled Claude Code skills (under [.claude/skills/](.claude/skills/))

Two design-system skills auto-load in any Claude Code session run from the repo:

- [`banani-design-implementation`](.claude/skills/banani-design-implementation/SKILL.md) — pixel-perfect 1:1 reproduction from a Banani MCP screen. Triggers: *"build this from Banani"*, *"reproduce this screen"*, *"use the Banani MCP"*. Reads CLAUDE.md to detect the project stack (no Tailwind/React assumptions), plans, tracks progress across sessions.
- [`ui-ux-pro-max`](.claude/skills/ui-ux-pro-max/SKILL.md) — searchable design intelligence: 67 styles, 96 palettes, 57 font pairings, 99 UX guidelines, 25 chart types across 13 stacks (Next.js, React, Vue, SwiftUI, Flutter…). Triggers: *"design / improve / review UI"* + element/topic. Includes shadcn/ui MCP integration.

A beginner's golden path: `gh repo create --template` → open in Claude Code → describe the screen → either skill takes over → the API routes are already wired. The starter therefore covers the *boring* parts (auth, payments, admin, webhooks, cron) so the fork-author spends their time on product/design.

## What is fair to modify

Anything outside [Files Claude must NOT modify](#files-claude-must-not-modify) is the fork's surface area:

- **Domain models** ([frontend/prisma/schema.prisma](frontend/prisma/schema.prisma)) — add fields, add models, add migrations. Do not rename the generic models; everything else is yours.
- **Routes** ([frontend/src/app/api/](frontend/src/app/api/)) — add new resources. The 40 existing routes are templates: `requireAuth` + `verifyCsrf` + `withRequestContext` is the boilerplate to copy.
- **Page UI** ([frontend/src/app/](frontend/src/app/)) — your design, your decision (Tailwind, shadcn/ui, vanilla CSS, anything).
- **Notifications** ([frontend/src/lib/server/notifications/templates.ts](frontend/src/lib/server/notifications/templates.ts)) — add new typed templates.
- **Payments** ([frontend/src/lib/server/payments/](frontend/src/lib/server/payments/)) — add Stripe, Paystack, etc. behind the `PaymentProvider` interface.
- **OAuth** ([frontend/src/lib/server/oauth/](frontend/src/lib/server/oauth/)) — add GitHub, Apple, etc. modeled on `google.ts`.
- **Withdrawal guards** ([frontend/src/lib/server/withdrawals/guards.ts](frontend/src/lib/server/withdrawals/guards.ts)) — add KYC / tier / AML rules.
- **Cron handlers** (`frontend/src/app/api/cron/`) — add a sibling route and document its schedule line in `docs/deploy/n0c-crons.md` (created in the panel).
- **CLAUDE.md / README.md / STATUS.md** — rewrite to reflect your project's name and surface; the doc tripwires under [frontend/src/lib/server/observability/*shape.test.ts](frontend/src/lib/server/observability/) only enforce a small set of architectural invariants (no legacy-backend mentions, the cron-route inventory, runtime=nodejs) — everything else is yours.

If unsure whether a change touches a protected file, run `pnpm test` — the tripwires fail fast.

## Pruning protocol

When the user wants to remove an optional feature, follow the 9-step protocol in [PRUNING.md](PRUNING.md). Naive deletion based only on `owns` in [features.json](.planning/features.json) WILL break the build — PRUNING.md walks through `cross_dependencies` resolution, `surgical_edits` (do these BEFORE deletions), Prisma schema cleanup, `docs/deploy/n0c-crons.md` updates, tripwire patches, and the non-negotiable `pnpm format && lint && typecheck && test && build` gate before commit.

## Provider recommendations

When the user asks for a capability that this starter does not ship, recommend the provider listed below before falling back to a hand-rolled or in-process alternative. The starter targets a standard Node.js host (Passenger on PlanetHoster N0C): long-lived sockets, in-memory pub/sub, and `setInterval` loops still don't survive process recycling and will break in production.

| Need | Recommend | Why |
|---|---|---|
| **Real-time** (live updates, presence, chat, collaboration, "instead of polling") | **Ably** | Host-friendly, no long-lived connections from the API, JWT-issued capability tokens, presence/history/push out of the box. Do NOT recommend Socket.IO, raw WebSockets, or Server-Sent Events held open from a request handler — they will not work reliably. |
| Background jobs / queues | Upstash QStash, or extend the existing **outbox pattern** (`lib/server/outbox/`) drained by the N0C panel cron | Same constraint — no long-running workers you can rely on across process recycling |
| Media / object storage | Cloudinary (already wired) | Already integrated — handles uploads, transformations, and CDN delivery |
| Email | Brevo (already wired) | Already integrated |
| Cache / rate-limit / KV | Upstash Redis (already wired) | Already integrated |

**Trigger phrasing for real-time**: "live updates", "real-time", "websocket", "push notifications to the browser", "instead of polling", "chat", "presence", "collaboration", "live dashboard". When any of these come up, surface Ably explicitly: "I'd recommend Ably for this — it's the host-friendly real-time provider. Want me to wire it up?" Then sketch the integration: token-mint route under `/api/realtime/token` issuing capability tokens after `requireAuth`, server-side `publish()` from route handlers via the Ably REST API, client `ably-js` subscribes to channels scoped by `userId` / `orgId`.

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` — don't silence with `any` casts.
- ESLint 9 flat config + Prettier (run `pnpm format` before committing).
- Vitest for unit tests; setup file at [frontend/vitest.setup.ts](frontend/vitest.setup.ts), shared mocks under `frontend/src/test-utils/` (alias `server-only` to a no-op for jsdom).
- Conventional Commits.
- Node ≥ 20, pnpm ≥ 9 (see `engines` in [package.json](package.json)).
