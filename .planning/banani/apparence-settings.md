# Apparence — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `X9QIFjiEhetp` ("Apparence Settings"), fetched live via MCP 2026-07-31.
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`).

## Scope decision
Same convention as the immediately-preceding "Langue & région" tab, applied
without re-asking since the shape of the decision is identical and was
already confirmed once this session: **real, persisted, but dormant**.
Concretely for this screen: theme (Clair/Sombre/Système), accent color, font
size, density, sidebar style, and 3 animation toggles are all saved for
real on the `User` row — but none of them actually change how the app
renders yet. This starter ships zero dark-mode CSS (`dark:` Tailwind
variants) anywhere in the codebase, and wiring a real light/dark/system
theme switch would touch every page and component (a cross-cutting design
system change, not a settings-tab change) — genuinely out of scope for a
single tab pass, unlike "Langue & région" where the dormant gap was just a
missing i18n library. Flagged explicitly in the component copy and the plan
below, not silently implied.

## System context
- No visual-preference fields exist on `User` before this pass.
- Kept as its own route (`/api/preferences/appearance`), separate from
  `/api/preferences/regional` added for the previous tab — different
  settings card, different concern, even though both eventually land on the
  same `User` row (same pattern already established between
  `/api/auth/me` and `/api/preferences/regional`).

## Prisma changes
Add to `User` (migration `13_add_appearance_preferences`, all with
defaults so existing rows don't need backfill):
- `theme` — default `'LIGHT'` (`LIGHT|DARK|SYSTEM`)
- `accentColor` — default `'#376BFF'` (hex string, free-form — not
  restricted to the mockup's swatch list so a custom color still round-trips)
- `fontScale` — default `'NORMAL'` (`SMALL|NORMAL|LARGE`)
- `density` — default `'NORMAL'` (`COMPACT|NORMAL|SPACIOUS`)
- `sidebarStyle` — default `'EXPANDED'` (`EXPANDED|COMPACT`)
- `animationsEnabled` — `Boolean` default `true`
- `hoverEffectsEnabled` — `Boolean` default `true`
- `reduceMotion` — `Boolean` default `false`

## Component breakdown
- **NEW** `frontend/src/app/api/preferences/appearance/route.ts` — `GET`/`PATCH`,
  same partial-update shape as `/api/preferences/regional`.
- **NEW** `frontend/src/components/settings/AppearanceCard.tsx` — 6
  sub-sections mirroring the mockup (Thème/Couleur d'accentuation/Typographie/Densité/Barre
  latérale/Animations). Theme, font size, density, sidebar-style and accent
  swatch selections save immediately on click (matches the mockup's
  pick-a-card interaction and the pattern used by `LanguageRegionCard`); the
  3 animation toggles batch-save via one "Enregistrer" button (matches
  `NotificationsCard`'s pattern, and the mockup's own dedicated footer on
  that specific card).
- Update `SettingsSideNav.tsx`: "Apparence" moves from
  `PREFERENCE_INERT_ITEMS` (now empty) to `PREFERENCE_TABS` — every settings
  sidenav item is now a real tab.
- Update `settings/page.tsx`: extend `SettingsTabKey` with `'apparence'`.

## Responsive plan
Mobile-first: theme grid `grid-cols-1 sm:grid-cols-3`, accent swatches wrap
(`flex-wrap`), density/sidebar-style grids `grid-cols-1 sm:grid-cols-2`(-`3`).

## Implementation checklist
- [ ] Prisma migration `13_add_appearance_preferences`
- [ ] `GET`/`PATCH /api/preferences/appearance` + tests
- [ ] `AppearanceCard` component
- [ ] Wire `'apparence'` tab into `SettingsSideNav` + `settings/page.tsx`
- [ ] `pnpm format && lint && typecheck && test`
- [ ] Update `.planning/banani/STATUS.md`

## Open questions for user
None outstanding — this is the last of the 5 explicitly-ordered menu items;
scope mirrors the immediately-preceding tab's already-confirmed decision.
