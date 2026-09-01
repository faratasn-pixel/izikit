# Contacts page — wire to real data

## Context

`frontend/src/app/contacts/page.tsx` ("Contacts reçus") is a fully static
mock built from a Banani screen: `MOCK_CONTACTS` includes fields with no
backing model (`statut` workflow, `motif`, `budget`, an invented activity
feed, avatar URLs). The real backing data is `ListingInquiry` — created by
the public listing-detail contact form (`POST
/api/public/listings/[id]/inquiries`) — which only captures `name`, `phone`,
`email?`, `message`, `type` (MESSAGE | VR_VISIT), `listingId`, `createdAt`.
No endpoint currently lets an agent list their own received inquiries.

`ContactMessage` (the "Nous contacter" general form: GENERAL/SUPPORT/
PARTNERSHIP/AGENT/PRESS/OTHER) is a different, listing-less domain and is
out of scope here — already has its own admin queue
(`/api/admin/contact-messages`).

## Goal

Wire the Contacts page to real `ListingInquiry` data scoped to the logged-in
agent's own listings, adding the minimum schema needed to preserve the
page's status-workflow and notes features, and dropping features with no
real data source (activity feed) rather than inventing data.

## Schema changes

`frontend/prisma/schema.prisma` — add to `ListingInquiry`:

```prisma
status String  @default("EN_ATTENTE") // EN_ATTENTE | REPONDU | VISITE_PLANIFIEE | NON_QUALIFIE
notes  String?
```

`motif` (Achat/Location), `budget`, and `location` are derived at read time
from the related `Listing` (`transactionType`, `price`+`currency`,
`city`+`country`) — not duplicated onto `ListingInquiry`.

Versioned migration via `pnpm db:migrate:dev`.

## API changes

### `GET /api/listings/inquiries` (new — `frontend/src/app/api/listings/inquiries/route.ts`)

- `runtime = 'nodejs'`, `requireAuth()`, scoped via `listing: { userId: auth.user.sub }`.
- Returns `{ items, stats }` in one response (mirrors `GET /api/requests`
  consumed by `frontend/src/app/demandes/page.tsx` — fetch-all-then-filter-
  client-side, no server pagination UI wired yet).
- `items[]`: `id, name, phone, email, message, type, status, notes,
  createdAt`, plus joined listing fields `listingId, listingTitle, city,
  country, transactionType, price, currency`.
- `stats`: `total`, `nouveaux7j` (createdAt >= now-7d), `enAttente` (status
  EN_ATTENTE count), `tauxConversion` (VISITE_PLANIFIEE / total, 0 when
  total is 0). No "vs last period" trend lines — no historical snapshot to
  diff against.
- Reasonable `take` cap (e.g. 200) since there is no pagination UI yet;
  revisit if an agent's inquiry volume grows past that.

### `PATCH /api/listings/inquiries/[id]` (new — `frontend/src/app/api/listings/inquiries/[id]/route.ts`)

- `runtime = 'nodejs'`, `verifyCsrf(req)`, `requireAuth()`.
- Body: `{ status?: 'EN_ATTENTE'|'REPONDU'|'VISITE_PLANIFIEE'|'NON_QUALIFIE', notes?: string }` (zod, at least one field required).
- Loads the inquiry with its listing's `userId`; 404 (not 403) if missing or
  not owned by the caller, consistent with existing not-found-vs-leak
  conventions in this codebase.
- Plain `prisma.listingInquiry.update` — no transaction needed (single-row,
  no cross-entity invariant to protect, unlike withdrawals).
- No `logAdminAction` — this is an agent acting on their own data, not an
  admin backoffice mutation.

## Frontend changes

`frontend/src/app/contacts/page.tsx`:

- Replace `MOCK_CONTACTS` with an `api()` fetch on mount
  (`api<{ items: Inquiry[]; stats: Stats }>('/api/listings/inquiries')`),
  following the loading/error/toast pattern in
  `frontend/src/app/demandes/page.tsx` (`useToast`, `ApiError`).
- Client-side search filter stays, applied to the fetched `items`.
- Stat cards read from `stats`; drop the trend sub-lines that have no real
  comparison basis (keep the icon/value/label row).
- Selecting a row's status badge / a future status control issues an
  optimistic `PATCH`, reverting with a toast on failure.
- Notes textarea's "Enregistrer" button becomes active, `PATCH`es `notes`
  for the selected inquiry.
- "Activité récente" block removed entirely (no real event source).
- "Envoyer un message" / "Planifier une visite" buttons stay disabled
  (`title="Bientôt disponible"`) — unchanged from current behavior.
- Advanced filters (Statut/Cette semaine/Annonce), export, sort, and
  pagination controls stay disabled — unchanged, out of scope.
- New helper `frontend/src/lib/contacts.ts`: `Inquiry`/`Stats` types,
  status label/badge-class maps, `formatBudget`/`formatDate`, mirroring
  `frontend/src/lib/requests.ts`.

## Testing

- `route.test.ts` for both new endpoints, mirroring
  `frontend/src/app/api/admin/contact-messages/route.test.ts` /
  `[id]/route.test.ts` style:
  - GET: scoping (only own listings' inquiries returned), stats
    correctness, auth requirement.
  - PATCH: scoping/404 for other agents' inquiries, validation (rejects
    empty body, invalid status enum), auth + CSRF requirement.
- No new frontend component tests exist for sibling pages
  (annonces/demandes) — follow that precedent, no new frontend tests added
  for `contacts/page.tsx` itself.

## Out of scope

- `ContactMessage` general contact-us queue — untouched.
- Making "Envoyer un message" / "Planifier une visite" functional.
- Server-side pagination, export, advanced filters, sort — page keeps its
  existing disabled placeholders for these.
- Activity/event tracking on the public listing pages (favorites, page
  views, VR visits) — would be a separate, larger feature.
