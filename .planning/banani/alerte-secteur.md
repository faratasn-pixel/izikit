# Alerte Secteur — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `ruc_WxneTkzV` ("Alerte Secteur")
- Fetched: 2026-08-03

## Scope
Same approach as `/demandes` (user: "fais pareil aussi"): front-end only,
static data, list/grid view only. "Nouvelle Alerte" and "Gérer Alertes" are
separate Banani screens (already archived), out of scope for this pass —
their trigger buttons stay inert ("Bientôt disponible").

## Route
`/alertes` — `frontend/src/app/alertes/page.tsx`. New `NavKey = 'alerts'`,
icon `MapPinned`, inserted in `DashboardShell`'s "Gestion" group between
"Mes annonces" and "Demande immobilière" (matches the flat sidebar order
seen on the "Demande Immobilière Agent" screen — the "Alerte Secteur"
screen itself nests "Demande immobilière" as a sub-item under "Alerte
secteur", but that's inconsistent with the other screen and the existing
`DashboardShell` has no submenu support; kept flat, no new complexity for
one screen's variant).

## Component breakdown
- **REUSE** `DashboardShell`, `cn`.
- **NEW** page-local static array `MOCK_ALERTS` (5 alert cards) +
  `MOCK_MATCHES` (5 recent-match rows) — literal data from the Banani
  mockup, no shared lib (no `Alert`/`Match` Prisma model exists).

## Token mapping
Same Tailwind/brand mapping as `/demandes` — no new tokens.

## Responsive plan
- **Base (375px)**: alert grid `grid-cols-1`, match rows stack (thumbnail +
  info wrap), stats `grid-cols-2`.
- **md (768px+)**: alert grid `grid-cols-2`.
- **lg (1024px+)**: alert grid `grid-cols-3`, stats `grid-cols-4` — matches
  Banani desktop mockup.

## Interactions / state
- Alert card toggle (Activée/Désactivée pill) — static, purely visual per
  card's mock status (no click handler, matches "static data" scope).
- "Vue liste"/"Vue grille" toggle, "Nouvelle alerte", "Gérer les alertes",
  match-row actions (eye/bookmark/more), "Exporter", "Voir toutes les
  correspondances" — inert, `disabled` + "Bientôt disponible", same
  convention as `/demandes`.
- Empty state: not applicable (static array always has 5 items).

## Open questions for user
None — user explicitly said to replicate the `/demandes` approach.
