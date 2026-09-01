# Documents légaux — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `mU9G3YPaywt9` ("Documents Légaux"), fetched live via MCP 2026-07-30.
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`).

## Scope decision (confirmed with the user)
- **This pass**: real upload + per-document status, no admin back-office.
  Each of the 6 fixed document types can be uploaded/replaced by the agent via
  Cloudinary (reusing the same trust boundary as `/api/upload`: CSRF → auth →
  size cap → MIME allowlist → magic-byte sniff → Cloudinary). New uploads
  (and replacements) always land as `PENDING` — there is no way for a user to
  mark their own document `VERIFIED`.
- **Phase 2 (not this pass)**: an `/api/admin/legal-documents` route so
  ADMIN/SUPERADMIN can flip `PENDING → VERIFIED/REJECTED` (with
  `rejectionReason`), wired through `logAdminAction`. Until that exists every
  document effectively stays `PENDING` after upload — expected and stated in
  the UI copy, not a bug.
- Documents belong to the **user** (agent), not the Organization — matches
  the mockup's per-agent framing ("Kofi Mensah"'s documents) and doesn't
  require an Organization to exist first (unlike Mon Agence's zones).
- Document types are the **fixed list of 6** from the mockup, not free-form:
  `ID_CARD`, `PRO_CARD`, `RCCM`, `TAX_CERTIFICATE`, `MANAGEMENT_MANDATE`,
  `LIABILITY_INSURANCE`. One row per `(userId, type)` — re-upload overwrites
  the previous file (new Cloudinary object, old one is simply superseded —
  not explicitly deleted from Cloudinary in this pass) and resets status to
  `PENDING`.
- The 4 stat chips (validés / en attente / manquant / total) in the mockup
  are **derived live** from the 6 rows' statuses, not hardcoded — this is a
  free, honest win (no placeholder needed, unlike Mon Agence's KPI chips).

## System context
- Reuses the same upload trust boundary as `frontend/src/app/api/upload/route.ts`
  (`verifyCsrf` → `requireAuth` → Cloudinary env probe → size/MIME gates →
  `verifyMagicBytes` → `uploadBuffer`) but as its own route
  (`/api/legal-documents`) because the persistence target (`LegalDocument`,
  keyed by `(userId, type)`) and request shape (multipart with a `type` field)
  differ from the generic `FileUpload` row. `application/pdf` is already
  covered by `sniff.ts`'s magic-byte table — no sniffer changes needed.
- `UPLOAD_ALLOWED_MIME` stays the operator-wide allowlist; this route
  additionally restricts to `application/pdf,image/jpeg,image/png` regardless
  of that env (legal docs are scans/photos/PDFs, never webp/gif/heic).
- No existing verification-status concept for documents — `LegalDocument.status`
  (`PENDING|VERIFIED|REJECTED`) is new, modeled after `Withdrawal`'s
  stable-string-enum convention rather than a Prisma `enum` (matches the
  rest of the schema's string-enum style, e.g. `User.role`, `User.status`).

## Prisma changes
New model `LegalDocument` (migration `10_add_legal_documents`):
`userId` (→ `User`, cascade delete), `type`, `status` (default `PENDING`),
`key`/`url`/`filename`/`mimeType`/`sizeBytes` (Cloudinary result, mirrors
`FileUpload`), `expiresAt` (nullable, optional per-type), `rejectionReason`
(nullable, populated by the phase-2 admin route). `@@unique([userId, type])`.

## Component breakdown
- **NEW** `frontend/src/app/api/legal-documents/route.ts` — `GET` returns all
  6 types merged with the user's uploaded rows (missing types → `null`
  entry); `POST` (multipart: `type`, `file`, optional `expiresAt`) upserts by
  `(userId, type)`, always resetting `status` to `PENDING`.
- **NEW** `frontend/src/components/settings/LegalDocumentsCard.tsx` — stats
  row (derived) + the 6-row document list (icon/name/status badge/download or
  upload-replace action per row) + a shared upload dialog reused for both
  "Déposer" and "Remplacer".
- Update `SettingsSideNav.tsx`: "Documents légaux" moves from
  `AGENCY_INERT_ITEMS` to a real tab.
- Update `settings/page.tsx`: extend `SettingsTabKey` with `'documents'`.

## Responsive plan
Same pattern as the other settings cards: mobile-first single column: stat
chips stack 2×2 on mobile (`grid-cols-2 md:grid-cols-4`), each document row
stacks action buttons below the name/status on narrow screens, upload
dialog is a full-width sheet on mobile.

## Interactions / state
- Empty (no `LegalDocument` row for a type) → red "Manquant" badge + primary
  "Déposer" action.
- `PENDING` → amber "En attente" badge + "Remplacer" action.
- `VERIFIED` → green "Vérifié" badge + "Télécharger" action (no replace, to
  avoid casually invalidating a verified doc — re-upload flow can be added
  later if needed, out of scope now).
- `REJECTED` → red badge showing `rejectionReason` + "Remplacer" action
  (schema-ready even though phase 1 has no way to set this status yet).
- Loading / error states via the existing `useToast` + inline spinner
  pattern used by `AgencyZonesCard.tsx`.

## Implementation checklist
- [ ] Prisma migration `10_add_legal_documents`
- [ ] `GET`/`POST /api/legal-documents` + tests (list merge, upload upsert,
      CSRF/auth/size/MIME/magic-byte gates, VERIFIED blocks replace)
- [ ] `LegalDocumentsCard` component
- [ ] Wire `'documents'` tab into `SettingsSideNav` + `settings/page.tsx`
- [ ] `pnpm format && lint && typecheck && test`
- [ ] Update `.planning/banani/STATUS.md`

## Open questions for user
None outstanding — scope (real upload, no admin verification yet), ownership
(user not org), and document-type list were confirmed before writing this
plan.
