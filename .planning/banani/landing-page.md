# Landing Page — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `YKST5vLCMORh` ("Landing Page", page title "Habitat-Afrik — Accueil")
- Flow: **"Ulrich Projet 2"** (`E_uHv0vTnPhR`) — a *different* Banani flow than
  the "HABITATAFRIK EQUIPE" flow used for every prior screen this session
  (agent dashboard). This is the **public marketing homepage** (unauthenticated
  visitors), not part of the agent back-office.
- Fetched: 2026-08-05. First fetch attempt returned the wrong screen
  ("Nouvelle Demande" step 3, same flow) — user re-selected in Banani and the
  re-fetch confirmed `screenName: "Landing Page"`.

## Scope
Front-end only, static data — no listings/agents/countries Prisma models, no
API wiring. Same "front-end only, static data" convention as every other
screen this session, applied to a public page instead of the agent dashboard.

## Route
`frontend/src/app/page.tsx` — **replaces** the existing `redirect('/login')`.
This is the kit's actual homepage slot (not wrapped in `DashboardShell`,
which is agent-dashboard-only chrome). Own navbar + footer, matching the
Banani mockup's public marketing layout.

## Component breakdown (single page, 8 sections, top to bottom)
1. **Navbar** — brand mark, 5 nav links (Accueil active/Annonces/Agents/
   Demande/Comment ça marche), Connexion + "Publier une annonce" CTA.
2. **Hero** — full-bleed background image, eyebrow/title/subtitle, 4-country
   pill strip (🇧🇯🇹🇬🇨🇮🇸🇳), floating rounded search panel (pays/ville/type/
   transaction/bouton) overlapping the hero bottom edge.
3. **Stats band** — brand-colored rounded band, 3 stats (2 400+ annonces,
   4 pays, 100% documents vérifiés).
4. **Premium listings** — section header + 5 pill-tab filters (Toutes/
   Maisons/Appartements/Terrains/Location), 6-card grid (literal Banani
   data: Villa duplex Cocody/Appartement Dakar/Maison Cotonou/Terrain
   Calavi/Studio Abomey-Calavi/Villa Cotonou), "Voir toutes les annonces"
   ghost pill.
5. **Destinations by country** — 4 country cards (Bénin/Togo/Côte d'Ivoire/
   Sénégal), each with hero image, flag, city list, copy, 2 stat tiles,
   "Explorer" link.
6. **Agents** — 1 large "featured agent" editorial card (Kofi Atta) +
   3 compact agent cards (Aminata Sarr/Kodjo Mensah/Nadège Ahouanvoéébla),
   "Découvrir tous les agents" ghost pill.
7. **How it works** — 3-step icon grid (Cherchez/Contactez/Concluez).
8. **CTA band** — gradient card, headline + 2 actions.
9. **Footer** — 4-column (brand+social/Plateforme/Pays/Aide), bottom bar
   (copyright + FR/EN/Conditions/Confidentialité).

All images use the literal Banani-hosted URLs (`storage.googleapis.com/
banani-generated-images/...`, `banani-avatars/...`) via plain `<img>` tags —
same convention as `contacts-recus`/`demande-detail` avatar images, no
`next/image` domain config needed.

## Token mapping
Reuses the existing Tailwind brand token (`bg-brand`/`text-brand` = Banani's
`--primary` `#376BFF`-equivalent already wired app-wide). Success badges →
emerald, "Exclusif" badge → amber (one-off per mockup), dark badges →
`bg-black/70` overlay pills.

## Responsive plan
- **Base (375px)**: navbar collapses to brand + Connexion only (nav-links
  hidden, "Publier une annonce" hidden below `lg:` — no hamburger menu for
  the public page since it wasn't in the Banani fetch and this is a
  single-purpose landing page, not an app shell); hero title/search panel
  stack and shrink; listings/country/agent grids all `grid-cols-1`; stats
  band `grid-cols-1`; how-it-works `grid-cols-1`.
- **lg (1024px+)**: full desktop layout matching the Banani mockup — 3-col
  stats, 3-col listings, 4-col countries, 4-col agents (1 wide + 3 stacked
  via the editorial grid), full navbar.

## Interactions / state
- **Listing pill-tabs (Toutes/Maisons/Appartements/Terrains/Location)** —
  real client-side filter (`useState`) over the 6 static listing cards,
  inferred type/transaction tags per card (disclosed: Banani's cards only
  carry status badges, not explicit filter-category tags — categories
  inferred from each listing's title/badges).
- **Connexion** — real `Link` to `/login` (existing route).
- Search panel fields + "Rechercher" button, all nav links except
  Connexion, "Publier une annonce", every listing "Voir →", "Voir toutes
  les annonces", country "Explorer" links, agent "Voir le profil →" /
  "Découvrir tous les agents", CTA "Explorer les annonces"/"Publier une
  annonce" — inert, `disabled`/non-interactive `span` styling (no public
  listings-search, signup, or agent-profile routes exist yet) — same
  "Bientôt disponible" convention via `title` attribute where the element
  is a real `<button>`; plain anchors without a destination are rendered as
  non-clickable `<span>`-styled elements instead of dead `<a href="#">`.

## Open questions for user
None — same explicit "front-end only, static data" scope. Flagged: this
page belongs to a different Banani flow ("Ulrich Projet 2") than every
other screen built this session ("HABITATAFRIK EQUIPE") — visually
consistent (same brand/colors) but a separate design source, worth noting
in case future public-site screens come from this second flow too.
