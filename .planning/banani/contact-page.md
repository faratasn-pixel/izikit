# Contact Page — Banani → Next.js

## Source
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`)
- Screen: "Contact Page" (`5XF5Cxqenlfc`)
- Fetched: 2026-08-18

## Scope decision (confirmed with user)
- Contact form is **real** (backend-wired), not decorative — new `ContactMessage`
  model + `POST /api/public/contact` + admin moderation queue, mirroring the
  `ListingReport`/`listing-reports` pattern built earlier this session.
- File-attachment section is **dropped** (not in scope) — text-only form.
- Notification target: no natural "owner" user (unlike a listing inquiry) —
  persisted to `ContactMessage` for admin review via API, plus a best-effort
  email to a new optional `CONTACT_INBOX_EMAIL` env var (skipped silently if
  unset, same graceful-degradation pattern as every other optional provider
  in this starter).

## Structure map
- Navbar: **REUSE** `PublicNavbar` (`active="contact"`) — requires adding a
  real `{ key: 'contact', label: 'Contact', href: '/contact' }` entry,
  **replacing** the existing inert `{ key: 'comment', label: 'Comment ça
  marche', href: null }` entry per the user's explicit request.
- Hero: gradient band (sky-blue → dark), eyebrow pill + title + subtitle —
  literal copy from the fetch.
- Info bar: 4-column strip (Email général / Téléphone / Siège social /
  Horaires) — literal values from the fetch.
- Main (2-col grid, `1fr 400px` on desktop):
  - **Form card**: subject chips (6, single-select), prénom/nom row, email/
    téléphone row, pays select, message textarea, submit button, privacy
    note. Attachment row **dropped** per scope decision.
  - **Sidebar**: "Bureaux par pays" (4 country cards, literal), "Réseaux
    sociaux" (5 inert social icons), "Questions fréquentes" (4 inert FAQ
    rows), promo card ("Devenir agent" — inert, no such flow exists).
- Footer: **REUSE** `PublicFooter` — upgrade its `HELP_LINKS` "Contact" entry
  from decorative to a real `/contact` link (small, in the spirit of the
  request), leave the other 3 inert.

## Component breakdown
- **NEW** `frontend/src/app/contact/page.tsx` — the page itself.
- **REUSE** `PublicNavbar`, `PublicFooter`.
- No new shared primitives needed — form fields are simple enough to inline
  (single-page form, not reused elsewhere).

## Token mapping (Banani → project)
| Banani | Project |
|---|---|
| `--primary: #0EA5E9` (screen's own accent) | project's `brand` color (existing pages use `text-brand`/`bg-brand` consistently — screen's blue is close enough to already-established `brand`, use `brand` not a one-off blue) |
| `border-radius: 16px` (cards) | `rounded-2xl` |
| `border-radius: 999px` (pills/buttons) | `rounded-full` |
| `font: 800 44px` (hero title) | `font-extrabold text-[32px] lg:text-[44px]` (mobile-first scale-down, Banani only gave desktop) |
| gradient hero | `bg-gradient-to-br from-brand via-sky-600 to-slate-900` (approximation of the 3-stop gradient) |

## Responsive plan (Banani gave desktop only)
- **Base (375px)**: hero padding reduced, title `text-[28px]`; info bar
  stacks to 1 column (`grid-cols-1`); main layout stacks to 1 column (form
  above sidebar); subject chips wrap; form rows (prénom/nom, email/
  téléphone) stack to 1 column.
- **sm (640px)**: info bar → 2 columns.
- **lg (1024px)**: info bar → 4 columns; main layout → `grid-cols-[1fr_400px]`;
  form rows → 2 columns; hero title full 44px size.

## Interactions / state
- Subject chips: real single-select state (`useState<string>`).
- Form fields: fully controlled (firstName, lastName, email, phone, country,
  message).
- Submit: `POST /api/public/contact`, disables button while sending, shows a
  success state replacing the form, surfaces a 429 rate-limit message.
- Country select: plain HTML `<select>` (reuses `COUNTRY_FLAG` keys from
  `@/lib/alerts` for consistency with the rest of the app), not a custom
  dropdown — the Banani mock's fancy `.form-select` div is simplified to a
  native `<select>` for accessibility/keyboard support (small, disclosed
  deviation).
- Everything else (social icons, FAQ rows, "Devenir agent" promo,
  "politique de confidentialité" link) stays inert — no target
  page/feature exists.

## Backend
- `ContactMessage` model: `id, firstName, lastName, email, phone?, country?,
  subject (enum string), message, status (@default NEW: NEW|READ|ARCHIVED),
  createdAt`.
- `POST /api/public/contact`: unauthenticated, no CSRF (same carve-out as
  the listing inquiry/report routes), per-IP rate limit (`createEmailLimiter`,
  5/hour), creates the row, best-effort email to `CONTACT_INBOX_EMAIL` if set.
- `GET`/`PATCH /api/admin/contact-messages(/[id])`: mirrors
  `listing-reports` exactly — `requireAdmin('ADMIN')`, cursor pagination,
  `PATCH` sets `status` (`READ`/`ARCHIVED`), `logAdminAction`. API only, no
  admin UI (same precedent as `listing-reports`).

## Implementation checklist
- [ ] `ContactMessage` model + hand-written migration
- [ ] `POST /api/public/contact` + tests
- [ ] `GET`/`PATCH /api/admin/contact-messages(/[id])` + tests
- [ ] `frontend/src/app/contact/page.tsx` (mobile-first)
- [ ] `PublicNavbar.tsx`: swap `comment` → `contact` entry
- [ ] `PublicFooter.tsx`: `HELP_LINKS` "Contact" → real link
- [ ] `.env.example`: document `CONTACT_INBOX_EMAIL`
- [ ] `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
- [ ] Dev server smoke test (375/768/1280px)
- [ ] Update `.planning/banani/STATUS.md`

## Open questions for user
None outstanding — scope confirmed via the two questions already answered
(form is real, attachment dropped).
