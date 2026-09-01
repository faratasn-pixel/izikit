# Nouvelle Demande setup 1 (public wizard) — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `10PsPLg0QaiJ` ("Nouvelle Demande setup 1", step 1 of 3
  — "Bien recherché"), page title "Habitat-Afrik — Déposer une demande"
- Flow: "Projet Propré" (`m2kVFGxniJZl`) — same flow as `demande-immobiliere`.
- Fetched: 2026-08-05. First fetch attempt returned "setup 2" (step 2 —
  Budget) instead — flagged to the user, they re-selected, re-fetch
  confirmed `screenName: "Nouvelle Demande setup 1"`.
- **Bonus literal data**: the earlier mis-fetch of "setup 2" (screenId
  `xCJUEvMz6nSD`) is still genuinely step 2 of this same flow/wizard — its
  content is reused here as the literal step-2 screen rather than discarded,
  since it's real Banani data for the correct flow, just fetched one step
  early.

## Scope
Front-end only, static data — no `PropertyRequest` public model, no
matching backend. Same convention as every screen this session.

## Route
`frontend/src/app/demande-immobiliere/nouvelle/page.tsx` — public buyer
wizard, reached from `/demande-immobiliere`'s "Déposer une demande" CTAs
(those stay inert this pass — not wired to this route, since Banani hasn't
shown that link as clickable/real in any fetched screen; can be turned into
a real `Link` in a later pass if requested).

## Component breakdown
- **REUSE** `PublicNavbar` (`active="demande"`), `PublicFooter`.
- **NEW**: breadcrumb (Accueil / Demande immobilière / Déposer une demande),
  page title, 3-step progress bar (Bien recherché / Budget / Contact, with
  done/active/pending circle states + connectors), 2-col grid (form card +
  360px sticky sidebar).
- **Step 1 — Bien recherché** (literal, screenId `10PsPLg0QaiJ`): transaction
  pills (Achat/Location), property-type pills (Villa/Appartement/Terrain/
  Bureau/Commerce), pays+ville selects, quartier input, superficie min/max,
  pièces/chambres min. selects, 6 équipements checkboxes, description
  textarea.
- **Step 2 — Budget** (literal, screenId `xCJUEvMz6nSD`): budget min/max
  inputs, financement pills (Fonds propres/Crédit bancaire/Mixte), budget
  idéal + marge de flexibilité selects, calendrier pills (Immédiat/1-3 mois/
  3-6 mois/6 mois+), frais-à-prévoir checkboxes, préférences textarea, a
  "Conseil Habitat-Afrik" info banner.
- **Step 3 — Contact**: **not fetched for this flow** — authored to match
  the same visual language and field set as the equivalent Contact step
  fetched earlier this session for a *different* flow (`Ulrich Projet 2`'s
  "Nouvelle Demande" screen, step 3): prénom/nom/email/téléphone, pays/ville
  selects, disponibilité select, canal de contact préféré (4 choice-cards),
  "déjà en contact avec un agent" (2 contact-cards), notes textarea,
  2 consent checkboxes. **Disclosed decision**, not literal Banani data for
  *this* flow.
- Sidebar: "Résumé de votre demande" summary card (per-step rows, done/
  active/pending indicators, live-updating from wizard state) + "Conseils"
  tips card (content swaps per step — literal per-step tips from the two
  fetched screens; step 3 tips authored to match).

## Token mapping
Same Tailwind/brand mapping as `demande-immobiliere`. Pill/choice-card
selected state → `border-brand bg-brand/10 text-brand`. Step circles:
done → `bg-brand text-white`, active → `bg-brand text-white` + ring, pending
→ `bg-gray-100 text-gray-400 border border-gray-200`.

## Responsive plan
- **Base (375px)**: 2-col grid collapses to 1 column (form above, summary
  sidebar below, no longer sticky), pill-groups/checkbox-grid wrap, fields-row
  grids collapse to 1 column.
- **lg (1024px+)**: full `1fr 360px` grid, sticky sidebar — matches the
  Banani desktop mockup.

## Interactions / state
- **Real gated wizard**: `step` state (1|2|3), one step's form card visible
  at a time, steps-bar + sidebar summary reflect current step live.
- **Real field state** for every input shown: transaction/property-type
  pills, pays/ville/quartier, superficie min/max, pièces/chambres, 6
  équipements checkboxes, description (step 1); budget min/max, financement
  pills, budget idéal/flexibilité selects, calendrier pills, frais
  checkboxes, préférences (step 2); contact fields, canal préféré,
  agent-connu toggle, notes, consents (step 3) — all local `useState`, no
  persistence.
- Sidebar summary rows are **derived live** from the actual field state
  (not hardcoded), so editing step 1 updates the step-1 summary rows
  immediately — matches the "real interactivity even without backend"
  convention used on the dashboard `nouvelle-demande` wizard earlier.
- "Étape suivante" / "Retour" buttons are real (advance/rewind `step`).
  Final step 3's "Envoyer ma demande" stays inert (`disabled` +
  `title="Bientôt disponible"`) — no `PropertyRequest` model to submit to.
  "Annuler" (step 1) is a real `Link` back to `/demande-immobiliere`.

## Open questions for user
None — same explicit "front-end only, static data" scope. Flagged: step 3
(Contact) is authored, not fetched, for this specific flow — disclosed
above.
