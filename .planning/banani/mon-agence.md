# Mon Agence — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `VBgNL9FWcpGQ` ("Mon Agence"), fetched live via MCP 2026-07-30.
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`).

## Scope decision (confirmed with the user)
Full feature, shipped iteratively:
- **Phase 1 (this pass)**: agency identity (name, type, address, phone, email,
  website, description, social handles) + zones d'activité (country → list of
  cities). Both real, persisted.
- **Phase 2 (later, not this pass)**: logo upload (needs Cloudinary wiring),
  team management (invite by email, member roles/status). The "Équipe de
  l'agence" card and the logo box both render as disabled "Bientôt
  disponible" placeholders in phase 1 — not fabricated data.
- The 4 stat chips (34 annonces / 6 membres / 4 pays / 97% satisfaction) are
  Banani's illustrative numbers. Only "Pays couverts" can be made real cheaply
  (count of `zones` entries) without extra scope — the other 3 need
  Listing↔Organization linking and real team data that don't exist yet, so
  they stay as clearly-flagged placeholders (same convention as the Agent
  Dashboard's KPI cards — see STATUS.md).

## System context
- No agency/organization concept exists for a user today — `Organization` +
  `OrganizationMember` are generic multi-tenancy primitives (opt-in, unused
  by any route yet). Reusing `Organization` for "my agency" fits exactly what
  it was built for (owner + members), rather than inventing a parallel model.
- No Organization row exists for any user yet — find-or-create on first save
  (a `OWNER_AGENT` user who never touched Mon Agence has no org; the first
  `PATCH` creates one, owned by them, using the existing `ensureUniqueSlug` +
  `slugify` helpers from `lib/server/slug.ts`).
- Auth: phase 1 has no team members yet, so gating is simply "the org owned
  by this user" — no `requireOrgRole` needed (that's for param-based org
  routes with real multi-member access control, which lands in phase 2).
- Route: `GET`/`PATCH /api/organizations/me` (singular — "my agency", not a
  generic org-by-id route; avoids needing an org id in the URL for what is,
  in phase 1, a 1:1 owner↔org relationship).

## Prisma changes
Add to `Organization` (nullable `String`/`Json`, migration `9_add_agency_fields`):
`description`, `agencyType`, `address`, `phone`, `email`, `website`,
`rccmNumber`, `facebookHandle`, `instagramHandle`, `linkedinHandle`,
`whatsappNumber`, `zones` (`Json`, default `[]`, shape
`{ country: string; cities: string[] }[]`).

## Component breakdown
- **NEW** `frontend/src/components/settings/AgencyCard.tsx` — identity form
  (name/type/address/phone/email/website/description/socials), logo box as
  disabled placeholder.
- **NEW** `frontend/src/components/settings/AgencyZonesCard.tsx` — list of
  country→cities rows, add/edit/remove (edit-in-place, not a modal — simpler
  and matches the row-level "Modifier" affordance in the mockup).
- **NEW** `frontend/src/components/settings/AgencyTeamCard.tsx` — static
  disabled placeholder card ("Bientôt disponible — invitations d'équipe").
- Update `SettingsSideNav.tsx`: "Mon agence" becomes a real tab (remove from
  `AGENCY_ITEMS` inert list, add to a tab-switching set); Documents
  légaux/Abonnement & paiement stay inert for now.
- Update `settings/page.tsx`: extend `SettingsTabKey` with `'agence'`.

## Responsive plan
Same pattern as the Settings Page cards: mobile-first single column, form
rows `md:grid-cols-2`, zone rows stack the "Modifier" button below the
content on mobile.

## Implementation checklist
- [ ] Prisma migration `9_add_agency_fields`
- [ ] `GET`/`PATCH /api/organizations/me` + tests (find-or-create, zones
      validation, ownership check)
- [ ] `AgencyCard`, `AgencyZonesCard`, `AgencyTeamCard` (placeholder)
- [ ] Wire `'agence'` tab into `SettingsSideNav` + `settings/page.tsx`
- [ ] `pnpm format && lint && typecheck && test`
- [ ] Update `.planning/banani/STATUS.md`

## Open questions for user
None outstanding — phase boundary (identity+zones now, logo+team later) and
stat-chip honesty were confirmed before writing this plan.
