# Blog Habitat (public) — Banani → Next.js/Tailwind

## Source
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`)
- Banani screen ID: `AJtmwyzNUKon` ("Blog Habitat", page title "Habitat-Afrik — Blog")
- Fetched: 2026-08-07. Fetched directly by ID (lesson learned from `agent-profile.md`) — correct screen on first try.

## Scope
Front-end only, static data — no `Article`/`Author` model, no CMS. Same
convention as every public screen this session.

## Route
`frontend/src/app/blog/page.tsx`.

## Nav change
The Banani screen's navbar shows `Accueil / Annonces / Agents / Demande /
Blog / Contact` (6 links) vs the project's current 5-link `NAV_LINKS`. Added
`{ key: 'blog', label: 'Blog', href: '/blog' }` to `PublicNavbar.tsx`'s
`NAV_LINKS` (real link, project-wide — every public page now shows "Blog" in
its nav, matching how `annonces`/`agents`/`demande` were added when those
pages shipped). Did **not** add "Contact" — no contact page exists or is in
scope for this session; `PublicNavbar` already tolerates link-set drift
between the Banani mock and the reused component (documented precedent in
`annonce-detail-alt.md`).

## Component breakdown
- **REUSE** `PublicNavbar` (`active="blog"`), `PublicFooter`.
- **NEW**: gradient hero (sky→navy, same family as `/agents`) — eyebrow,
  title, subtitle, search bar (inert).
- Category tabs bar (Tous/Marché/Conseils acheteurs/Juridique & Foncier/
  Investissement/Agents & Pros) — **real filter**, see Interactions.
- Left column: featured article card (image placeholder — see Known gap),
  "Derniers articles" 3-card grid, "Plus d'articles" 4-item list,
  pagination (inert).
- Right sidebar: newsletter card (inert form), "Articles populaires" top-5
  list (inert), tags cloud (inert chips), promo card (inert CTA).

## Known gap — featured article image
The Banani fetch's featured-article `<img>` has a `data-query` (image-gen
prompt) but **no literal `src`** — Banani didn't render/attach an image for
that slot this time (unlike every other article, which has a real
`storage.googleapis.com` URL). Rather than guess a stock photo URL,
rendered a gradient placeholder block (icon + label) in its place. Disclosed
here, not silently invented.

## Token mapping
Brand primary → project's `bg-brand`/`text-brand` token (`#376bff`), same
substitution as every other public page this session (Banani's per-screen
`--primary` here was `#0EA5E9` in the HTML tokens but `#2563EB` in the
`theme` payload — neither is the project's actual brand color, so normalized
to `brand` for consistency with `/agents`, `/annonces`, etc). Category pill
colors (marché=brand, conseils=green, juridique=amber, investissement=
violet, agents=red) kept as distinct semantic colors per the design.

## Responsive plan
- **Base (375px)**: hero text/search stack full-width; category tabs
  horizontally scrollable; featured article image stacks above text
  (`grid-cols-1`); articles grid `grid-cols-1`; list items stack image above
  text on very small screens... actually keep list item image+text
  side-by-side (small fixed image) since it fits at 375px; sidebar moves
  below main content, full width.
- **sm (640px+)**: articles grid `grid-cols-2`.
- **lg (1024px+)**: 2-col page layout (`1fr 320px`) with real sidebar;
  featured article `grid-cols-2` (image beside text); articles grid
  `grid-cols-3` — matches Banani desktop mock.

## Interactions / state
- **Real category filter**: tabs filter the "Derniers articles" grid +
  "Plus d'articles" list by each article's literal category (taken directly
  from the Banani markup's `article-cat` class per card — not inferred).
  The featured article stays pinned/always visible regardless of tab
  (editorial "hero" slot, not part of the filtered set) — authored UX
  choice, disclosed. Tab counts (48/14/11/9/8/6) stay literal from the mock
  per this session's convention (real filter over a small literal sample,
  literal badge counts) — same pattern as `agents-certifies`.
- Empty state text when a category filter yields zero of the 7 filterable
  articles.
- Inert (`title="Bientôt disponible"`): hero search bar, newsletter
  subscribe, popular-articles list, tag chips, promo CTA, pagination,
  "Lire l'article"/"Voir tous les articles →" links, all article card
  clicks (no article detail page/model exists this session).

## Implementation checklist
- [x] Add `blog` to `PublicNavbar` `NAV_LINKS`
- [ ] Build `frontend/src/app/blog/page.tsx`
- [ ] 375px / 768px / 1280px checks
- [ ] `pnpm exec tsc --noEmit` / `eslint` / `prettier --write`
- [ ] Update `STATUS.md`

## Open questions for user
None blocking — same static-data convention as every screen this session;
proceeding with the disclosed assumptions above (nav link addition, featured
image placeholder, category filter scope).
