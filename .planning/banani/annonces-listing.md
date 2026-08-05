# Annonces Listing — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `wK7wVS2Vnz1J` ("Annonces Listing", page title "Habitat-Afrik — Toutes les annonces")
- Flow: "Ulrich Projet 2" (`E_uHv0vTnPhR`) — same flow as `landing-page`, the
  public marketing site (not the agent dashboard/"HABITATAFRIK EQUIPE" flow).
- Fetched: 2026-08-05.

## Scope
Front-end only, static data — no `Listing` public-search model/API, no
pagination backend. Same convention as every screen this session.

## Route
`/annonces` — `frontend/src/app/annonces/page.tsx`. Public page (no
`DashboardShell`), same navbar/footer chrome as the landing page.

## Refactor
Landing page (`page.tsx`) and this screen share an identical navbar and
footer. Extracted both into `frontend/src/components/public/PublicNavbar.tsx`
(`active` prop: `'accueil' | 'annonces' | 'agents' | 'demande' | 'comment'`)
and `frontend/src/components/public/PublicFooter.tsx`, then updated
`page.tsx` to consume them instead of its inline copies.
**Note**: the Banani "Annonces Listing" navbar only has 4 links (no
"Demande") vs. the landing page's 5 — normalized to the landing page's
fuller 5-link set for consistency across the public site (disclosed
simplification, not a literal per-screen difference).

## Component breakdown
- **REUSE** `PublicNavbar`, `PublicFooter`, `cn`.
- **NEW** page-local static data: `LISTINGS` (9 literal cards: Villa duplex
  Cocody/Appartement Dakar/Maison Cotonou/Terrain Calavi/Studio
  Abomey-Calavi/Villa Cotonou/Bureau Lomé/Appartement Yopougon/Terrain
  Dakar — title/location/agent name+avatar/features/price/badges/category).
- Page header (breadcrumb, title, "128 annonces trouvées" result count,
  grid/list view toggle).
- Sticky filter bar (pays/villes/type/transaction/prix pills + "Plus de
  filtres" + tri).
- 260px sidebar filters (type de bien checkboxes w/ counts, transaction
  radio-style checkboxes, price range slider mock, pays checkboxes, surface
  minimale checkboxes, "Appliquer les filtres").
- Listings area: 6-pill type-tabs row (Toutes 128/Maisons 34/Appartements
  52/Terrains 19/Bureaux 12/Location 52 — literal counts from the mockup,
  not recomputed from the 9 mock cards), 3-col listing grid, pagination
  (1/2/3/4/…/15).

## Token mapping
Same Tailwind/brand mapping as the landing page. Badge colors: light/green
→ emerald-500, dark → black/78 overlay, orange (Exclusif) → amber-500,
location (sky) → sky-500 one-off per the mockup's `#0EA5E9`.

## Responsive plan
- **Base (375px)**: sidebar filters hidden (no off-canvas filter drawer
  built this pass — flagged as a gap, matches the "not everything fetched
  gets full mobile treatment" pattern used elsewhere), filter bar chips
  scroll horizontally (`overflow-x-auto`), listing grid `grid-cols-1`,
  type-tabs row wraps.
- **lg (1024px+)**: full `260px 1fr` sidebar + grid layout, 3-col listing
  grid — matches the Banani desktop mockup.

## Interactions / state
- **View toggle (grid/list)** — real client-side toggle; "list" renders the
  same 9 cards in a single-column denser row layout (disclosed
  interpretation, Banani only shipped the grid state).
- **Type-tabs row** (Toutes/Maisons/Appartements/Terrains/Bureaux/Location)
  — real client-side filter over the 9 mock cards (category inferred per
  card, same convention as the landing page's listing filter).
- Sidebar filter checkboxes/price slider/pays/surface, top filter-bar pills,
  "Plus de filtres", sort select, "Réinitialiser", "Appliquer les filtres",
  every card's "Voir →", pagination page numbers — inert
  (`InertLink`/`disabled` + `title="Bientôt disponible"`), no public search
  backend exists yet.

## Open questions for user
None — same explicit "front-end only, static data" scope. Result count
("128 annonces trouvées") and tab counts are literal Banani copy, not
derived from the 9 rendered mock cards — disclosed as illustrative, not
live-computed.
