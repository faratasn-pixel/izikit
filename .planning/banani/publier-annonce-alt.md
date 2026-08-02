# Publier Annonce Alt — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `93t22EgsWF0x` ("Publier Annonce Alt", flow "HABITATAFRIK EQUIPE")
- Fetched: 2026-07-31, live via MCP. Raw copy saved to `.planning/banani/raw/publier-annonce-alt-LIVE.html` (the pre-2026-07-24 archive already had a `publier-annonce-alt.html`/`.meta.json` too — same screen, not re-diffed line by line since the live fetch is authoritative).
- `genType: web-html-css` (desktop only — no mobile variant selected this pass, same "desktop first" convention as every other screen).
- **This resolves the open question flagged in `STATUS.md`** ("4 `publier-annonce*` variants exist, ask the user which is canonical") — the user explicitly selected **Alt** as the one to build.

## Structure map
This is by far the largest screen implemented so far — a single scrolling page with a left "stepper" sidebar (5 labeled sections, used as a progress/anchor indicator, not literal gating in the "Alt" layout — the non-Alt `publier-annonce` variant is presumably the literal wizard) and a right-hand form with 5 sections:
1. **Type de transaction & de bien** — 3-way transaction toggle (Vente/Location/Location courte durée) + 6-way property-type toggle (Villa/Appartement/Duplex/Bureau-Commerce/Terrain/Entrepôt).
2. **Informations de base** — title, description (textarea), price, surface (m²), year built, "standing" select, room/bedroom/bathroom counts (inline +/− steppers).
3. **Équipements & Commodités** — 12 amenity checkboxes (Piscine, Parking, Climatisation, Jardin, Groupe électrogène, Eau courante, Gardiennage, Terrasse, Fibre internet, Ascenseur, Interphone, Cuisine équipée).
4. **Photos & Médias** — drag/drop zone + thumbnail grid, up to 20 photos, one marked "Principale".
5. **Documents légaux** — 3 upload slots specific to the listing (Titre foncier, Mandat de vente, Plan cadastral — required/optional respectively).
- Bottom bar: autosave notice ("brouillon sauvegardé toutes les 2 minutes") + Étape précédente/suivante.
- Top action bar: "Enregistrer le brouillon" (outline) + "Publier l'annonce" (primary).
- Left stepper also shows a live summary (Type, Prix, Surface, Photos count) and a progress %.

**Scale note**: this single screen implies ~15 new form fields, 2 new photo/document upload flows, and a multi-section persisted form — larger than any single screen built so far (bigger than "Documents légaux", closer to "Documents légaux" + "Mon Agence" combined). See Open Questions before I start coding.

## System context (read before fetching, per the skill)
- Route: none exists yet. Proposing `frontend/src/app/listings/new/page.tsx` (`/listings/new`), linked from the already-built `/listings` page's disabled "Publier une annonce" button (which becomes real).
- Auth: `requireAuth()` only — **no accountType gate exists anywhere in the codebase today** (`OWNER_AGENT` vs `TENANT_BUYER` is currently display-only, e.g. the role badge). Publishing a listing is conceptually an agent action.
- Backend today: `GET /api/listings` only (see `frontend/src/app/api/listings/route.ts`) — no `POST`. `Listing` model has `title/city/country/propertyType/transactionType(SALE|RENT)/price/currency/status(PENDING|VERIFIED|SOLD)` — missing every field this screen needs beyond title/price/type.
- Upload: `/api/upload` (Cloudinary, magic-byte sniffed, returns a `FileUpload` row) already exists and is reusable as-is for both photos and documents — no changes needed to that route.
- Precedent for a similar "documents tied to an entity, fixed type list, upload-then-status" flow: `LegalDocument` (user-level, 6 fixed types, `@@unique([userId, type])`, `POST /api/legal-documents` reuses `/api/upload`'s trust boundary as its own route). The new listing documents need the same shape but keyed by `listingId` instead.
- Precedent for a JSON array column: `Organization.zones Json`.

## Open questions for user
1. **Third transaction type.** Existing `Listing.transactionType` is `SALE | RENT` (added for the Mes Annonces pass). This screen shows a third option, "Location courte durée" (short-term rental). Add `SHORT_RENT` as a third value, or fold it into `RENT` with a separate boolean/flag?
2. **Layout: single scroll vs literal wizard.** The mockup shows all 5 sections at once with a stepper sidebar that looks like a progress tracker, but also literal "Étape précédente/suivante" buttons. Recommend building it as **one continuous scrolling form** (stepper = clickable anchor nav + live progress, matches "Alt" being the *alternate*, presumably-simpler layout vs. the literal wizard `publier-annonce`) rather than gating each section behind Next/Back with per-step validation. OK, or do you want real step-gating?
3. **Scope for this pass — build all 5 sections for real, or trim.** Recommend: build everything real and persisted (matches the size of the "Documents légaux" pass, which was similarly large) — new `Listing` columns (description, surfaceM2, yearBuilt, standing, roomsTotal, bedrooms, bathrooms, amenities Json), a new `ListingPhoto` model (multi-photo, one primary), and a new `ListingDocument` model (3 fixed types: LAND_TITLE/SALE_MANDATE/CADASTRAL_PLAN) reusing `/api/upload`. Alternative: cut the Documents section to a disabled "Bientôt" placeholder this pass (smaller diff, documents-per-listing could ship later alongside the admin verification workflow that doesn't exist yet either). Which?
4. **Access gate.** Restrict `/listings/new` (and the future `POST /api/listings`) to `accountType === 'OWNER_AGENT'`, or leave it open to any authenticated user like every other route today (no accountType gate exists anywhere yet — this would be the first)?
5. **Draft autosave.** The mockup says "toutes les 2 minutes" (a literal timer). Recommend: **no client-side interval** — CLAUDE.md's cron strategy explicitly avoids `setInterval`-style background work; instead make "Enregistrer le brouillon" a real, manually-triggered save (POST with `status: DRAFT`), and skip the automatic 2-minute timer. OK, or do you actually want the timer?
6. **Status enum**: add `DRAFT` to `Listing.status` (currently `PENDING | VERIFIED | SOLD`) — "Enregistrer le brouillon" saves as `DRAFT`, "Publier l'annonce" saves as `PENDING` (awaiting verification, same as today). OK?
7. **What happens after "Publier l'annonce"?** Recommend: redirect to `/listings` (Mes Annonces), which will now show the new row. OK?
8. **Draft resume / edit** (opening a previously-saved draft again to finish it) — is that in scope for this pass, or is create-only (no resume, no edit) fine for now, consistent with "Modifier annonce" being its own separate, still-unbuilt screen?

## Implementation checklist (draft — finalize after questions answered)
- [ ] Resolve open questions above
- [ ] Prisma: extend `Listing` (transactionType 3rd value, description, surfaceM2, yearBuilt, standing, roomsTotal, bedrooms, bathrooms, amenities Json, status +DRAFT), new `ListingPhoto`, new `ListingDocument` — migration(s)
- [ ] `POST /api/listings` — create (DRAFT or PENDING depending on which button), accepts arrays of already-uploaded photo/document `FileUpload` keys to attach
- [ ] `frontend/src/app/listings/new/page.tsx` — mobile-first, all 5 sections, reusing `/api/upload` for photos + documents
- [ ] Wire the `/listings` page's disabled "Publier une annonce" button to this route
- [ ] 375/768/1280px check, empty/loading/error states, touch targets
- [ ] Tests for the new `POST /api/listings` route (same convention as every other route)
- [ ] Update `STATUS.md`
