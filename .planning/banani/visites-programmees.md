# Visites Programmées — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `_COuZRy6uykc` ("Visites Programmées")
- Fetched: 2026-08-03

## Scope
Front-end only, static data — no `Visit` Prisma model, no API wiring. Same
convention as every prior screen this session.

## Route
`/visites` — `frontend/src/app/visites/page.tsx`. Activates the sidebar's
"Visites programmées" nav entry (`NavKey = 'visits'`, declared but inert) —
switched to `href: '/visites'`.

## Component breakdown
- **REUSE** `DashboardShell`, `cn`.
- **NEW** page-local static arrays: `CALENDAR_EVENTS` (July 2025 month grid,
  literal from the Banani mockup — day 15 is "today"), `TODAY_VISITS` (2
  items), `UPCOMING_VISITS` (3 items), `ALL_VISITS` (5 table rows, literal
  data incl. ref/property/price/client/date/location/type/status).

## Token mapping
Same Tailwind/brand mapping as the rest of the app. Calendar event pills:
confirmed → emerald, pending → amber, cancelled → red. Type badges:
Présentiel → brand/blue, Virtuelle → violet (`purple-100`/`purple-700`, new
one-off color only used here per the mockup's `#F3E8FF`/`#7C3AED`).

## Responsive plan
- **Base (375px)**: stats `grid-cols-2`, calendar+side-panel stack to 1
  column (calendar first, side panel below), calendar day cells shrink
  (`min-h-14` vs desktop `min-h-20`, event pills truncate), table wrapped in
  `overflow-x-auto` with Localisation/Type columns hidden below `lg:`.
- **lg (1024px+)**: `1fr 320px` calendar/side-panel grid, full table —
  matches the Banani desktop mockup.

## Interactions / state
- **Liste / Calendrier** view tabs — real toggle: "Calendrier" (default)
  shows the month grid + side panel above the table; "Liste" hides the
  calendar section and shows only the full-width table (Banani doesn't ship
  a literal "Liste" state, this is the sensible interpretation of a
  list/calendar tab pair — flagged, not fetched).
- "Visites du jour" panel filter (Toutes/Confirmées/En attente) — real
  client-side filter over `TODAY_VISITS`.
- Table search — real client-side filter on property title / client name.
- Calendar prev/next month, week/month toggle, "Tout voir"/"Voir tout"
  panel links, "Filtrer" table button, per-row eye/pencil/x actions,
  "Exporter", "Planifier une visite" — inert, `disabled` + "Bientôt
  disponible" (no `Visit` model to act on, calendar is a static July 2025
  snapshot), same convention as every sibling screen.

## Open questions for user
None — same explicit "front-end only, static data" scope repeated across
every screen this session. The Liste/Calendrier toggle behavior is a
disclosed interpretation since Banani only shipped the Calendrier state.
