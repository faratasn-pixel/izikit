# Jetons VR — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `w3s4uzJeNef2` ("Jetons VR", page title "Jetons & Visites Virtuelles")
- Fetched: 2026-08-04

## Scope
Front-end only, static data — no `TokenBalance` / `TokenTransaction` Prisma
model, no API wiring. Same convention as every prior screen this session.

## Route
`/jetons` — `frontend/src/app/jetons/page.tsx`. Activates the sidebar's
"Jetons & visites VR" nav entry (`NavKey = 'tokens'`, declared but inert) —
switched to `href: '/jetons'`.

## Component breakdown
- **REUSE** `DashboardShell`, `cn`.
- **NEW** page-local static data:
  - 3 balance cards: Solde de jetons (240, accent/brand card), Visites VR
    actives (8), Jetons utilisés ce mois (60/300 with progress bar).
  - `TOKEN_PACKS` (4 packs: Starter, Standard "Populaire", Pro, Entreprise —
    literal pricing/jeton-count/discount from the mockup).
  - `VR_LISTINGS` (4 items — annonces avec visite VR active/pending).
  - Usage breakdown: static SVG donut chart (3 segments: Visites VR 60%,
    Boost annonces 25%, Mise en avant 15%) + legend + progress bars.
  - `TRANSACTIONS` (5 rows: achats/utilisations/bonus, with running balance
    column).

## Token mapping
Same Tailwind/brand mapping as the rest of the app. Pack "Populaire" card
gets a brand border/badge highlight. VR listing status: active → emerald,
pending → amber. Transaction type: achat → emerald amount (+), utilisation →
red amount (−), bonus → brand amount (+).

## Responsive plan
- **Base (375px)**: balance cards `grid-cols-1`, packs grid `grid-cols-1`,
  VR-listings/usage-breakdown stack to 1 column, transactions table wrapped
  in `overflow-x-auto` with secondary columns hidden below `lg:`.
- **lg (1024px+)**: balance cards `grid-cols-3`, packs `grid-cols-4`,
  VR-listings + usage-breakdown as `2fr 1fr` grid, full table — matches the
  Banani desktop mockup.

## Interactions / state
- Pack selection (`selectedPack` state) — real client-side highlight when a
  card is clicked, no purchase side-effect.
- "Exporter", "Acheter des jetons", pack "Choisir" buttons, "Filtrer"
  transactions — inert, `disabled` + `title="Bientôt disponible"` (no model
  to act on), same convention as every sibling screen.
- Donut chart is a static inline SVG (no charting library).

## Open questions for user
None — same explicit "front-end only, static data" scope repeated across
every screen this session.
