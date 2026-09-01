# Public Listing Detail Page — Design

**Date:** 2026-08-18
**Status:** Approved
**Scope:** `frontend/src/app/annonces/[id]/page.tsx` and its supporting public API surface.

## Context

`/annonces` (the public browse/list page) was wired to real data in a prior
session (`docs/superpowers/specs/2026-08-18-public-listings-design.md`).
Its detail page, `/annonces/[id]`, is still 100% mocked: hardcoded photos,
an invented agent ("Kofi Atta"), invented features/amenities, fake view/
favorite counts, a decorative message form, a decorative "VR visit"
button, a decorative report button, and a static fake map image.

This spec wires the detail page to real data and adds the minimum new
backend needed to make its interactive elements (contact form, VR-visit
request, report) actually do something — without building the much larger
`/messages` rich-inbox feature, which already exists as a separate, fully
mocked page (`frontend/src/app/messages/page.tsx`, explicit code comment:
"no Conversation/Message model exists yet") and is out of scope here by
explicit user decision. `/messages` is untouched by this spec.

## Explicit scope decisions (from brainstorming)

- **Contact form**: builds a real, minimal lead-capture flow (anonymous
  visitor → `ListingInquiry` row → notification + email to the listing
  owner). Not a two-way conversation/chat system.
- **Sender**: anonymous visitor (name/phone/email/message in the form),
  no login required.
- **Agent notified via**: in-app notification (`createNotification`) +
  transactional email (`EmailQueue`). No dedicated inbox UI is built this
  session — the agent sees it via the existing notification bell only.
- **"Appeler l'agent"**: reveals the agent's real phone number publicly
  (`tel:` link).
- **Views**: real `Listing.viewCount` counter, incremented server-side on
  each detail-page load. No "favoris" counter (no model exists; out of
  scope).
- **"Sauvegarder"**: stays decorative (`InertRow`) — favorites are a
  separate future feature.
- **"Partager"**: becomes real — client-side copy-current-URL-to-clipboard,
  no backend involved.
- **"Demander une visite VR"**: becomes real, but only as a lead request
  (same `ListingInquiry` model, `type: 'VR_VISIT'`) routed to the agent —
  no actual video/VR infrastructure is built (none is wired in this
  starter and none is planned this session).
- **"Signaler cette annonce"**: becomes real — creates a `ListingReport`
  row via a public endpoint. Consumed by a new admin-only API
  (`GET`/`PATCH /api/admin/listing-reports`) for moderation. **No admin
  frontend page is built this session** — no `/admin` UI exists anywhere
  in this app yet (confirmed: only `/api/admin/*` routes exist), and
  building the first one is out of scope here. The queue is consumable via
  Prisma Studio or a future dedicated admin-UI session.
- **Location map**: OpenStreetMap iframe embed, centered on city/country
  only (no API key, no new dependency) — never the exact address, matching
  the existing copy "Adresse exacte communiquée après contact avec
  l'agent."
- **Meta card**: drops invented fields with no schema backing ("Titre
  foncier: ACD (Vérifié)", "Disponibilité: Immédiate"). Keeps only real
  fields: reference (shortened id), publish date, property type,
  transaction type, status.

## Data model additions

```prisma
model Listing {
  // ...existing fields unchanged...
  viewCount Int @default(0)

  inquiries ListingInquiry[]
  reports   ListingReport[]
}

// A single inbound lead from the public listing-detail page — either a
// general contact message or a VR-visit request. Anonymous (no userId):
// the visitor is never required to be logged in. Not a conversation
// thread — see frontend/src/app/messages/page.tsx for the (currently
// fully mocked, out-of-scope-here) rich inbox this may eventually feed.
model ListingInquiry {
  id        String  @id @default(cuid())
  listingId String
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  type    String // MESSAGE | VR_VISIT
  name    String
  phone   String
  email   String?
  message String

  createdAt DateTime @default(now())

  @@index([listingId, createdAt])
}

// A visitor-submitted flag on a listing, queued for admin moderation.
// Anonymous, matching ListingInquiry — no reporter identity captured.
model ListingReport {
  id        String  @id @default(cuid())
  listingId String
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  reason String // FAKE | SOLD | INCORRECT_INFO | SCAM | OTHER
  detail String?
  status String @default("PENDING") // PENDING | REVIEWED | DISMISSED

  createdAt DateTime @default(now())

  @@index([status, createdAt])
}
```

## API surface

### `GET /api/public/listings/[id]`

Unauthenticated (mirrors `GET /api/public/listings`, no `requireAuth`).

- 404 `LISTING_NOT_FOUND` when the listing doesn't exist OR its
  `status !== 'VERIFIED'` (never leak DRAFT/PENDING/SOLD listings, same
  invariant as the list endpoint — SOLD is deliberately excluded too since
  there is no "sold, browsable" state in the current UI).
- Returns the full flat DTO: all real `Listing` scalar fields (`title,
  description, landmark, city, country, propertyType, transactionType,
  price, currency, surfaceM2, capacity, yearBuilt, standing, roomsTotal,
  bedrooms, bathrooms, kitchens, amenities, createdAt, viewCount`), all
  `photos` (ordered by `position`, full array — not just primary), and
  `agent: { name, avatarUrl, phone, seed }` (never `email`).
- Also returns `similar: PublicListingItem[]` (reuses the same flat shape
  as `GET /api/public/listings`'s `items`): up to 3 listings where
  `status = 'VERIFIED'`, `country` and `propertyType` match the current
  listing, `id != id`, ordered `createdAt desc`.
- Side effect: increments `Listing.viewCount` by 1 on every successful
  200. Fire-and-forget (`.catch(() => {})` logged, never fails the
  request) — a lost increment under a race is an acceptable trade-off,
  matching the "no financial/legal invariant" bar for a vanity counter.

### `POST /api/public/listings/[id]/inquiries`

Unauthenticated. No CSRF check — same carve-out as `/api/auth/signup`
(pre-session public route, no CSRF cookie exists for an anonymous
visitor).

- Body (Zod): `{ type: z.enum(['MESSAGE', 'VR_VISIT']), name: string
  (1-120), phone: string (1-30), email: string.email().optional(),
  message: string (1-2000) }`.
- Rate limit: `createEmailLimiter` with `email: null` (forces the IP
  bucket) — `bucket: 'listing-inquiry'`, `windowMs: 60*60*1000`, `max: 5`.
- 404 `LISTING_NOT_FOUND` if the listing doesn't exist or isn't
  `VERIFIED` (same guard as the GET route — never let this endpoint probe
  for non-public listings).
- Creates the `ListingInquiry` row, then (best-effort, wrapped in
  try/catch so a notification/email failure never fails the 201):
  - `createNotification(prisma, { userId: listing.userId, type:
    'LISTING_INQUIRY', title: ..., body: ..., data: { listingId,
    inquiryId }, dedupeKey: `listing-inquiry:${inquiry.id}` })`
  - `getEmailQueue().enqueue({ to: owner.email, subject, html, text })`
- Returns `201 { ok: true }`.

### `POST /api/public/listings/[id]/reports`

Unauthenticated, same CSRF carve-out and rate-limit pattern (`bucket:
'listing-report'`, same limits).

- Body (Zod): `{ reason: z.enum(['FAKE','SOLD','INCORRECT_INFO','SCAM','OTHER']),
  detail: string.max(1000).optional() }`.
- 404 `LISTING_NOT_FOUND` guard, same as above.
- Creates `ListingReport` (status `PENDING`). No notification (admin
  reviews via the list endpoint below).
- Returns `201 { ok: true }`.

### `GET /api/admin/listing-reports`

`requireAdmin('ADMIN')`. Query params: `status` (optional filter),
cursor pagination (mirrors `GET /api/admin/withdrawals`'s
`clampLimit`/`decodeCursor`/`encodeCursor` helpers). Returns reports with
their parent listing's `id/title/status` joined in.

### `PATCH /api/admin/listing-reports/[id]`

`requireAdmin('ADMIN')`, CSRF-checked (this one **is** an authenticated
session route, unlike the two public POSTs above). Body: `{ status:
z.enum(['REVIEWED', 'DISMISSED']) }`. Updates the row, calls
`logAdminAction(prisma, { actorId: auth.user.sub, action:
'listing-report.resolve', targetType: 'ListingReport', targetId: id,
metadata: { status } })`. 404 if the report doesn't exist.

## Notification template

New wrapper in `frontend/src/lib/server/notifications/templates.ts`,
modeled on `alertMatchNotification`:

```ts
export function listingInquiryNotification(
  userId: string,
  listingId: string,
  listingTitle: string,
  inquiryId: string,
  inquiryType: 'MESSAGE' | 'VR_VISIT',
  fromName: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'LISTING_INQUIRY',
    title:
      inquiryType === 'VR_VISIT'
        ? `Demande de visite VR — ${listingTitle}`
        : `Nouveau message — ${listingTitle}`,
    body: `${fromName} s'intéresse à « ${listingTitle} ».`,
    data: { listingId, inquiryId },
    dedupeKey: `listing-inquiry:${inquiryId}`,
  };
}
```

## UI — `/annonces/[id]/page.tsx`

Full rewrite from the current mock, keeping the existing visual structure
(hero gallery / title block / caractéristiques / équipements / description
/ localisation / annonces similaires / sidebar) but driven by a single
`useEffect` fetch of `GET /api/public/listings/[id]` on mount:

- **Gallery**: renders all real `photos` (thumbnails + main), with the
  existing `ImageIcon` gray-box fallback when there are none.
- **Title block**: real title, price (`formatListingPrice`), city/country
  with `COUNTRY_FLAG`, `createdAt` via `formatDate`, real `viewCount`
  (drops "favoris"/"mis à jour" — no schema backing).
- **Caractéristiques**: renders one tile per non-null real field among
  `bedrooms, bathrooms, surfaceM2, roomsTotal, yearBuilt, kitchens,
  capacity` (icon map keyed by field name) — omits the grid entirely if
  every field is null.
- **Équipements**: maps `amenities: string[]` (JSON) through a new
  `AMENITY_ICON: Record<string, LucideIcon>` (12 entries matching
  `AMENITY_LABEL`'s keys in `frontend/src/lib/listings.ts`) — omits the
  section if `amenities` is empty.
- **Description**: renders `description` with the existing expand/collapse
  toggle — omits the section if null.
- **Localisation**: the detail API geocodes `city, country` server-side
  via OpenStreetMap's free Nominatim API (`GET
  https://nominatim.openstreetmap.org/search?q=<city>,<country>&format=json&limit=1`,
  no API key, called with a proper `User-Agent` header per Nominatim's
  usage policy) and returns `{ lat, lon } | null` in the DTO. The page
  embeds `https://www.openstreetmap.org/export/embed.html?bbox=<lon-0.05>,<lat-0.05>,<lon+0.05>,<lat+0.05>&marker=<lat>,<lon>&layer=mapnik`
  when coordinates were found; otherwise the whole "Localisation" section
  is omitted (no fake static image). Geocoding failure is non-fatal to
  the request (try/catch, `lat/lon: null`). Text caption below stays as
  today's real `city, country` string.
- **Annonces similaires**: renders the API's `similar` array (same card
  markup already used on `/annonces`'s grid view, reused as a shared
  component or duplicated — plan decides).
- **Sidebar — agent card**: real `agent.name`, `InitialsAvatar` with
  `seed={agent.seed}` `email=""`, real `agent.phone`.
  - "Contacter l'agent" opens/focuses the message form (`type: MESSAGE`).
  - "Appeler l'agent" becomes `<a href={`tel:${agent.phone}`}>`.
  - "Demander une visite VR" opens/focuses the message form pre-set to
    `type: VR_VISIT`.
  - "Signaler cette annonce" opens a small reason-select + optional detail
    inline form, POSTs to `/reports`, shows a confirmation toast/state.
- **Sidebar — message form**: real controlled form (name/phone/email
  optional/message), POSTs to `/inquiries`, shows a success state
  replacing the form on 201, surfaces the 429 rate-limit message if hit.
- **Save/Share**: "Sauvegarder" stays `InertRow` (decorative). "Partager"
  becomes a real button: `navigator.clipboard.writeText(window.location.href)`
  with a small "Lien copié" toast/tooltip state — no backend.
- **Meta card**: `Référence` (`id.slice(-8).toUpperCase()`), `Publié le`
  (`formatDate(createdAt)`), `Type de bien`
  (`PROPERTY_TYPE_LABEL[propertyType]`), `Transaction`
  (`TRANSACTION_TYPE_LABEL[transactionType]`), `Statut` (green "Vérifié").
  Drops `Titre foncier` and `Disponibilité` (no schema backing).
- **Loading/error states**: matches the pattern already established on
  `/annonces` (loading spinner via `Loader2`, "not found" state on a 404
  redirecting or showing an inline message — plan decides exact copy).

## Out of scope (explicit)

- `/messages` rich inbox (conversations, online status, scheduled-visit
  cards) — separate future session.
- Real video/VR conferencing infrastructure.
- Admin frontend for the report queue (`/admin/*` pages) — API only.
- "Favoris" / saved-listings feature.
- Exact-address mapping / geocoding.
