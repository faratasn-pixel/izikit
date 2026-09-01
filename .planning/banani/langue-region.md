# Langue & Région — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `ptEwwpnr4m_M` ("Langue Région"), fetched live via MCP 2026-07-30.
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`).

## Scope decision (confirmed with the user)
Much simpler surface than the prior three tabs (no payment, no upload) —
just user preferences to persist. Confirmed: **real, persisted, but
dormant** — same convention as the 5 notification toggles shipped in the
base Settings Page pass. No i18n library (`next-intl` or similar) exists in
this starter, so picking "Anglais" saves the preference for real but does
not actually translate any UI text yet; the same is true for date/number
format (nothing in the app currently formats a date/number based on this
setting). This is stated in the component copy, not silently implied.

## System context
- `User.city`/`User.country` already exist (added in the base Settings Page
  pass for the Profil card's free-text bio fields). Reused here for "Ville
  par défaut"/"Pays principal" rather than adding duplicate columns — same
  underlying concept (where the user/agent is based), avoids two
  independently-drifting "country" fields on the same row. Documented here
  so it doesn't read as an accidental collision.
- New fields needed: `locale`, `timezone`, `currency`, `dateFormat`,
  `numberFormat` — none of these existed before.
- Kept separate from `PATCH /api/auth/me` (the Profil card's route) — that
  route is explicitly about identity/bio fields; mixing in 5 more
  regional-preference fields would blur what each settings card owns even
  though they land on the same `User` row under the hood.

## Prisma changes
Add to `User` (migration `12_add_regional_preferences`, all `String` with
defaults so existing rows don't need backfill):
- `locale` — default `'fr'` (`fr|en|pt|wo|fon|dyu`)
- `timezone` — default `'Africa/Cotonou'` (free-form IANA string, not
  validated against a full tz database — out of scope to ship one)
- `currency` — default `'XOF_UEMOA'` (`XOF_UEMOA|XAF_CEMAC|GHS|NGN` — the 4
  options in the mockup; UEMOA and CEMAC both display "FCFA" but are
  distinct currency unions, kept as distinct keys)
- `dateFormat` — default `'DMY'` (`DMY|MDY|YMD`)
- `numberFormat` — default `'SPACE'` (`SPACE|COMMA|DOT` — thousands
  separator style)

## Component breakdown
- **NEW** `frontend/src/app/api/preferences/regional/route.ts` — `GET`
  returns the 7 fields (5 new + `city`/`country`); `PATCH` validates via Zod
  enums, partial update (only provided fields change), writes straight to
  `User`.
- **NEW** `frontend/src/components/settings/LanguageRegionCard.tsx` — 4
  sub-sections mirroring the mockup's 4 separate cards (Langue, Fuseau &
  Région, Devise, Formats), each with its own "Enregistrer" button calling
  the same `PATCH` endpoint with only that section's fields (matches the
  mockup's per-card save affordance rather than one giant form).
- Update `SettingsSideNav.tsx`: "Langue & région" moves from
  `PREFERENCE_ITEMS` to a real tab.
- Update `settings/page.tsx`: extend `SettingsTabKey` with `'langue'`.

## Responsive plan
Mobile-first: language grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`,
currency grid `grid-cols-2 lg:grid-cols-4`, date/number format option rows
wrap (`flex-wrap`) instead of a fixed 2-column row on mobile.

## Implementation checklist
- [ ] Prisma migration `12_add_regional_preferences`
- [ ] `GET`/`PATCH /api/preferences/regional` + tests
- [ ] `LanguageRegionCard` component (4 sub-sections)
- [ ] Wire `'langue'` tab into `SettingsSideNav` + `settings/page.tsx`
- [ ] `pnpm format && lint && typecheck && test`
- [ ] Update `.planning/banani/STATUS.md`

## Open questions for user
None outstanding — scope (real+persisted but dormant, no i18n wiring) and
the `city`/`country` field reuse were confirmed before writing this plan.
