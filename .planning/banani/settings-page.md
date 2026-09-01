# Settings Page — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `OH2_l1aYeEhL` ("Settings Page")
- Fetched: 2026-07-30 (live MCP call — subscription still active)
- Flow: `HABITATAFRIK EQUIPE` (`DRXBZMH20_G8`)
- Archived slug `settings-page` in `.planning/banani/raw/` predates this fetch and may have a different `screenId` — this session's fetch is the source of truth.

## System context (read before coding)
- Existing route: `frontend/src/app/settings/page.tsx` — a bare-bones (no DashboardShell, no Banani styling) page that already does two REAL things: change/set password (`PUT /api/auth/change-password`, `POST /api/auth/set-password`) and Google OAuth linking. This gets replaced, not deleted-and-rebuilt-from-scratch — its working logic is preserved and re-skinned, plus Facebook linking added (route already exists, see prior session).
- `DashboardShell` (`frontend/src/components/dashboard/DashboardShell.tsx`) already has a `'settings'` `NavKey` wired in both the desktop sidebar and mobile bottom nav — just wrap the page body in `<DashboardShell active="settings">`.
- `GET /api/auth/me` already returns `hasPassword`, `linkedProviders`, `phone`, `name`, `avatarUrl`, `accountType`. Needs to also return `city`, `country`, `bio` (new columns, see below).
- `GET`/`PATCH /api/notifications/prefs` already exists (free-form JSON `{ eventType: { email, inApp } }`, deep-merge semantics). No `PATCH /api/auth/me` exists yet for profile fields — new route.
- No 2FA, no KYC, no session-tracking model, no self-service deactivate/delete route exist today.

## Decisions confirmed with the user (2026-07-30)
1. **2FA / identity verification**: no real system exists → render both as disabled "Bientôt disponible" blocks, not fake "Activé"/"Vérifié" badges.
2. **Active sessions**: no per-device tracking, but a real global-invalidation primitive already exists (`tokenVersion` bump, used by `change-password`). Ship a real **"Déconnecter tous les autres appareils"** button — new endpoint bumps `tokenVersion` and reissues cookies for the *current* session only, so all other devices are logged out for real. Don't fabricate a device list.
3. **Notification toggles**: the 5 Banani toggles (nouveaux messages, demandes de visite, statut annonces, rappels de visites, newsletter) map to features that don't exist yet (Messages, Visites). Ship them as **real toggles** wired to the existing `/api/notifications/prefs` API under made-up-but-stable `eventType` keys (`message.new`, `visit.requested`, `listing.status_changed`, `visit.reminder`, `newsletter`) — they persist for real today and take effect automatically once Messages/Visites ship (no rework needed).
4. **Danger zone**: build both for real.
   - **Désactiver** → new self-service endpoint sets `status: SUSPENDED` (same status enum the admin back-office uses; reversible only by a SUPERADMIN via the existing `/api/admin/users/[id]/status` route — consistent, no new status value). Requires current-password confirmation. Guards against the sole active SUPERADMIN locking themselves out (mirrors the "can't demote the last SUPERADMIN" invariant).
   - **Supprimer définitivement** → **anonymization**, not a literal SQL `DELETE FROM "User"`. Several FKs are intentionally `onDelete: Restrict` (`AdminAction.actorId`, `Organization.ownerId`, `Withdrawal.userId`) to protect the audit/financial trail — hard-deleting the row would throw or silently need to cascade-delete audit history, which the project's own design forbids. Instead: wipe PII (email → `deleted-<id>@deleted.invalid`, phone/name/avatarUrl/city/country/bio → null, passwordHash → null), delete `OAuthAccount` + `VerificationCode` rows, set `status: SUSPENDED`, bump `tokenVersion`. Orders/Withdrawals/Listings/AdminAction rows referencing the user survive untouched (financial/audit integrity), just now point at an anonymized shell. This is disclosed explicitly in the UI copy ("vos données personnelles sont effacées ; l'historique de transactions est conservé conformément aux obligations comptables") so it isn't a silent surprise. Requires current-password confirmation.
5. **Profile fields**: add real `city`, `country`, `bio` columns (nullable `String`) via a new Prisma migration. `name` stays a single column (unchanged) — the edit form splits it into Prénom/Nom on the client only (split on first space) and rejoins on save, mirroring how signup already builds `name` from `firstName + ' ' + lastName`.

## Structure map
- **Profile card** — avatar (upload button is a no-op placeholder, no Cloudinary wiring in this pass — flagged), Prénom/Nom, Email (read-only, changing email isn't in scope), Téléphone, Ville, Pays (plain text input, not a real country picker), Bio (textarea). Save → `PATCH /api/auth/me`.
- **Security card** — password change/set (existing logic, re-skinned), OAuth linked accounts (Google + Facebook, existing logic + Facebook add-on), 2FA placeholder, identity-verification placeholder, "Déconnecter tous les autres appareils" (new, real).
- **Notifications card** — 5 real toggles → `PATCH /api/notifications/prefs`.
- **Danger zone card** — Désactiver / Supprimer, both real, both gated by a password-confirmation modal.

## Component breakdown
- **NEW** `frontend/src/components/settings/SettingsSideNav.tsx` — the persistent `.settings-sidenav` from the Banani mockup (Compte/Agence/Préférences groups). Missed in the first implementation pass (flagged by the user after review) — added as a follow-up. "Compte" entries (Profil/Sécurité/Notifications) are in-page anchor links (`#profil`/`#securite`/`#notifications`) since all 3 sections render on one continuously-scrolling page rather than switching per-tab; Agence/Préférences entries point to screens that don't exist yet (`mon-agence`, `documents-legaux`, `abonnement-paiement`, `langue-region`, `apparence-settings` — still Pending in STATUS.md) and render inert with the same "Bientôt" convention as `DashboardShell`.
- **NEW** `frontend/src/components/settings/ProfileCard.tsx`
- **NEW** `frontend/src/components/settings/SecurityCard.tsx` (subsumes the old page's password + linked-providers logic)
- **NEW** `frontend/src/components/settings/NotificationsCard.tsx`
- **NEW** `frontend/src/components/settings/DangerZoneCard.tsx`
- **NEW** `frontend/src/components/settings/PasswordConfirmModal.tsx` — reusable, used by both danger-zone actions
- **NEW** `frontend/src/components/ui/Toggle.tsx` — primitive toggle switch (used 5× in Notifications card); extract now since it repeats immediately (rule of three is a floor, not a ceiling)
- **REUSE** `Button`, `TextField` (`src/components/ui/`), `DashboardShell`

## Token mapping (Banani → project)
| Banani | Project |
|---|---|
| `--primary: #376BFF` | already matches `brand` token used elsewhere in the app (verify against `tailwind`/`globals.css` `@theme`) |
| `--radius-xl: 12px` (cards) | `rounded-xl` |
| `--radius-lg: 8px` (inputs/buttons) | `rounded-lg` |
| `.settings-card` padding `28px 28px 24px` | `p-7 pb-6` |
| `.toggle-switch` 40×22 pill | custom `Toggle` primitive, `w-10 h-[22px]` |
| `.status-badge-green` | `bg-emerald-50 text-emerald-700` pill (already used in the old settings page for "Lié") |
| Sora font (card titles) | `font-sora` (already configured, used in dashboard) |

## Responsive plan
- **Base (375px)**: single column. Settings side-nav (Profil/Sécurité/... sub-tabs shown in Banani) collapses to a horizontal scrollable pill row above the content (mirrors the `.tab-pill` pattern STATUS.md already documents for other settings-mobile screens), OR simplest: **no sub-nav at all** — since all sections render on one continuously-scrolling page (this Banani screen doesn't actually switch content on tab click, it's all static sections), the sub-nav becomes a set of in-page anchor jump links. Cards stack full-width, avatar row stacks (image above name/meta/button), form rows go 1-column (`grid-cols-1`), card footers' buttons go full-width and stack.
- **md (768px)**: form rows become 2-column (`md:grid-cols-2`), card footer buttons go inline again.
- **lg (1024px+)**: matches Banani desktop — `DashboardShell`'s real sidebar appears, settings sub-nav becomes the persistent left rail exactly as in the mockup.
- Touch targets ≥48px on toggles/buttons at all sizes.

## Interactions / state
- Toggle: instant optimistic flip + `PATCH`, revert + toast on failure.
- Profile/Notifications save buttons: disabled while submitting, toast on success/failure (existing `useToast()`).
- Danger zone buttons open `PasswordConfirmModal`; wrong password shows inline error, doesn't close modal.
- Empty/loading state: page shows a lightweight skeleton (existing pattern: `if (!user) return null` via `useUser()`, since `DashboardShell` already handles the null case).

## Copy / i18n
All labels in French, inline in JSX (project doesn't centralize auth-adjacent strings in `constants.ts` beyond the phone dial code — matches the pattern already used in `signup/page.tsx` and `dashboard/page.tsx`).

## Implementation checklist
- [ ] Prisma migration: `city`, `country`, `bio` nullable `String` columns on `User`
- [ ] `PATCH /api/auth/me` (profile update) + tests
- [ ] `POST /api/auth/sessions/revoke-others` + tests
- [ ] `POST /api/auth/deactivate` (password-confirmed, last-SUPERADMIN guard) + tests
- [ ] `POST /api/auth/delete-account` (password-confirmed, anonymization) + tests
- [ ] `Toggle` UI primitive
- [ ] `ProfileCard`, `SecurityCard`, `NotificationsCard`, `DangerZoneCard`, `PasswordConfirmModal`
- [ ] Rewrite `frontend/src/app/settings/page.tsx` to compose the 4 cards inside `DashboardShell`
- [ ] 375px / 768px / 1280px checks in a real browser
- [ ] `pnpm format && lint && typecheck && test`

## Open questions for user
- None outstanding — all flagged ambiguities were resolved in the pre-plan Q&A (2FA/KYC placeholder, real session-revoke, real notification toggles, real danger zone via anonymization, real city/country/bio columns).
