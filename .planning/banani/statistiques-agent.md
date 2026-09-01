# Statistiques Agent — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `47H2Ss5450Kt` ("Statistiques Agent", page title "HABITAT-AFRIK — Statistiques")
- Fetched: 2026-08-04

## Scope
Front-end only, static data — no analytics/reporting Prisma model, no API
wiring. Same convention as every prior screen this session.

## Route
`/statistiques` — `frontend/src/app/statistiques/page.tsx`. Activates the
sidebar's "Statistiques" nav entry (`NavKey = 'stats'`, declared but inert)
— switched to `href: '/statistiques'`.

## Component breakdown
- **REUSE** `DashboardShell`, `cn`.
- **NEW** page-local static data, all literal from the fetched mockup:
  - 4 KPI stat cards (Vues d'annonces 2 847 +18%, Contacts reçus 134 +12%,
    Visites réalisées 24 +5%, Taux de conversion 4,7% −2%).
  - Line chart "Évolution des vues" — static inline SVG path (area + line +
    2 dots), 5 x-axis labels (1/8/15/22/30 Jun).
  - Donut chart "Répartition des annonces" (Vérifié 58%/24, En attente
    28%/12, Vendu 14%/6, center total 42) — `stroke-dasharray` circles like
    the Jetons VR donut.
  - Bar chart "Contacts reçus" — 7 daily bars (Lun–Dim, 8/14/11/19/16/7/4).
  - Progress list "Suivi des documents" — 4 items (Titres fonciers validés
    18, En cours de vérification 9, Documents manquants 5, Mandats signés
    14).
  - Ranking list "Top annonces" — 5 items w/ medal emojis for top 3
    (Villa Tokoin/App. Plateau/Bureau Cocody/Terrain Cadjèhoun/Maison
    Adidogomé) + contact counts.
  - "Sources de trafic" — 4-item progress list (Recherche organique 42%,
    Réseaux sociaux 31%, Email/Newsletters 17%, Liens directs 10%).
  - "Répartition géographique" — 6-row city progress list (Lomé 68%, Dakar
    52%, Abidjan 44%, Cotonou 35%, Accra 22%, Autres villes 15%).

## Token mapping
Same Tailwind/brand mapping as the rest of the app. Trend up → emerald-600,
trend down → red-600. Donut/traffic-source colors reused verbatim from the
mockup's hex values (brand blue, emerald, amber, violet).

## Responsive plan
- **Base (375px)**: stat cards `grid-cols-2`, all chart-row grids collapse
  to `grid-cols-1` (line+donut row, bar+progress+ranking row, sources+geo
  row all stack), period-select scrolls horizontally if needed.
- **lg (1024px+)**: stat cards `grid-cols-4`, line+donut `grid-cols-2`,
  bar+progress+ranking `grid-cols-3`, sources+geo `grid-cols-2` — matches
  the Banani desktop mockup.

## Interactions / state
- Period toggle (7 jours/30 jours/3 mois/1 an) — real client-side
  `useState`, switches the active pill only (chart data stays static since
  only one period's data was fetched — disclosed simplification).
- "Exporter" button, per-chart "Ce mois"/"Cette semaine" selects — inert,
  `disabled` + `title="Bientôt disponible"` (no backing model), same
  convention as every sibling screen.
- All charts are static inline SVG / CSS bars — no charting library.

## Open questions for user
None — same explicit "front-end only, static data" scope repeated across
every screen this session. The period toggle only changing the active pill
(not re-rendering chart data) is a disclosed simplification since Banani
only shipped the "30 jours" state.
