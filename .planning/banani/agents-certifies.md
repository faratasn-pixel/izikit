# Agents Certifiés (public) — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `EnFqXjtGOcU9` ("Agents Certifiés", page title "Habitat-Afrik — Nos Agents Certifiés")
- Flow: "Projet Propré" (`m2kVFGxniJZl`) — same flow as `demande-immobiliere`/`nouvelle-demande-setup1`.
- Fetched: 2026-08-05.

## Scope
Front-end only, static data — no `Agent` public directory model, no matching/
contact backend. Same convention as every screen this session.

## Route
`frontend/src/app/agents/page.tsx` — public agents directory, linked from
`PublicNavbar`'s "Agents" nav item (`active="agents"`).

## Component breakdown
- **REUSE** `PublicNavbar` (`active="agents"`), `PublicFooter` (footer
  content matches exactly — no changes needed).
- **NEW**: gradient hero (sky→navy `#0EA5E9→#0284C7→#0F172A`), kicker/title/
  desc, 4-stat row (120+ agents / 4 pays / 4,8/5 note / 100% KYC), stacked
  avatar cluster (+115 badge).
- Sticky filter bar: search input, 4 filter-select chips (pays/ville/note/
  spécialité), 4 transaction pill-tabs (Tous/Vente/Location/Terrain),
  live results count.
- 2-col layout: sticky sidebar (pays/spécialité/note/disponibilité filter
  groups) + agents grid.
- Agent cards: 1 featured full-width card (Kofi Atta — "Agent du mois",
  quote, 3-stat block, contact/profil buttons) + 7 regular cards (avatar,
  name, role, cert badge, 3-stat row, bio, profil/contacter buttons,
  country+city footer line) — all 8 agents literal from the fetched screen.
- Pagination (1/2/3…/13 + arrows), inert.

## Token mapping
Same brand/Tailwind mapping as other public pages. Cert badges use
`bg-brand/10 text-brand` (Certifié/Certification badges, `BadgeCheck` icon)
vs `ShieldCheck` icon for KYC/verification badges — matches the two distinct
icon families used in the Banani mock (`lucide:badge-check` vs
`lucide:shield-check`).

## Responsive plan
- **Base (375px)**: hero stacks, filter bar wraps, sidebar becomes a plain
  stacked block above the grid (no longer `sticky`/bordered), agents grid
  `grid-cols-1`.
- **sm (640px+)**: agents grid `grid-cols-2`.
- **xl (1280px+)**: agents grid `grid-cols-3`, featured card goes row layout
  (`xl:flex-row`), full sticky sidebar — matches the Banani desktop mockup.

## Interactions / state
- **Real search**: text input filters the 8 sample agents by name/role/bio
  (case-insensitive substring match).
- **Real country filter**: sidebar "Par pays" rows are clickable, filter the
  visible agents by country. Sidebar counts (124/38/22/41/23) stay literal
  from the Banani mock — this session's convention (see `annonces-listing`)
  keeps literal badge counts while making the underlying filter real on the
  small representative sample.
- **Real transaction tabs**: Tous/Vente/Location/Terrain pill-tabs filter by
  each agent's assigned transaction type (added field, not literal per-agent
  in the mock — the mock only showed the tabs, not a machine-readable
  type-per-agent; inferred from each bio's described specialty).
- Results count text (top filter bar + "X agents certifiés disponibles")
  recomputes live from the actual filtered array length, replacing the
  static "124"/"124 agents trouvés" mock text.
- Empty state ("Aucun agent ne correspond à ces critères") added for when
  filters return zero results — not in the Banani mock, needed since filters
  are now real.
- Everything else inert (`title="Bientôt disponible"`): specialité/note/
  disponibilité sidebar filters, filter-select chips (pays/ville/note/
  spécialité) in the top bar, sort select, Profil/Contacter buttons on every
  card, pagination.

## Open questions for user
None — same explicit "front-end only, static data" scope. Disclosed: each
agent's `transaction` tag (vente/location/terrain, used to power the real
pill-tab filter) was inferred from their bio text since the Banani mock
didn't expose a literal per-agent transaction field.
