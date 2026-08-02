# Mes Annonces — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `V9hOWu9LzoGk` ("Mes Annonces", flow "HABITATAFRIK EQUIPE")
- Fetched: 2026-07-31, live via MCP (subscription still active)
- Same screenId as the pre-2026-07-24 archive (`raw/mes-annonces.html`) — not a new revision, first time actually implementing it.
- `genType: web-html-css` (desktop only). No mobile variant was selected this pass — `annonces-mobile` stays in the Pending list, same "desktop first, mobile pass later" convention as `agent-dashboard` → `dashboard-mobile`.

## Structure map
- **Sidebar + Topbar**: identical structure/tokens to the already-implemented `DashboardShell` (logo, global search, 3 nav groups, user pill, notif bell). No new component needed — reuse as-is, just mark "Mes annonces" active.
- **Page header**: title "Mes annonces" + subtitle "Gérez l'ensemble de vos biens immobiliers publiés sur la plateforme." + two actions: `Exporter` (outline) and `Publier une annonce` (primary).
- **Stats bar**: 4 cards in a row — Total annonces / Annonces vérifiées / En attente / Biens vendus, each with a colored dot + short sub-label.
- **Filter bar**: search input, a 4-tab pill group (Toutes/Vérifiées/En attente/Vendues) driving status, two fake-selects (Ville, Type), and a `Filtrer` outline button.
- **Table card**: checkbox column, Annonce (thumbnail + title + ref code), Localisation, Type (Vente/Location pill), Prix (FCFA, "/ mois" suffix for rentals), Contacts (count), Statut (badge), Publié le (date), Actions (eye/pencil/trash).
- **Pagination footer**: "Affichage de X à Y sur Z annonces" + numbered page buttons + prev/next arrows.

## Component breakdown
- **REUSE** `DashboardShell` (`frontend/src/components/dashboard/DashboardShell.tsx`) — sidebar/topbar shell, unchanged.
- **REUSE** `lib/listings.ts` (`STATUS_LABEL`, `formatListingPrice` — adjusted, see token mapping) — already extracted in Task 1 of the prior (now superseded) plan.
- **NEW** `frontend/src/app/listings/page.tsx` — the page itself, replacing the earlier draft that didn't match this design.
- **PRIMITIVE candidates** (extract if the pattern repeats elsewhere later — not yet, per rule-of-three): stat card, filter pill, badge — kept inline in the page for now since this is the only screen using them today.

## Token mapping (Banani → project)
| Banani token | Project value |
|---|---|
| `--primary: #376BFF` | already `bg-brand`/`text-brand` (see `dashboard/page.tsx` usage) |
| `--success` badge (`#D1FAE5`/`#065F46`) | `bg-emerald-100 text-emerald-800` (matches existing `STATUS_STYLE.VERIFIED`) |
| `--warning` badge (`#FEF3C7`/`#92400E`) | `bg-amber-100 text-amber-800` (matches existing `STATUS_STYLE.PENDING`) |
| `--destructive` badge (`#FEE2E2`/`#991B1B`) | `bg-red-100 text-red-800` (matches existing `STATUS_STYLE.SOLD`) — note: Banani uses red for "Vendu" too, not just errors |
| `--radius-xl: 12px` | `rounded-2xl` (cards) |
| `--radius-lg: 8px` | `rounded-lg` (inputs/buttons) |
| `--radius-md: 6px` | `rounded-md` (small icon buttons) |
| Sora 600 / Inter 400,500,600 | already loaded project-wide (`font-sora` utility exists) |
| `iconify-icon` (`lucide:*`) | `lucide-react` — `Search, SlidersHorizontal, Plus, MapPin, Eye, Pencil, Trash2, Download, CheckCircle2, Clock, XCircle, ChevronDown, ChevronLeft, ChevronRight, Square` |

## Tailwind translation notes
- `.stats-bar { display:grid; grid-template-columns:repeat(4,1fr); gap:16px }` → `grid grid-cols-2 lg:grid-cols-4 gap-4` (mobile: 2 cols, per project's existing dashboard convention).
- `.filter-tabs { background:var(--muted); border-radius:8px; padding:3px }` + `.filter-tab.active { background:var(--card) }` → `bg-gray-100 rounded-lg p-[3px]` wrapper, active tab `bg-white shadow-sm font-semibold`.
- `.listing-thumb { width:52px; height:40px; border-radius:6px; object-fit:cover }` → `h-10 w-[52px] rounded-md object-cover` — see Open Questions for what renders here (no real photo field yet).
- `.table-pagination` numbered buttons → see Open Questions (API/architecture mismatch, needs a decision before translation).

## Responsive plan
- **Base (375px)**: stats bar → `grid-cols-2`; filter bar wraps (search full-width row, tabs scroll horizontally `overflow-x-auto`, city/type selects + Filtrer collapse to icon-only or move into the same filter popover pattern already built for the dashboard preview); table becomes horizontally scrollable, checkbox + Contacts + Publié le columns hidden below `lg:` (mirrors the existing dashboard table's `mobileHidden` convention); Exporter button hidden below `lg:` (icon-only or dropped, TBD with user); pagination footer stacks (info line above controls).
- **lg (1024px+)**: full desktop layout as shipped by Banani.
- Bottom nav (`BottomNav.tsx`) already handles the mobile nav chrome — no change needed there beyond wiring the `href` (already planned).

## Interactions / state
- Filter tabs (Toutes/Vérifiées/En attente/Vendues): client-side status filter, replaces the popover-based status filter from the earlier (superseded) plan.
- Ville / Type fake-selects: real `<select>` filters, client-side, same pagination caveat as before (filters only apply to already-loaded rows).
- Search: same as before, client-side over title/city/country.
- Row checkboxes: see Open Questions — no bulk action is visible in the static mockup and no bulk-delete backend exists.
- Eye / Pencil / Trash action buttons: `disabled` + "Bientôt disponible" tooltip (no detail/edit/delete routes exist — same convention as every other not-yet-built action in this app).
- Exporter: `disabled` + "Bientôt disponible" tooltip (no export endpoint).
- Publier une annonce: `disabled` + "Bientôt disponible" tooltip (existing convention, no publish flow yet).
- Empty / loading / no-results states: carried over from the earlier plan (Banani's mockup only shows the populated state).

## Copy / i18n
All strings are already French in the Banani export — copied verbatim where they match the product's actual scope (e.g. "Aucune annonce pour l'instant" stays as the existing empty-state copy, not replaced by anything Banani-specific since Banani doesn't show an empty state).

## Open questions for user
These need answers before I write code — several touch the Prisma schema, so getting them wrong means a throwaway migration.

1. **"Type" column = Vente/Location (transaction type), not property type.** The current `Listing.propertyType` (VILLA/APARTMENT/LAND/DUPLEX/OFFICE) doesn't appear anywhere in this screen. Do you want a new `Listing.transactionType: 'SALE' | 'RENT'` field (drives both the Type pill and the "/ mois" price suffix), or should "Type" here actually mean property type and I adapt the pill/price display to that instead?
2. **Photo thumbnails**: `Listing` has no image field today (no Cloudinary wiring for listings). Options: (a) render a neutral placeholder box in the thumbnail slot for now, flagged as a known gap — fastest; (b) add real photo upload (new `Listing.photoUrl`/`photoKey` + reuse the existing `/api/upload` Cloudinary pipeline) — bigger scope, a real feature. Which one?
3. **"Contacts" column**: no `Contact` model exists yet (it's still in the Pending list for a future "Contacts reçus" screen). Show `—` for every row (honest, no fabricated data), or drop the column entirely for now?
4. **Ref code `#ANN-2025-001`**: no sequential counter exists in the schema. I'd derive something visually equivalent from `id`/`createdAt` (e.g. `#ANN-{year}-{short id}`) rather than a real sequence — OK, or do you want a real per-user sequential counter added to the schema?
5. **Checkboxes**: no bulk action toolbar appears in the mockup and there's no bulk-delete endpoint. Render as decorative/disabled (matches the "Bientôt" convention), or drop the column?
6. **Pagination**: Banani shows classic numbered pages ("1 2 3 4", jump to any page) + "Affichage de X à Y sur Z". The existing `GET /api/listings` only supports cursor pagination (no total count, no arbitrary page jump) — that's a real architecture mismatch, not just styling. Three options:
   - (a) Keep the cursor model, restyle as a simple Prev/Next pair (no numbered jump, no total count) — closest to what the API can do today with zero backend changes.
   - (b) Extend `GET /api/listings` to also return a total `count` (cheap — one extra `prisma.listing.count()`) so we can at least show "Affichage de X à Y sur Z" accurately, but still only Prev/Next (sequential — going "back" replays from cursor 0 up to the target page since cursors aren't reversible).
   - (c) Switch the endpoint to offset/limit pagination (`skip`/`take`) instead of cursor-based, enabling true numbered/random-access pages — the most faithful to Banani but changes an already-shipped, tested API contract.
   Which do you want?
7. **Stats bar**: these CAN be real (unlike the Agent Dashboard's illustrative KPIs) since they're just counts of the user's own `Listing` rows by status. Should I add a small `GET /api/listings` extension (or a new lightweight endpoint) returning `{ total, verified, pending, sold }` counts, or keep them illustrative like the dashboard's stat cards for now?
8. **Filtrer button** next to the Ville/Type selects: in a static mockup its behavior is ambiguous (redundant with the two selects, or opens a deeper filter panel). OK to drop it since Ville+Type+status-tabs already cover filtering, or keep it as a disabled placeholder for "more filters later"?

## Implementation checklist
- [x] Resolve the 8 open questions above with the user — answered "go with your recommendations" (2026-07-31), decisions below
- [x] Prisma schema changes: `Listing.transactionType String @default("SALE")` — migration `14_add_listing_transaction_type`, applied to Neon
- [x] Extended `GET /api/listings`: added `transactionType` to `select`, added `counts: { total, verified, pending, sold }` via 4 parallel `prisma.listing.count()` calls scoped to `userId` (independent of pagination). 2 new tests (9 total, all passing).
- [x] Rebuilt `frontend/src/app/listings/page.tsx` mobile-first (base classes unprefixed, `lg:` for desktop) matching the Banani layout
- [x] Nav hrefs already wired (`DashboardShell.tsx`/`BottomNav.tsx` — done in an earlier pass, confirmed still correct)
- [x] Typecheck (no new errors beyond the 2 pre-existing unrelated ones), lint (clean), full `pnpm test` (685/685 passing)
- [ ] 375px / 768px / 1280px pixel-parity check against the Banani mockup — SSR HTTP 200 checks done (`/listings` 200, `/api/listings` 401 unauthenticated as expected), but no live authenticated-browser screenshot was possible (same headless-Chromium/Playwright sandbox limitation as every prior screen this project). **Ask the user to eyeball breakpoints in a real browser.**
- [x] Touch targets ≥ 48px on mobile action buttons/pagination (30px icon buttons are desktop-density, matching Banani's own 30px spec — flagged as a minor deviation from the 48px guideline, consistent with reproducing the source design faithfully)
- [x] Empty / loading / no-results states implemented (3 states: no listings at all, loading, no results for active filters)

## Decisions taken ("go with your recommendations", 2026-07-31)
1. **Type = transaction type.** Added `Listing.transactionType: SALE | RENT`. Existing `propertyType` (Villa/Appartement/…) is not shown on this screen (Banani doesn't show it here either) — still used by the Agent Dashboard preview table, unaffected.
2. **Photo thumbnails**: neutral placeholder box (`Building2` icon on gray background) — no Cloudinary listing-photo feature this pass.
3. **Contacts column**: shows `—` for every row (no fabricated numbers; `Contact` model doesn't exist yet).
4. **Ref code**: derived as `#ANN-{year}-{last 4 chars of id, uppercased}` from real `createdAt`/`id` — not a real sequence.
5. **Checkboxes**: decorative (plain bordered `div`, not a real `<input type=checkbox>`, no state) — no bulk actions exist.
6. **Pagination**: extended the API with real `counts.total` and implemented true numbered pagination on top of the existing cursor endpoint — clicking a page number ahead of what's been fetched sequentially prefetches and caches each intermediate page client-side (no cursor is ever discarded, so Prev is instant for already-visited pages). No backend contract change (still cursor-based under the hood).
7. **Stats bar**: real, wired to the new `counts` field (not illustrative, unlike the Agent Dashboard's KPI cards).
8. **"Filtrer" button**: dropped — Ville + Type selects + the status tabs already cover all filtering shown in the mockup.

**Known caveat carried over**: filters (search/city/type/status) apply only to the *currently displayed page's* rows, not across all pages — flagged in-page ("Filtres appliqués sur cette page uniquement.") when any filter is active, since the underlying pagination is still cursor-based server-side.

## Update `STATUS.md`
Moved from "In progress" to "Done" in the same edit as this checklist.
