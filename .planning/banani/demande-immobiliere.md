# Demande Immobilière (public) — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `2NroFS5QcFFJ` ("Demande Immobilière", page title "Habitat-Afrik — Demande Immobilière")
- Flow: **"Projet Propré"** (`m2kVFGxniJZl`) — a *third* Banani flow this
  session, different from both "HABITATAFRIK EQUIPE" (agent dashboard) and
  "Ulrich Projet 2" (`landing-page`/`annonces-listing`). Same public-site
  visual language though — navbar links (Accueil/Annonces/Agents/Demande
  active/Comment ça marche) match `PublicNavbar` exactly.
- Fetched: 2026-08-05.

## Scope
Front-end only, static data — no `PropertyRequest` public-facing model, no
matching/notification backend. Same convention as every screen this session.

## Route
`frontend/src/app/demande-immobiliere/page.tsx` — public marketing/landing
page for the "Demande Immobilière" feature (buyer-facing, not the existing
authenticated agent-dashboard `/demandes` — different persona/route,
intentionally not reusing that path to avoid collision).

## Component breakdown
- **REUSE** `PublicNavbar` (`active="demande"`), `PublicFooter`.
- **NEW**: gradient hero (blue `#0EA5E9→#0284C7`, kicker/title/desc, 2 CTAs,
  right-side frosted stats card: 320+ demandes ce mois / 94% taux de
  correspondance / 48h délai moyen).
- "Comment ça marche" — 4-step card grid (Décrivez/Budget/Agents vous
  contactent/Concluez).
- "Demandes en cours" — anonymized public table, 6 literal rows (type
  badge, localisation w/ flag, transaction, budget, superficie, statut
  badge, correspondances, date), "Déposer ma demande" ghost pill.
- FAQ — 2×2 grid, 4 literal Q/A cards.
- CTA gradient band (brand blue, 2 actions).

## Token mapping
Reuses the app's `bg-brand`/`text-brand` token for the CTA/section accents
(Banani's theme here declares primary `#2563EB`, close enough to the
existing `--primary` already wired app-wide — no new token introduced).
Hero uses a one-off sky-blue gradient (`from-sky-500 to-sky-600`) distinct
from the brand CTA gradient, matching the mockup's dedicated hero color.
Type badges: Villa → brand/blue, Appartement → violet, Terrain → amber,
Bureau → emerald. Status badges: Active → emerald, En attente → amber,
Clôturée → gray.

## Responsive plan
- **Base (375px)**: hero stacks (stats card below hero text), how-it-works
  grid `grid-cols-1`, demandes table wrapped in `overflow-x-auto`, FAQ
  `grid-cols-1`.
- **lg (1024px+)**: hero side-by-side, how-it-works `grid-cols-4`, full
  table, FAQ `grid-cols-2` — matches the Banani desktop mockup.

## Interactions / state
- None real — this is a pure marketing/informational page (no filters,
  no toggles in the fetched mockup). "Déposer une demande" (hero + CTA +
  table-header ghost pill), "Voir mes demandes", "Voir les annonces" —
  inert (`InertLink`-style spans, `title="Bientôt disponible"`); no
  authenticated buyer-request flow exists yet at a public route.

## Open questions for user
None — same explicit "front-end only, static data" scope. Flagged: third
distinct Banani flow this session ("Projet Propré"), visually consistent
with the public-site components already built.
