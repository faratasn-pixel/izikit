# Nouvelle Demande — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `ZYtkWqU8KVNc` ("Nouvelle Demande")
- Fetched: 2026-08-03

## Scope
Front-end only, static data — no `PropertyRequest` Prisma model, no API
wiring. Same convention as `/alertes`, `/alertes/new`, `/demandes`.

## Route
`/demandes/new` — `frontend/src/app/demandes/new/page.tsx`. Reached from
`/demandes`'s "Nouvelle demande" header button, switched from disabled to a
real `<Link>`.

## Scope decision — 3-step wizard, only step 1 was fetched
The Banani mockup ships a horizontal 3-step stepper ("1. Informations du
bien" / "2. Budget" / "3. Contact") but the fetched HTML only contains **step
1's** form fields (type de bien, transaction, localisation, caractéristiques,
équipements, priorité, notes) — steps 2/3 render as pending circles in the
stepper with no markup of their own (same situation `publier-annonce-alt` was
in for its wizard steps). Implemented as a real gated wizard (`step` state,
one step visible at a time, top stepper bar with done/active/pending circles
— reproduced 1:1 from Banani for step 1's chrome) with steps 2 and 3
authored to match the established form-card visual language, not fetched:
- **Étape 2 — Budget**: budget min/max (FCFA inputs), mode de financement
  (Comptant / Crédit / Les deux — option-card row, same component as step 1's
  type-de-bien cards), délai de recherche (select: Immédiat / 1–3 mois / 3–6
  mois / Flexible).
- **Étape 3 — Contact**: nom du client, téléphone, email, type de client
  (Particulier / Entreprise — option cards), "Comment nous a-t-il connu ?"
  (select), notes commerciales (textarea) — reuses the same `form-card`/
  `form-group`/`form-input` primitives as step 1, no new visual language.

## Component breakdown
- **REUSE** `DashboardShell`, `cn`.
- **NEW** page-local `useState` for every field across the 3 steps (type de
  bien, transaction, pays/ville/quartier/superficie, pièces/chambres/sdb,
  équipements multi-select, priorité, notes bien, budget min/max,
  financement, délai, contact fields, type de client, source, notes
  commerciales) + `step: 1 | 2 | 3`.
- No new primitives — option-card/pill/select/textarea markup follows the
  same Tailwind utility patterns already used in `/alertes/new` and
  `/listings/new`.

## Token mapping
Same Tailwind/brand mapping as the rest of the app. No new `@theme` entries.

## Responsive plan
- **Base (375px)**: stepper bar wraps the label column below each circle on
  narrow screens (connector lines shrink), option-card rows wrap
  (`flex-wrap`), form grids collapse to 1 column, footer bar buttons stack
  full-width.
- **lg (1024px+)**: 2/3-column form grids, footer bar single row — matches
  the Banani desktop mockup.

## Interactions / state
- Full 3-step wizard is real client state — every selection reflected live,
  "Étape précédente"/"Continuer" navigate between steps, back button hidden
  on step 1.
- "Annuler" — real `Link` back to `/demandes`.
- "Enregistrer en brouillon" and the final step's "Créer la demande" — inert,
  `disabled` + "Bientôt disponible" (no `PropertyRequest` model to persist
  to), same convention as every sibling screen.

## Open questions for user
None — same explicit "front-end only, static data" scope repeated by the
user across every screen this session. Steps 2/3 content is an explicit,
disclosed design decision (not fetched from Banani) since only step 1 was
provided — flag for the user to review if the actual Banani steps 2/3 differ.
