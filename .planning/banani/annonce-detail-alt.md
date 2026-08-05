# Annonce Detail Alt (public) — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `cPiety0AK_J3` ("Annonce Detail Alt", page title "Habitat-Afrik — Villa duplex standing haut de gamme")
- Flow: "Projet Propré" (`m2kVFGxniJZl`) — same flow as every public-site
  screen this session.
- Fetched: 2026-08-05, clean on first attempt, no mismatch.

## Scope
Front-end only, static data — no `Listing`/`Agent` model, no matching/
contact backend. Same convention as every screen this session.

## Route
`frontend/src/app/annonces/[id]/page.tsx` — dynamic segment present (future
model swap will read `params.id`), but this pass ignores it and always
renders the same literal villa detail (only one fetched Banani screen for
this feature so far).

## Component breakdown
- **REUSE** `PublicNavbar` (`active="annonces"`), `PublicFooter`. The mock's
  navbar omits the "Demande" link (4 links vs the shared component's 5) and
  its footer's "Plateforme" column has 3 links vs the shared component's 4
  ("Nos services" extra) — kept the shared components as-is per this
  session's site-wide-consistency convention rather than forking them per
  screen.
- Full-bleed hero gallery (1 large image + 2 stacked side images, dark
  navy background), save/share buttons, photo-count pill, "+6 photos"
  overlay on the second side image.
- Title block: transaction/verified/ref badges, big price (FCFA + € approx),
  H1, location row, 4-item stats strip (vues/publié/favoris/mis à jour).
- Caractéristiques: 8-item icon/value/label grid (chambres, SdB, surface,
  terrain, niveaux, garages, année, titre foncier).
- Équipements: 12-item icon+label grid.
- Description: 2-paragraph text (literal), "Lire la suite" expand/collapse.
- Localisation: static map image + address disclosure line.
- Annonces similaires: 3 literal cards (image, badge, title, location,
  price).
- Sidebar: price+agent+CTA card (agent avatar/name/cabinet/rating/annonces
  count, 3 action buttons, report link), quick-message mini form, meta info
  card (référence/date/type/transaction/titre foncier/disponibilité).

## Token mapping
This screen ships its own theme in the Banani payload (`Habitat Blue`:
`--primary: #0EA5E9`, `--background: #F5F6F8`, `--success: #22C55E`) which
matches the app's existing brand token closely enough — reused
`bg-brand`/`text-brand` throughout rather than introducing a new token.
Page background is the mock's literal `#F5F6F8` (not the app's default
white), kept as a one-off `bg-[#F5F6F8]` on the page root since every other
public page here uses white and this detail page's mock deliberately uses a
grey canvas to make the white cards pop.

## Responsive plan
- **Base (375px)**: hero gallery stacks (main image full width ~260px tall,
  side images stack below at ~130px each), detail layout single column
  (sidebar below main content, no longer sticky), feature/amenity grids
  drop to 2 columns, similar-listings grid `grid-cols-1`.
- **lg (1024px+)**: hero gallery fixed 420px height 2-col grid, detail
  layout `1fr 360px` with sticky sidebar, feature grid 4-col, amenities
  3-col, similar listings 3-col — matches the Banani desktop mockup.

## Interactions / state
- **Real save toggle**: heart button on the hero fills red + label switches
  "Sauvegarder" ↔ "Sauvegardé" (local `useState`, no persistence).
- **Real description expand**: "Lire la suite"/"Voir moins" toggles the
  second description paragraph, chevron rotates.
- **Real form state**: quick-message sidebar form (nom/téléphone/message)
  is fully controlled, but "Envoyer" stays inert (`title="Bientôt
  disponible"`) — no contact/messaging model to submit to.
- Everything else inert: partager, "Voir les 8 photos", "+6 photos"
  overlay, similar-listing cards (no per-listing route yet), contacter/
  appeler l'agent, demander une visite VR, signaler cette annonce.

## Open questions for user
None — same explicit "front-end only, static data" scope. Disclosed: the
route takes a dynamic `[id]` segment for future reuse, but this pass always
renders the one literal villa from the fetched screen regardless of `id`
since no `Listing` lookup model exists yet.
