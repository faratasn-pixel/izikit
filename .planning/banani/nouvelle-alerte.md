# Nouvelle Alerte — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `pyVgOb8k_wRD` ("Nouvelle Alerte")
- Fetched: 2026-08-03

## Scope
Front-end only, static data — no `Alert` Prisma model, no API wiring, no
submission. Same convention as `/alertes` and `/demandes`. Chips/toggles/radio
selectors are interactive (local React state) since that's normal form UX and
doesn't require a backend; the final "Créer l'alerte" action stays inert
(disabled + "Bientôt disponible") because there's nothing to persist to yet.

## Route
`/alertes/new` — `frontend/src/app/alertes/new/page.tsx`. Reached from
`/alertes`'s "Nouvelle alerte" header button and "Créer une nouvelle alerte"
dashed card, both switched from disabled to real `<Link>`s. No new
`DashboardShell` nav entry — stays under the existing `alerts` active key
(sub-page of Alerte secteur, matches the breadcrumb in the Banani mockup:
"Alerte secteur > Nouvelle alerte").

## Component breakdown
- **REUSE** `DashboardShell`, `cn`.
- **NEW** page-local `useState` for: alert name (text), transaction toggle
  (Vente/Location/Les deux), property-type chips (multi-select), location
  selects (static option lists, no real geo data), price range display,
  surface/rooms selects, 4 criteria toggles, frequency radio, 2 notification
  channel checkboxes ("app"/"email" pre-checked, SMS not), max-alerts-per-day
  select. Right rail preview card derives its chips live from the same state
  (mirrors the Banani "Aperçu de l'alerte" panel reacting to the form).
- No new primitives — chip/toggle/radio/select markup follows the same
  Tailwind utility patterns already used across `/listings/new` and
  `/alertes`.

## Token mapping
Same Tailwind/brand mapping as the rest of the app (`--primary` → `brand`,
`--success` family → `emerald`). No new `@theme` entries.

## Responsive plan
- **Base (375px)**: single column — form cards stack full-width, the sticky
  preview rail moves below the form (order-last), transaction toggle/type
  chips/freq options wrap, header actions ("Annuler"/"Créer l'alerte") shrink
  to icon+short label.
- **lg (1024px+)**: two-column grid `1fr 320px` (form + sticky preview rail),
  matches the Banani desktop mockup exactly.

## Interactions / state
- Transaction toggle, type chips (multi-select), 4 criteria toggles,
  frequency radio group, 2 notification checkboxes — all real client state,
  visually reflected in the live preview card on the right.
- Location/rooms/max-alerts selects — static `<select>`-style dropdowns with
  a fixed option list (no geo API), default value matches the mockup.
- Price range — static display (mockup's exact values), no draggable slider
  logic (would need a range-slider primitive not justified for static data).
- "Annuler" — real `Link` back to `/alertes`.
- "Créer l'alerte" (both header + rail copies), "Voir les correspondances" —
  inert, `disabled` + "Bientôt disponible", same convention as sibling
  screens (no `Alert` model to persist to).

## Open questions for user
None — same explicit "front-end only, static data" scope as `/alertes` and
`/demandes`, user referenced the same approach again.
