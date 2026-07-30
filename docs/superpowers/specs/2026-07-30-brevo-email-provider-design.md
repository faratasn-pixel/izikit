# Brevo email provider — design

## Goal

Replace Resend with Brevo as the transactional email provider, without changing
any call site outside `frontend/src/lib/server/email.ts`.

## Why

Project decision: standardize on Brevo for outbound transactional email
(verification codes, password reset, notifications) instead of Resend.

## Architecture

The `Mailer` interface (`send(input): Promise<{ id: string }>`) in
`frontend/src/lib/server/email.ts` stays unchanged — it was already designed
provider-agnostic. Only `createMailer()`'s implementation changes.

- `createMailer()` calls Brevo's REST API directly via `fetch`
  (`POST https://api.brevo.com/v3/smtp/email`), no new npm dependency. This
  matches the existing codebase convention of raw `fetch` for simple REST
  integrations (see `payments/bictorys.ts`).
- Auth: `api-key` header (Brevo's own scheme, not Bearer).
- `EMAIL_FROM` (existing format: `"Name <email>"` or bare `"email"`) is parsed
  into Brevo's required `sender: { name?, email }` object.
- `List-Unsubscribe` support is preserved: the existing header-building logic
  is unchanged, headers are passed through Brevo's `headers` payload field.
- Success (201) → Brevo returns `{ messageId }`, mapped to our `{ id }`.
- Failure (non-2xx) → Brevo's error body `{ message, code }` is thrown as
  `Error('Brevo error: <message>')`.
- `CreateMailerOptions` gains an injectable `fetchImpl?: typeof fetch` for
  tests (replaces the old `client?: Pick<Resend, 'emails'>`).

## Env vars

- `RESEND_API_KEY` → `BREVO_API_KEY` (rename, same "required at first send,
  not at boot" pattern as before).
- `EMAIL_FROM` unchanged.
- Updated in: `.env.example`, `frontend/.env.local`,
  `frontend/src/lib/server/queues/email-queue-singleton.ts`, and comments in
  `app/api/cron/email-queue-drain/route.ts` /
  `app/api/cron/outbox-drain/route.ts`.

## Testing

New `frontend/src/lib/server/email.test.ts` covering:
- successful send maps `messageId` → `id`, sends correct payload shape
- `EMAIL_FROM` parsing ("Name <email>" and bare email)
- non-2xx response throws with Brevo's error message
- missing `messageId` in a 2xx response throws
- `listUnsubscribe` populates the `headers` field correctly

## Out of scope

- Facebook OAuth (deferred by user, separate task)
- Keeping Resend as a fallback/alternate provider (user chose full replacement)
- `resend` npm package removal from `package.json` (cleanup, done alongside)
