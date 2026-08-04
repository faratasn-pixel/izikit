# Demande Immobilière (Agent) — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `e48WC0idcwtd` ("Demande Immobilière Agent")
- Fetched: 2026-08-03

## Scope
Front-end only, static data (no API wiring, no backend model). List/table view
only — "Nouvelle Demande", "Demande Detail", "Modifier Demande" are separate
Banani screens, out of scope for this pass.

## Route
`/demandes` — `frontend/src/app/demandes/page.tsx`. Added to
`DashboardShell`'s "Gestion" nav group, between "Mes annonces" and "Contacts
reçus" (matches Banani sidebar order). New `NavKey = 'requests'`, icon
`FileSearch` (lucide), same active/href convention as existing entries.

## Component breakdown
- **REUSE** `DashboardShell` — sidebar/topbar already reproduce the Banani
  shell 1:1 (verified against fetched HTML).
- **REUSE** `cn` from `@/lib/utils`.
- **NEW** page-local static array `MOCK_REQUESTS` (8 rows, literal data from
  the Banani mockup) + small label/icon maps (`PROPERTY_TYPE_ICON`,
  `PRIORITY_STYLE`, `STATUS_BADGE`, `TRANSACTION_BADGE`) — no shared lib,
  this is throwaway demo data until a real `PropertyRequest` Prisma model
  exists.
- No new primitives needed — table/badge/pagination markup follows the exact
  Tailwind patterns already established in `/listings/page.tsx`.

## Token mapping
Already Tailwind + `--brand` in this codebase (`/listings` proves the
mapping); no new `@theme` entries needed. Badge colors: pending `amber`,
active `emerald` (`en cours`), closed `gray`, urgent `red`, vente `brand/10`,
location `emerald-50`/`emerald-700` — following the same shade families
`/listings` already uses for its own status badges.

## Responsive plan
- **Base (375px)**: stats grid `grid-cols-2`, table wrapped in
  `overflow-x-auto` (same as `/listings`), filter bar wraps
  (`flex-wrap`), non-essential columns (`Type`, `Zone`, `Priorité`, `Date`)
  hidden below `lg:` — mirrors `/listings`' `mobileHidden` column pattern.
- **lg (1024px+)**: full table, `grid-cols-4` stats — matches Banani desktop
  mockup.

## Interactions / state
- Tabs (Toutes/En attente/En cours/Clôturées) — functional, filters the
  static array client-side.
- Search (client name / ville) + selects (pays, type de bien, transaction) —
  functional client-side filters, same pattern as `/listings`' search/city
  filter.
- "Réinitialiser" clears all filters.
- Row actions (voir/modifier/plus), "Exporter", "Nouvelle demande" — inert,
  `disabled` + "Bientôt disponible" title, identical convention to
  `/listings`' not-yet-wired buttons (no backend model to act on yet).
- Empty-filtered state: same message pattern as `/listings`.

## Open questions for user
None outstanding — route and scope confirmed by user (2026-08-03).
