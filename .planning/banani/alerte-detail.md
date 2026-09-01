# Alerte Detail — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `aLYiQWu5EH_7` ("Alerte Detail")
- Fetched: 2026-08-03

## Scope
Front-end only, static data — no `Alert`/`Match` Prisma model, no API wiring.
Same convention as `/alertes` and `/alertes/new`.

## Route
`/alertes/[id]` — `frontend/src/app/alertes/[id]/page.tsx`. Reached by
clicking any alert card on `/alertes` (cards are now real `<Link>`s instead
of static divs). Unknown `id` renders a small "Alerte introuvable" state
with a link back, rather than a hard 404 — no backend to 404 against.

## Data refactor
Extracted the alert data shared between `/alertes` (list) and `/alertes/[id]`
(detail) into `frontend/src/lib/alerts-data.ts`: `SectorAlert`, `AlertMatch`,
`AlertStats` types, `MOCK_ALERTS` (5 alerts), `TRANSACTION_BADGE`. Each alert
now also carries `frequencyLabel` (split out of the list page's combined
`createdLabel` string), `stats` (newToday/totalMatches/viewed/saved), and
`matches: AlertMatch[]` for its own detail view.
- `a1` ("Villas à Cocody") uses the **literal 6-row match list** from the
  fetched Banani "Alerte Detail" mockup (exact titles/zones/prices/photos).
- `a2`/`a3`/`a5` get 1-2 illustrative matches reusing the same
  country/zone/photo already used by their card's "Correspondances
  récentes" entry on `/alertes` (kept consistent instead of inventing new
  data).
- `a4` (inactive, "Aucune" last match) gets an **empty matches array** —
  the detail page's matches section renders a real empty state, not a
  fabricated list.

## Component breakdown
- **REUSE** `DashboardShell`, `cn`, `TRANSACTION_BADGE`.
- **NEW** `frontend/src/lib/alerts-data.ts` (shared static data + types).
- **NEW** `frontend/src/app/alertes/[id]/page.tsx`.

## Responsive plan
- **Base (375px)**: header card actions wrap below the title block, mini
  stats `grid-cols-2`, filters bar wraps (`flex-wrap`), match rows wrap
  (photo + info stack from the price/actions columns via `flex-wrap` +
  `lg:flex-nowrap`, same pattern as the `/alertes` recent-matches list).
- **lg (1024px+)**: mini stats `grid-cols-4`, match rows single line —
  matches the Banani desktop mockup.

## Interactions / state
- "Activée/Désactivée" toggle in the header — real local `useState`
  (visual only, doesn't persist — matches the "static data" scope, but
  gives the page life since it's the alert's own detail view).
- Filters (Toutes les annonces / Prix croissant / Ce mois), view toggle
  (list/grid), "Exporter", per-row actions (eye/bookmark/more), "Modifier",
  "Supprimer", pagination buttons — inert, `disabled` + "Bientôt
  disponible", same convention as every sibling screen.
- Empty matches state (alert `a4`) — real empty-state message, not hidden.

## Open questions for user
None — same explicit "front-end only, static data" scope repeated by the
user for this screen.
