# Demande Detail — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `DEDJyYeJPGFP` ("Demande Detail")
- Fetched: 2026-08-03

## Scope
Front-end only, static data — no `PropertyRequest` model, no API wiring. Same
convention as every prior screen this session.

## Route
`/demandes/[id]` — `frontend/src/app/demandes/[id]/page.tsx`. Reached from
`/demandes`'s table "Eye" (view) action, switched from disabled to a real
`<Link href="/demandes/{id}">`. Unknown `id` renders a small "Demande
introuvable" state with a link back, same pattern as `/alertes/[id]`.

## Data refactor
Extracted `/demandes`' request data into `frontend/src/lib/requests-data.ts`
(`PropertyRequest`, `CriterionItem`, `TimelineEvent`, `SuggestedListing`
types + `MOCK_REQUESTS`, `PROPERTY_TYPE_ICON`, `PRIORITY_STYLE`,
`STATUS_LABEL`, `TRANSACTION_BADGE`), same pattern as the `alerts-data.ts`
refactor for `/alertes`. `r1` (Kouassi Brou / DEM-2025-001) already matched
the Banani "Demande Detail" mockup's data exactly — its `description`,
`criteria` (8 items), `timeline` (5 events), `internalNotes`, and
`suggestedListings` (3 items) are the literal fetched content. The other 7
requests get shorter, illustrative detail content (2-3 criteria, 2-3 timeline
events, generic notes, no suggested listings) built to match the same shape,
consistent with the `alerts-data.ts` precedent.

## Component breakdown
- **REUSE** `DashboardShell`, `cn`, shared types/maps from `requests-data.ts`.
- **NEW** `frontend/src/lib/requests-data.ts`.
- **NEW** `frontend/src/app/demandes/[id]/page.tsx`.

## Responsive plan
- **Base (375px)**: `detail-grid` collapses to 1 column (sidebar cards stack
  below the main column), hero card's info-grid `grid-cols-1` (single
  divider column), criteria list `grid-cols-1`, header actions wrap.
- **lg (1024px+)**: `1fr 340px` two-column grid, info-grid `grid-cols-3`,
  criteria `grid-cols-2` — matches the Banani desktop mockup.

## Interactions / state
- No client-side toggles on this screen (unlike `/alertes/[id]`'s
  active/inactive toggle) — the Banani mockup's own actions (Modifier,
  Marquer traitée, Message, Appeler, Marquer comme traitée, Clôturer,
  Ajouter une note, Suggérer une annonce) are all inert, `disabled` +
  "Bientôt disponible", since none have a backend model to act on.
- "← " back button and breadcrumb are real navigation back to `/demandes`.

## Open questions for user
None — same explicit "front-end only, static data" scope repeated across
every screen this session.
