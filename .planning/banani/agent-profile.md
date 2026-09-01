# Agent Profile (public) — Banani → Next.js/Tailwind

## Source
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`)
- Banani screen ID: `iDJ4_lMctP6I` ("Agent Profile", page title "Habitat-Afrik — Profil Agent")
- Fetched: 2026-08-07. First two fetch attempts (unargued selection call, then a
  mis-copied ID `gGnzftxGBVCh`) returned wrong screens ("Account Settings" /
  "Contact Mobile") — flagged to user each time, third attempt with the ID from
  the browser URL bar (`?activeScreenId=iDJ4_lMctP6I`) confirmed the correct
  screen.

## Scope
Front-end only, static data — no `Agent` detail model, no reviews/listings
backend. Same convention as every public screen this session.

## Route
`frontend/src/app/agents/[id]/page.tsx` — dynamic segment present (matches the
`annonces/[id]` convention) but **ignored**: always renders the one literal
agent profile from the Banani fetch (Kofi Atta), same documented limitation as
`annonces/[id]`. Building distinct full profiles (bio/reviews/listings) for
the other 7 agents in the `/agents` directory would mean fabricating content
Banani never provided — out of scope for a literal reproduction.

## Component breakdown
- **REUSE** `PublicNavbar` (`active="agents"`), `PublicFooter` — unchanged.
- **NEW**: gradient hero (sky→navy, matches `/agents` hero gradient) — avatar
  + online dot, cert badge, name, role, rating, 4-badge row, CTA pair
  (Appeler/Message), 6-stat row.
- Sticky tabs bar (À propos / Annonces (18) / Avis clients (143) /
  Disponibilités) — only "À propos" content is literal from the fetch; the
  other 3 tabs are visual only (Banani screen is a single static state).
- Left column: about card (bio + 6 specialty chips), 4-stat card, "Annonces
  récentes" card (4 literal listing cards), "Avis clients récents" card (3
  literal reviews).
- Right column (sidebar): contact card (phone/email fields + 3 CTA buttons),
  info card (7 rows: pays/ville/langues/expérience/membre depuis/certifié
  depuis/KYC), rating summary (score + 5-bar breakdown), map placeholder card.

## Token mapping
Same brand/Tailwind mapping as other public pages (`teal`/brand primary maps
to the project's existing `bg-brand` token used by `PublicNavbar`; Banani's
`--primary: #2563EB` here is a per-screen theme, not the project's actual
brand color — translate to the project's `brand` Tailwind token, not a raw
hex, to stay consistent with every other public page built this session).

## Responsive plan
- **Base (375px)**: hero stacks avatar/info/CTA vertically, centered; badge
  row wraps; 6-stat row becomes 2-col grid; tabs bar horizontally scrollable;
  main layout single column (about → stats → annonces → avis → contact card →
  info card → rating → map, sidebar content moves below the main content);
  annonces grid `grid-cols-1`.
- **sm (640px+)**: annonces grid `grid-cols-2`; stat rows `grid-cols-4`.
- **lg (1024px+)**: 2-col layout (`1fr 340px`) matching the Banani desktop
  mock — sidebar becomes a real right column.

## Interactions / state
- Tabs are inert (`title="Bientôt disponible"`) except visually showing
  "À propos" active — no per-tab content exists in the fetched screen.
- All CTAs (Appeler, Envoyer un message, Facebook Messenger, "Voir les 18
  annonces →", "Voir les 143 avis →", "Voir sur la carte →") stay inert —
  no matching backend/feature.
- Breadcrumb "Agents certifiés" links back to `/agents`; "Kofi Atta" crumb is
  the current page (inert).

## Wiring
`frontend/src/app/agents/page.tsx`: the "Profil" button on the Kofi Atta
featured card (and, per this session's link-everything-that-has-a-target
convention, every agent card's "Profil" button) becomes a real `Link` to
`/agents/${agent.id}` — same documented limitation as `annonces/[id]` (the
target page ignores the id and always shows Kofi Atta).

## Open questions for user
None blocking — conventions here mirror `annonce-detail-alt` /
`agents-certifies` exactly (literal single-agent detail page, ignored dynamic
segment, real link wiring from the listing). Proceeding on that basis.

## Implementation checklist
- [ ] Build `frontend/src/app/agents/[id]/page.tsx`
- [ ] Wire `agents/page.tsx` "Profil" buttons → `/agents/${agent.id}`
- [ ] 375px check
- [ ] 768px check
- [ ] 1280px check — compare against Banani desktop mock
- [ ] `pnpm exec tsc --noEmit` / `eslint` / `prettier --write`
- [ ] Update `STATUS.md`
