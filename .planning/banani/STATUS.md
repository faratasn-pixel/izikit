# Banani implementation status

Last updated: 2026-08-06

## 2026-08-06 — Mobile hamburger menu added to the public site

User reported: on mobile, the public pages (landing, annonces, agents,
demande-immobilière…) had no way to reach the nav links — `PublicNavbar`'s
`NAV_LINKS` were `hidden lg:flex`, with nothing replacing them below `lg`.
This mirrors the dashboard's earlier mobile-nav gap (see the
`MobileNavDrawer`/`MobileTopbar` work from 2026-08-05), but the public site
had never gotten its own equivalent.

- `frontend/src/components/public/PublicMobileDrawer.tsx` (new): off-canvas
  drawer modeled on the dashboard's `MobileNavDrawer` — dark overlay,
  slide-in panel (`translate-x-0`/`-translate-x-full`), locks
  `document.body.style.overflow` while open, closes on overlay click / X
  button / link click. Renders `NAV_LINKS` (imported from `PublicNavbar`,
  now exported) as real links or an inert "Bientôt" row for entries with no
  `href` (currently just "Comment ça marche"); footer of the drawer has a
  real "Connexion" link and an inert "Publier une annonce" button.
- `PublicNavbar.tsx`: exported `NAV_LINKS`; added `drawerOpen` state and a
  hamburger button (`lg:hidden`, `bg-gray-50` background to match the
  dashboard's mobile topbar icon-button style) that opens the new drawer;
  "Connexion" text link is now `hidden lg:inline` since it moved into the
  drawer's footer on mobile.

Verified: `pnpm exec tsc --noEmit`, `pnpm exec eslint`, `pnpm exec prettier
--write` all pass/clean.

## 2026-08-05 — Internal navigation wired between today's public screens

User asked to "câbler" today's screens. Clarified scope first (asked): real
Next.js `<Link>` navigation between the already-built static pages, not a
backend (no Prisma models / API routes — stays "front-end only, static
data" per every plan file this session).

Changes:
- `PublicNavbar.tsx`: `NAV_LINKS` now carries an optional `href`; Accueil/
  Annonces/Agents/Demande are real `Link`s (`/`, `/annonces`, `/agents`,
  `/demande-immobiliere`); "Comment ça marche" stays inert (no page built
  for it).
- `PublicFooter.tsx`: "Parcourir les annonces" → real `Link` to `/annonces`;
  the rest of `PLATFORM_LINKS`/`COUNTRY_LINKS`/`HELP_LINKS` stay inert (no
  target pages).
- `app/page.tsx` (landing): listing cards "Voir →" → `/annonces/[id]`;
  "Voir toutes les annonces" → `/annonces`; "Découvrir tous les agents" and
  agent cards "Voir le profil →" → `/agents` (no per-agent detail page yet,
  so both point at the directory); country cards "Explorer le {pays}" →
  `/annonces` (no per-country filtered route yet); CTA band "Explorer les
  annonces" → `/annonces`. Hero search panel, country pills, and "Publier
  une annonce" stay inert (no matching feature/page).
- `app/annonces/page.tsx`: grid "Voir →" and list "Voir le détail" → real
  `Link` to `/annonces/[id]` (id passed but the detail page still ignores
  it and always renders the one literal villa — documented limitation).
- `app/demande-immobiliere/page.tsx`: all 3 "Déposer une demande"/"Déposer
  ma demande" CTAs (hero, table header, bottom band) → real `Link` to
  `/demande-immobiliere/nouvelle`; bottom-band "Voir les annonces" →
  `/annonces`. "Voir mes demandes" stays inert (needs auth, doesn't exist).
- `app/annonces/[id]/page.tsx`: gave `SIMILAR` listings stable `id`s, cards
  now real `Link`s to `/annonces/[id]` (self-referential to the same
  literal detail page, same documented limitation as above).

Verified: `pnpm exec tsc --noEmit`, `pnpm exec eslint`, `pnpm exec prettier
--write` all pass/clean across every touched file.

## 2026-08-05 — Annonces List View merged into the existing Annonces page

No new route. Source: "Projet Propré" flow (`m2kVFGxniJZl`), screen
"Annonces List View" (`PGdhOWL77jzK`). First fetch attempt returned
"Annonce Detail Alt" again (the previous screen) — flagged to the user,
they re-selected, re-fetch confirmed the correct screen.

This screen turned out to be the literal "list view" state of the already-
built `frontend/src/app/annonces/page.tsx` (same header, filter bar,
sidebar filters, pill tabs, pagination — all already implemented from the
earlier `annonces-listing` screen) but with a richer list-card design than
what that page's `view === 'list'` mode currently rendered (which reused
the grid card layout). Rather than duplicate a second route, enriched the
existing page in place:
- Added `photoCount`/`publishedDate` fields to the `Listing` type and to
  all 9 `LISTINGS`. 6 of the 9 (a1/a2/a3/a4/a6/a7) matched this screen's
  cards 1:1 by title/agent — their literal photoCount/publishedDate/extra
  features (Garage+Piscine, Vue mer, Jardin, Terrain plat+Électricité,
  Piscine, Fibre) came straight from the fetch. The other 3 (Studio, F3
  Yopougon, Terrain Dakar Parcelles — not shown in this particular mock)
  got authored values in the same style, disclosed as authored not literal.
- `view === 'list'` now renders a dedicated card: 220px image with a
  bottom-right photo-count pill, up to 5 feature icons (vs 3 in grid mode),
  and a bottom row with agent+verified+"Publié le" on the left and
  heart/Contacter/Voir le détail pill buttons on the right — matching the
  fetched screen. `view === 'grid'` keeps the original 3-feature card
  unchanged (still literal to the earlier `annonces-listing` mock).
- Toggle default stays `'grid'` (unchanged) — both view states are now
  fully literal to their respective Banani screens, real toggle switches
  between them.

Verified: `pnpm exec tsc --noEmit`, `pnpm exec eslint`, `pnpm exec prettier
--write` all pass/clean.

## 2026-08-05 — Annonce Detail Alt (public listing detail) built

Route: `frontend/src/app/annonces/[id]/page.tsx` (dynamic segment present
for a future model swap, currently ignored — always renders the one
literal villa). Front-end only, static data — no `Listing`/`Agent` model.

Source: "Projet Propré" flow (`m2kVFGxniJZl`), screen "Annonce Detail Alt"
(`cPiety0AK_J3`). Fetched clean on first attempt.

Scope: **REUSE** `PublicNavbar` (`active="annonces"`), `PublicFooter` — kept
as-is even though the mock's navbar/footer link sets differ slightly
(4 vs 5 nav links, 3 vs 4 footer "Plateforme" links), per this session's
site-wide component-consistency convention. Full-bleed hero gallery, title
block (price/badges/stats), 8-item caractéristiques grid, 12-item
équipements grid, 2-paragraph description, static map + address, 3 similar
listing cards, sidebar (agent contact card, quick-message form, meta info
card).

Real interactivity: heart/save toggle on the hero (fills red, label
switches), "Lire la suite" expands/collapses the second description
paragraph, quick-message sidebar form is fully controlled. Everything else
stays inert: share, gallery photo counters, similar-listing cards (no
per-listing route yet), contacter/appeler l'agent, visite VR, signaler,
"Envoyer" on the message form.

Verified: `pnpm exec tsc --noEmit`, `pnpm exec eslint`, `pnpm exec prettier
--write` all pass/clean on the new file. Plan file:
`.planning/banani/annonce-detail-alt.md`.

## 2026-08-05 — Agents Certifiés (public directory) built

Route: `frontend/src/app/agents/page.tsx`. Front-end only, static data — no
`Agent` directory model, no matching/contact backend.

Source: "Projet Propré" flow (`m2kVFGxniJZl`), screen "Agents Certifiés"
(`EnFqXjtGOcU9`). Fetched clean on first attempt — no mismatch this time.

Scope: **REUSE** `PublicNavbar` (`active="agents"`), `PublicFooter` (content
matched exactly, no changes needed). Gradient hero (4-stat row + avatar
cluster), sticky filter bar (search + 4 filter chips + transaction
pill-tabs), 2-col layout (sidebar filters + agents grid), 1 featured
full-width card + 7 regular agent cards — all 8 agents literal from the
fetched screen, pagination.

Real interactivity: search input filters by name/role/bio; sidebar country
rows filter the grid (literal count badges kept, per the `annonces-listing`
convention); transaction pill-tabs (Tous/Vente/Location/Terrain) filter by a
per-agent `transaction` tag — disclosed as inferred from each bio since the
mock didn't expose that field literally. Results counts recompute live from
the filtered array. Empty state added (not in the mock) since filters are
now real. Sidebar specialité/note/disponibilité, top-bar filter chips, sort
select, and all Profil/Contacter/pagination controls stay inert.

Verified: `pnpm exec tsc --noEmit`, `pnpm exec eslint`, `pnpm exec prettier
--write` all pass/clean on the new file. Plan file:
`.planning/banani/agents-certifies.md`.

## 2026-08-05 — Nouvelle Demande (public 3-step wizard) built

Route: `frontend/src/app/demande-immobiliere/nouvelle/page.tsx`. Front-end
only, static data, no `PropertyRequest` model — same convention as every
screen this session.

Source: "Projet Propré" flow (`m2kVFGxniJZl`), screens "Nouvelle Demande
setup 1" (`10PsPLg0QaiJ`, step 1 — Bien recherché) and "Nouvelle Demande
setup 2" (`xCJUEvMz6nSD`, step 2 — Budget). First fetch attempt for "setup 1"
returned "setup 2" instead — flagged to the user, they re-selected, re-fetch
confirmed the correct screen. The mis-fetched "setup 2" was kept and reused
as the literal step-2 screen rather than discarded, since it's genuine
Banani data for the correct flow, just fetched one step early.

Scope:
- **REUSE** `PublicNavbar` (`active="demande"`), `PublicFooter`.
- **Step 1 — Bien recherché** (literal): transaction pills (Achat/Location),
  property-type pills (Villa/Appartement/Terrain/Bureau/Commerce), pays+ville
  selects, quartier input, superficie min/max, pièces/chambres min. selects,
  6 équipements checkboxes, description textarea.
- **Step 2 — Budget** (literal): budget min/max, financement pills (Fonds
  propres/Crédit bancaire/Mixte), budget idéal + flexibilité selects,
  calendrier pills (Immédiat/1-3/3-6/6+ mois), frais checkboxes,
  préférences textarea, "Conseil Habitat-Afrik" info banner.
- **Step 3 — Contact**: **not fetched for this flow** — authored to match
  the visual language of the fetched screens (prénom/nom/email/téléphone,
  pays/ville selects, disponibilité select, canal de contact préféré ×4,
  agent-connu toggle ×2, notes, 2 consent checkboxes). Disclosed as authored,
  not literal Banani data for this flow.
- Sidebar: "Résumé de votre demande" summary card, rows derived **live**
  from actual field state per step; "Conseils" tips card swaps content per
  step (literal tips for steps 1–2, authored for step 3).

Real interactivity: gated 3-step wizard (`step` state), full field state for
every input across all 3 steps, "Étape suivante"/"Retour" real
(advance/rewind), "Annuler" (step 1) real `Link` back to
`/demande-immobiliere`. Step 3 "Envoyer ma demande" stays inert (`disabled`
+ `title="Bientôt disponible"`) — no model to submit to.

Verified: `pnpm exec tsc --noEmit`, `pnpm exec eslint`, `pnpm exec prettier
--write` all pass/clean on the new file.

## 2026-08-03 — 29 new screens archived, subscription expires 2026-08-04

User generated a new batch of screens (admin back-office + a "Demande
Immobilière" property-request flow) and asked to archive everything before
the Banani subscription lapses tomorrow. Diffed the full
`banani_get_selected_designs` bulk fetch (83 screens selected) against
`_index.json`'s existing 54 screenIds — 29 were genuinely new, written to
`.planning/banani/raw/` (`<slug>.html` + `<slug>.meta.json` each) and
appended to `_index.json`. `_index.json` now lists 83 screens total.

New screens by feature area:
- **Admin back-office** (8): Gestion Annonces, Gestion Utilisateurs, Finances
  Jetons, Visites Virtuelles (×2, dup screenName — second uses
  `-<screenid>` slug suffix per the existing dedup convention), Modération
  Support, Paramètres Admin, Tarification Admin, Rôles Permissions.
- **"Demande Immobilière" flow** (21, web + mobile): Demande Immobilière
  (×2), Demande Immobilière Mobile, Demande Immobilière Agent, Nouvelle
  Demande (×4), Nouvelle Demande Mobile, Demande Detail (×2), Demande
  Actions Menu (×2), Modifier Demande, Budget Contact Mobile, Contact
  Mobile, Nouvelle Alerte, Alerte Secteur, Alerte Detail, Gérer Alertes —
  a property-request/matching feature not previously seen in the flow.

None of these 29 are planned or implemented yet — they're archived raw only.
Not reflected in the `linked/`, `gallery.html`, `pc-mockup/` derived views
(those still cover only the original 54); regenerate from `raw/` if the user
wants the new screens wired into the clickable prototype too.

## Banani subscription expiry — MCP confirmed working past predicted lapse dates

All 54 original screens from the "HABITATAFRIK EQUIPE" flow were archived
locally on 2026-07-23 to `.planning/banani/raw/` (raw HTML + theme tokens
per screen, `_index.json` lists all of them) as a backup before the
predicted 2026-07-24 expiry. On 2026-07-24 itself, and again on 2026-08-03
(see above), `mcp__banani__banani_get_selected_designs` still worked live —
so the lapse either has a grace period or hasn't taken effect. Try the live
MCP call first when the user says they've selected something in Banani;
only fall back to the archived `.html`/`.meta.json` files if the call
actually errors.

## Clickable prototype — `.planning/banani/linked/` + `gallery.html`

On top of the pristine `raw/` archive, a **clickable prototype** was generated
so all 54 static mockups feel like one connected app instead of isolated
screens:

- `.planning/banani/linked/` — a copy of every screen with real navigation
  wired in: desktop sidebar (`.nav-item`), mobile bottom nav (`.nav-tab` /
  `.bottom-nav-item` / `.bnav-item` — Banani used 3 different class names for
  the same concept across screens), settings sub-tabs (desktop
  `.settings-nav-item`, mobile `.tab-pill`), topbar logo/notif/avatar, and the
  full auth journey + a few key content CTAs (publish listing, edit listing).
  Generated by a script (not committed — regenerate from `raw/` if you need to
  tweak the link map; ask if you want the generator script saved into the repo
  properly instead of having lived in scratch).
- `.planning/banani/gallery.html` — updated to open `linked/` screens, so
  browsing the gallery and clicking through now simulates the real user flow.
- `.planning/banani/buttons-report.json` — every `data-media-type="banani-button"`
  element per screen with its extracted label text; the source of truth used
  to build the link map. Kept as reference for wiring more CTAs later.

## PC-only mockup — `.planning/banani/pc-mockup/` + published Artifact

Requested 2026-07-23: a **desktop-only** subset of the 54 screens (mobile
variants excluded), grouped and linked into its own standalone browsing
experience.
- Filter is `genType === "web-html-css"` in `_index.json` → 26 of the 54
  screens. `link-designs.mjs` already keys nav targets off `slug.includes('mobile')`
  (`DESKTOP_NAV_MAP`/`DESKTOP_SETTINGS_MAP` vs `MOBILE_*`), so every desktop
  screen's wired nav already points at another desktop screen — verified by
  grepping all `href="*.html"` / `location.href='*.html'` targets across the
  26 copied files for any `-mobile` slug (none found).
- `.planning/banani/pc-mockup/screens/` — the 26 desktop screens copied out of
  `linked/` into their own folder (still relative-link browsable locally by
  opening `.planning/banani/pc-mockup/index.html`).
- Published as a Claude Artifact (self-contained, single HTML file, all 26
  screens' HTML inlined via `srcdoc` — the artifact sandbox's CSP forbids
  loading separate local files by relative path): grid of screens grouped by
  the same 7 categories, click a card to open a full-size modal viewer with
  working **prev/next** across the whole 26-screen flow order (Authentification
  → Dashboard → Annonces → Messages/contacts/visites → Notifications →
  Paramètres → Facturation) plus **intercepted in-mockup navigation** — clicking
  a button *inside* an embedded screen (e.g. "Se connecter", "Tableau de bord")
  switches the modal to that target screen instead of trying to load a
  nonexistent path, so the linked click-through experience the user asked for
  ("chaque design doit être lié pour un aperçu logique") works inside the
  published artifact itself, not just when browsing the raw files locally.
  Both light/dark theme supported (toggle in the header).
- **Known degradation inside the published Artifact only** (not in the local
  `pc-mockup/` files, which render with full fidelity in a normal browser):
  the CSP blocks the `iconify-icon` CDN script Banani's exports depend on for
  every icon glyph (~100 distinct Lucide icons across the 26 screens) and
  blocks the hotlinked hero background image. Icons render as a neutral inline
  dot (shimmed via a tiny `customElements.define('iconify-icon', …)` polyfill
  injected into each embedded screen, sized/colored from the icon's own
  existing inline style) rather than their real glyph — reproducing ~100
  distinct icon shapes offline with byte-accurate paths wasn't attempted
  (too much surface area, risk of visibly wrong shapes outweighs the benefit).
  Layout, spacing, and navigation are unaffected. Disclosed directly in the
  artifact's own header copy, not just here.
- Generator script lives only in this session's scratchpad
  (`build-pc-artifact.mjs` for the Artifact, `build-pc-mockup.mjs` for the
  local folder version) — same "not committed" caveat as `link-designs.mjs`;
  ask if you want these promoted into the repo as real scripts.

## Mobile-only mockup — `.planning/banani/mobile-mockup/` + published Artifact

Requested 2026-07-23, same treatment as the PC mockup above but for the
**mobile-only** subset (28 of 54 screens, `genType === "mobile-html-css"`).
- Same nav-leakage check run: grepped all `href="*.html"` / `location.href='*.html'`
  targets across the 28 copied files — every target is itself a mobile slug
  (confirmed `login-mobile`, `register-mobile`, `forgot-password`, `dashboard-mobile`,
  `centre-aide-mobile`, … — no desktop slug ever appears as a target).
- `.planning/banani/mobile-mockup/screens/` — the 28 mobile screens copied out
  of `linked/`, browsable locally via `.planning/banani/mobile-mockup/index.html`.
- Published as a Claude Artifact, same self-contained `srcdoc`-embedding
  approach as the PC one, but with a **mobile-appropriate frame**, not a
  reskinned copy of the desktop layout: cards render as narrow phone shells
  (375×812 aspect ratio) with a top "notch" instead of browser-chrome dots;
  the click-through viewer renders inside an actual phone-frame chrome
  (rounded bezel + notch) centered on screen rather than stretched full-width.
  Same working prev/next (8-group flow order: Authentification → Dashboard →
  Annonces → Messages/contacts/visites → Notifications → Paramètres →
  Facturation → *Variantes à confirmer*) and same intercepted in-mockup
  navigation (clicking a bottom-nav tab or CTA inside an embedded screen
  switches the viewer to that target). Light/dark theme toggle included.
- The 8th group, **"Variantes à confirmer (doublons)"**, holds
  `alerte-secteur-mobile-pjd6hr3sh_pr` and `modifier-annonce-mobile-x9tyh65n9hgj`
  — 2 screens that share a `screenName` with another mobile screen but have a
  distinct `screenId` (the same duplicate-naming quirk flagged under "Open
  design questions" below). Neither is wired into the main flow's nav since
  it's still unclear which of each pair is canonical — surfaced here instead
  of guessing.
- **`otp-verification` / `forgot-password` are the mobile Verification /
  Password-Reset screens** — Banani's slugs are swapped relative to what they
  sound like (documented earlier in this file: `password-reset` = desktop
  forgot-password screen, `forgot-password` = the mobile one; `sms-verification`
  = desktop, `otp-verification` = mobile). Grouped under Authentification
  accordingly, not under a separate guess.
- Same known degradation as the PC artifact (icons → neutral dot placeholder,
  hero image blocked) for the same CSP reasons — disclosed in the artifact's
  own header copy.
- Generator scripts: `build-mobile-artifact.mjs` (Artifact) / `build-mobile-mockup.mjs`
  (local folder) — scratchpad-only, same as all the others above.

**Auth flow decisions baked into the linking** (make these real product
decisions when actually implementing, don't just copy blindly):
- Registration (`register-screen`/`register-mobile`) skips straight to the
  dashboard — the OTP screens (`sms-verification`/`otp-verification`) were
  wired **exclusively** to the password-reset flow instead, since Banani only
  gave one generic-looking OTP screen and reusing it for both would require a
  runtime branch a static prototype can't express.
- `password-reset` = desktop forgot-password screen; `forgot-password` = the
  mobile one (the slugs are swapped relative to what the naming suggests —
  named after their exact Banani screen titles, not renamed).
- Google/Facebook buttons on login/register go straight to the dashboard too
  (decorative — no real OAuth in a static mockup).

**Known gaps — not wired, by design (scope call, revisit if needed)**:
- The 4 `publier-annonce*` variants (`-alt` included) and 3 duplicate-named
  screens (`modifier-annonce-mobile-x9tyh65n9hgj`, `alerte-secteur-mobile-pjd6hr3sh_pr`)
  aren't part of the main linked path — only reachable via the gallery directly.
  Ask the user which variant is canonical before implementing either for real.
- Settings sub-tabs "Profil" / "Sécurité" / "Notifications" have no dedicated
  screen in the 54 (only sub-tabs within `settings-page`/`settings-mobile`
  itself) — left as inert `#` links.
- Individual list rows (listing cards in `mes-annonces`, conversations in
  `messages-inbox`, contacts, visits) aren't individually clickable — their
  text blobs have no stable per-row id in the Banani export to target safely.
  Only the persistent nav + primary CTAs + auth flow are wired.

## Done
- [x] `login-screen` — `frontend/src/app/login/page.tsx` — plan: `login-screen.md` — commit: (uncommitted) — raw source: `raw/login-screen.html`
- [x] `register-screen` — `frontend/src/app/signup/page.tsx` — commit: (uncommitted) — raw source: `raw/register-screen.html` (screenId `psc8RX9dLcjv`, fetched fresh via MCP the same session it was implemented, subscription still active at that point)
  - Also added `frontend/src/app/verify-email/page.tsx` — **no Banani screen was selected/available for this step**; styled with the same `AuthSplitLayout`/brand primitives, logic modeled on `examples/frontend-pages/verify-email.tsx`. Not a literal Banani reproduction — flag if a real screen for this step turns up later.
  - Backend: `POST /api/auth/signup` now accepts `firstName`/`lastName`/`phone`/`accountType` (enum `TENANT_BUYER` | `OWNER_AGENT`, the Register screen's "Vous êtes" selector). Added `User.accountType` column (migration `6_add_user_account_type`, applied to Neon). Duplicate check now covers email OR phone (still enumeration-resistant, dummy-bcrypt timing parity preserved).
  - Verification stays **email-based** even though login is phone-based — reuses the existing VerificationCode/outbox pipeline rather than standing up a new SMS provider for this pass.
  - Verified end-to-end against the live Neon DB (not just mocks): POST'd a real signup, confirmed the row landed with correct `name` (first+last concatenation), `phone`, `accountType`, `emailVerifiedAt: null`, then deleted the test row.
  - 575/575 unit tests pass (up from the 555 baseline — 20 new tests for phone/Facebook-OAuth/signup coverage), `pnpm format && lint && typecheck` all clean.
  - No live browser screenshot verification (same Playwright/Chromium sandbox limitation as the login screen) — verified via SSR HTML content checks + Tailwind-class code review instead.
- [x] Password-reset flow — `password-reset` (screenId `lT5_WWl1zjAu`) → `frontend/src/app/forgot-password/page.tsx`, `sms-verification` (screenId `eXyDohZT5bv7`) + `new-password` (screenId `oVOI9fMqtEjw`) → merged into `frontend/src/app/reset-password/page.tsx` (2 in-page sub-steps, see below), `success-confirmation` (screenId `_zROCb657kAv`) → `frontend/src/app/reset-password/success/page.tsx`. Commit: (uncommitted).
  - **Architectural decision (explicitly confirmed with the user, not assumed)**: Banani's mockups show a phone-number-driven SMS OTP flow, but this starter has **no SMS provider wired up** (not Twilio/Vonage/Africa's Talking — nothing). Decision: keep the phone-collecting UI (consistent with login/signup) but deliver the code over the existing, already-battle-tested **email** outbox pipeline. The "SMS Verification" screen's copy was changed from "code envoyé par SMS au numéro X" to a generic "un code a été envoyé à l'adresse email associée à ce compte" — deliberately vague to preserve the backend's enumeration-resistance (never confirms whether the phone matched a real account).
  - Backend: `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` both switched from `email` to `phone` (`zPhone`) as the lookup identifier — mirrors `/api/auth/login`'s phone-based lockout/rate-limit keying (`recordSuccess`/`isLockedOut` calls updated to match). The email actually sent is resolved server-side from `user.email` after the phone lookup; `enqueueOutbox`'s `payload.to` still gets the real email, not the phone. `outbox/dispatcher.ts` (protected, untouched) already renders via `resetPasswordEmail()` regardless of lookup method, so no changes needed there.
  - UI adaptation: Banani's "SMS Verification" screen uses 6 individual OTP boxes for a 6-digit numeric code — but the backend generates 8-char Crockford-alphabet codes (`VERIFICATION_CODE_REGEX` in the protected `auth.ts`), so the code step reuses the single-text-field pattern already established by `/verify-email` instead of literal 6-box OTP UI.
  - There is **no separate "verify code" API call** — the code-entry step only validates length (8 chars) client-side, then both `code` and `newPassword` are submitted together in one atomic `POST /api/auth/reset-password` (matches the existing WR-05 TOCTOU-safe `updateMany` guard in that route — adding a standalone verify-code endpoint would create a code-guessing oracle that doesn't exist today).
  - New shared component: `frontend/src/components/auth/ResetStepIndicator.tsx` (the "Téléphone → Vérification → Nouveau mot de passe" step row, reused across all 3 screens).
  - Live password-strength meter + 4 requirement checks (10+ chars, uppercase, digit, special char) implemented with real JS regex checks, not static — `AUTH_PASSWORD_MIN_LENGTH=10` matches the rest of the app (Banani mockup said "8 caractères", corrected same as the signup screen was).
  - 577/577 unit tests pass, `pnpm format && lint && typecheck` all clean. SSR HTML verified via curl for all 3 pages (correct French copy renders).
  - **Live E2E DB test NOT completed this pass** — Neon's pooler endpoint (`ep-long-bar-axecxyit-pooler...`) was unreachable (`P1001`/`PrismaClientInitializationError`) across ~6 retries over several minutes while testing, unlike the earlier transient blips this session that cleared on retry. This looks like a genuine ongoing outage, not a code bug — the forgot/reset-password route logic itself is fully covered by the (Prisma-mocked) unit test suite. Re-run the live E2E once Neon is reachable again: signup a throwaway user → POST `/api/auth/forgot-password` → read the `VerificationCode` row directly → POST `/api/auth/reset-password` with it → confirm 200.
- [x] Agent Dashboard — `agent-dashboard` → `frontend/src/app/dashboard/page.tsx` (rewrote the previous placeholder). Commit: (uncommitted).
  - **Data-scope decision (explicitly confirmed with the user)**: the Banani mockup shows 4 KPI stat cards, 3 charts (annonces donut, contacts-reçus bar chart, documents progress bars), and a "Mes annonces" table. Building the KPIs/charts for real would require `Contact` and `Visit` domain models that don't exist in this starter yet — out of scope for this pass. User chose: build a **real `Listing` model + real "Mes annonces" table**, keep the 4 stat cards and 3 charts as **clearly-labelled realistic placeholders** (exact numbers reproduced from the Banani mockup, code comments flag them as illustrative-only so a future pass knows exactly what to wire up and why).
  - New Prisma model: `Listing` (`frontend/prisma/schema.prisma`) — `title`, `city`, `country`, `propertyType` (`VILLA | APARTMENT | LAND | DUPLEX | OFFICE`, free-form `String` per this repo's enum convention), `price` (`Int`, smallest currency unit), `currency` (default `XOF`), `status` (`PENDING | VERIFIED | SOLD`, default `PENDING`), scoped to `userId` with `onDelete: Cascade`; indexes on `[userId, createdAt]` and `[status]`. Migration hand-written at `frontend/prisma/migrations/7_add_listing/migration.sql`, applied via `prisma migrate deploy`.
  - New endpoint: `GET /api/listings` (`frontend/src/app/api/listings/route.ts`) — auth-required, scoped to `userId: auth.user.sub`, cursor-paginated via the shared `@/lib/server/pagination/paginate` helpers (same pattern as the existing Withdrawal/Order list endpoints). **`POST` (create) is intentionally out of scope** — no "publier une annonce" screen/endpoint exists yet, so the dashboard's "Publier une annonce" button and per-row Eye/Pencil action buttons render `disabled` with a "Bientôt disponible" tooltip rather than linking to a non-existent flow. 7 tests in `route.test.ts`, all passing.
  - `GET /api/auth/me` extended to return `phone`, `name`, `avatarUrl`, `accountType` (previously omitted from this endpoint); `AuthContext`'s `User` interface extended to match, so the dashboard topbar can render the real signed-in user's name/role/avatar without a second fetch.
  - New shared components: `frontend/src/components/dashboard/DashboardShell.tsx` (sidebar + topbar + content shell, reusable by every future dashboard-area screen) and `frontend/src/components/dashboard/InitialsAvatar.tsx` (real `avatarUrl` image, or a deterministic hash-based colored-initials fallback since no photo-upload feature exists — `avatarUrl` today is only ever populated via Google OAuth sign-in).
  - Sidebar nav: only "Tableau de bord" (`/dashboard`) has a real `href`; every other nav item (Messages, Paramètres, Mes annonces as a nav entry, Contacts reçus, Visites programmées, Jetons & visites VR, Statistiques, Centre d'aide) renders as an inert row tagged "Bientôt" — those screens aren't built yet, so linking them would 404. Notification bell wired to the real, already-existing `GET /api/notifications/count`. Logout wired to the real `useAuth().logout()`.
  - 585/585 unit tests pass (67 files), `pnpm format && lint && typecheck` all clean. Manual verification: seeded 5 realistic `Listing` rows (villa, appartement, terrain, duplex, bureau — mixed `VERIFIED`/`PENDING`/`SOLD` statuses) for the real test account via a throwaway script (deleted after use, per this repo's established manual-DB-check pattern); confirmed both `/login` and `/dashboard` return HTTP 200 against the dev server. Full authenticated browser walkthrough left to the user per their explicit "je veux tester moi même" preference this session — dev server is left running at `http://localhost:3000`.
- [x] Agent Dashboard — mobile responsive pass — `dashboard-mobile` (screenId `7lN40rBbl4AH`, fetched live via MCP — subscription still worked despite the predicted 2026-07-24 lapse) → plan at `.planning/banani/dashboard-mobile.md`. Commit: (uncommitted).
  - **Root cause of the user-reported "mobile dashboard n'est pas bon"**: `DashboardShell` had zero responsive treatment — the 248px fixed sidebar and `grid-cols-4`/`grid-cols-3` rows rendered as-is on a 375px viewport. Banani's mobile screen isn't a shrunk desktop layout — it swaps the sidebar for a compact topbar + fixed bottom tab bar, which is the pattern implemented.
  - New components: `frontend/src/components/dashboard/MobileTopbar.tsx` (logo, real notif bell, real user pill — shown `lg:hidden`), `frontend/src/components/dashboard/BottomNav.tsx` (fixed 5-tab bar mirroring Banani: Dashboard/Messages/Annonces/Alerte secteur/Paramètres — only Dashboard has a real `href`, the rest render inert, same "Bientôt" convention as the desktop sidebar).
  - `DashboardShell.tsx`: sidebar and desktop topbar now `hidden lg:flex`; mobile topbar + bottom nav mounted `lg:hidden`; content area gets `pb-[88px] lg:pb-7` so it isn't hidden behind the fixed bottom nav.
  - `dashboard/page.tsx` made mobile-first: stats grid `grid-cols-2 lg:grid-cols-4`, charts row `grid-cols-1 lg:grid-cols-3`, banner padding/type scale/period-pill shrink below `lg:`, table toolbar wraps and goes icon-only ("Filtrer"/"Publier une annonce" labels hidden below `lg:`, search placeholder shortens), table's ID and Type columns hidden below `lg:` to cut down on horizontal scroll (Title/Location/Price/Status stay visible — the essential glanceable info).
  - **Decisions confirmed with the user before coding**: (1) omitted the mockup's "5" unread badge on the Messages tab — Messages isn't built, so a fake count would be fabricated data; (2) kept the existing `<table>` (horizontal scroll) rather than rebuilding Banani's stacked-card mobile rows — one row-rendering path to maintain instead of two.
  - 585/585 unit tests pass (67 files, no regressions), `pnpm format && lint && typecheck` all clean. Verified via Tailwind-class review + dev-server HTTP 200 checks (same headless-browser sandbox limitation as prior screens this session — no literal screenshot at 375/768/1280px was possible here). Ask the user to eyeball the breakpoints in a real browser as the final check.

- [x] Settings Page — `settings-page` (screenId `OH2_l1aYeEhL`, fetched live via MCP 2026-07-30 — subscription still working) → `frontend/src/app/settings/page.tsx` (rewrote the earlier bare-bones placeholder). Plan: `settings-page.md`. Commit: (uncommitted).
  - **Product decisions confirmed with the user before coding** (full rationale in the plan file): (1) 2FA + identity-verification blocks render as disabled "Bientôt disponible" — no such systems exist, and Banani's static "Activé"/"Vérifié" badges would otherwise be fabricated data; (2) "Sessions actives" ships a REAL "Déconnecter tous les autres appareils" button (new `POST /api/auth/sessions/revoke-others` — bumps `tokenVersion`, reissues cookies for the current session only, mirrors `change-password`'s tail) rather than a fake device list, since no per-device session tracking exists; (3) the 5 notification toggles are REAL, persisted via the existing `/api/notifications/prefs` under new eventType keys (`message.new`, `visit.requested`, `listing.status_changed`, `visit.reminder`, `newsletter`) that have no notification-sending code behind them yet (Messages/Visites don't exist) — dormant today, takes effect automatically once those features ship; (4) the danger zone ships BOTH actions for real, not placeholders.
  - New Prisma columns: `User.city`, `User.country`, `User.bio` (all nullable `String`), migration `8_add_user_profile_fields`, applied to Neon.
  - `GET`/new `PATCH /api/auth/me` — GET extended to return `city`/`country`/`bio`; PATCH lets the user edit `name`/`phone`/`city`/`country`/`bio` (email is NOT editable — out of scope, would need re-verification). Empty string clears a field to `null`.
  - New `POST /api/auth/sessions/revoke-others` — see above.
  - New `POST /api/auth/deactivate` — self-service `status: SUSPENDED` (same enum/refusal path the admin back-office already uses; only a SUPERADMIN can restore via the existing `/api/admin/users/[id]/status` route — no separate self-service reactivate). Password-confirmed (skipped for OAuth-only accounts with no `passwordHash`). Refuses the sole ACTIVE SUPERADMIN (mirrors the "can't demote the last SUPERADMIN" invariant — suspension is functionally a role change since it strips authentication). Bumps `tokenVersion` + clears cookies (immediate logout everywhere, cookies NOT reissued — unlike change-password).
  - New `POST /api/auth/delete-account` — **anonymization, not a literal SQL `DELETE`**: several FKs (`AdminAction.actorId`, `Organization.ownerId`, `Withdrawal.userId`) are intentionally `onDelete: Restrict` to protect the audit/financial trail, so hard-deleting the row would either throw or require cascading away records the project's own schema design forbids touching. Instead wipes PII (email → `deleted-<id>@deleted.invalid`, phone/name/avatarUrl/city/country/bio → null, passwordHash → null), deletes `OAuthAccount` + `VerificationCode` rows, sets `status: SUSPENDED`, bumps `tokenVersion`. Orders/Withdrawals/Listings/AdminAction rows survive untouched, now pointing at an anonymized shell — disclosed in the danger-zone UI copy. Same password-confirmation + last-SUPERADMIN guard as deactivate.
  - New components: `frontend/src/components/settings/{ProfileCard,SecurityCard,NotificationsCard,DangerZoneCard,PasswordConfirmModal}.tsx`, `frontend/src/components/ui/Toggle.tsx`. Old settings page's working password-change/set + Google-linking logic was preserved and folded into `SecurityCard`, extended with Facebook linking (which shipped in an earlier session this same day).
  - `DashboardShell`'s sidebar + `BottomNav`'s mobile tab both had inert "Paramètres" entries (`href` omitted, "Bientôt" tag) — both now point at the real `/settings` route.
  - `AuthContext`'s `User` interface extended with `city`/`country`/`bio` to match the new `/api/auth/me` shape.
  - New tests: `me/route.test.ts` extended with a `PATCH` describe block (4 tests); new `sessions/revoke-others/route.test.ts` (4 tests), `deactivate/route.test.ts` (7 tests, incl. OAuth-only skip + last-SUPERADMIN refusal), `delete-account/route.test.ts` (6 tests, incl. anonymization-not-delete assertion + last-SUPERADMIN refusal).
  - `pnpm format && lint && typecheck` all clean. Full `pnpm test` run in progress at time of writing — will confirm pass/fail count before closing out.
  - **Not done this pass**: real avatar upload (button renders disabled "Bientôt disponible" — no Cloudinary wiring for a settings-page photo picker yet), a real country-list/city-list picker (both are plain text inputs).
  - **Follow-up fix (same day)**: the first pass missed the Banani mockup's persistent `.settings-sidenav` (Compte/Agence/Préférences sub-nav) entirely — user caught it on review. Added `frontend/src/components/settings/SettingsSideNav.tsx`: "Compte" group (Profil/Sécurité/Notifications) as in-page anchor jumps since the 3 sections all render on one scrolling page; "Agence"/"Préférences" groups render inert ("Bientôt") since their target screens aren't built. Wired into `settings/page.tsx` as a two-column layout (`lg:flex-row`), horizontal scrollable pill row below `lg:`. `pnpm typecheck` + targeted `eslint` clean; full `pnpm test`/browser re-verification not re-run after this specific fix (Neon flakiness stalled two prior browser-verification attempts this session — user opted to do the browser check themselves going forward).

- [x] Mon Agence (phase 1: identity + zones) — `mon-agence` (screenId `VBgNL9FWcpGQ`, fetched live via MCP 2026-07-30) → new `'agence'` tab in `frontend/src/app/settings/page.tsx`. Plan: `mon-agence.md`. Commit: (uncommitted).
  - **Scope decision confirmed with the user**: full "Mon Agence" feature, shipped iteratively. Phase 1 (this pass) = agency identity (name/type/address/phone/email/website/description/RCCM/socials) + zones d'activité (pays → villes), both real and persisted. Phase 2 (deferred) = logo upload (needs Cloudinary) + team invites by email — the "Équipe de l'agence" card and the logo box both render as disabled "Bientôt disponible" placeholders, not fabricated data. Banani's 4 stat chips (34 annonces/6 membres/4 pays/97%) are illustrative-only, same convention as the Agent Dashboard KPIs — not wired.
  - Reused the existing generic `Organization`/`OrganizationMember` multi-tenancy primitives (previously unused by any route) instead of inventing a parallel "Agency" model — exactly what they were built for.
  - New Prisma columns on `Organization`: `description`, `agencyType`, `address`, `phone`, `email`, `website`, `rccmNumber`, `facebookHandle`, `instagramHandle`, `linkedinHandle`, `whatsappNumber` (all nullable `String`), `zones` (`Json`, default `[]`, shape `{ country: string; cities: string[] }[]`). Migration `9_add_agency_fields`, applied to Neon.
  - New `GET`/`PATCH /api/organizations/me` — "my agency" is simply the `Organization` owned by the caller (no `requireOrgRole` needed yet — phase 1 has no other members). `PATCH` find-or-creates on first save (a `OWNER_AGENT` user who never touched this screen has no `Organization` row yet) via the existing `slugify`/`ensureUniqueSlug` helpers (`lib/server/slug.ts`) — first real consumer of `ensureUniqueSlug` in the app. 8 tests (find-or-create, existing-org update incl. zones, CSRF, auth, validation).
  - New components: `frontend/src/components/settings/{AgencyCard,AgencyZonesCard,AgencyTeamCard}.tsx`. Zones editing is edit-in-place (add/edit/remove a country + comma-separated cities list) rather than a modal — simpler, matches the row-level "Modifier" affordance in the mockup.
  - `SettingsSideNav.tsx`: "Mon agence" promoted from the inert `AGENCY_ITEMS` list to a real tab (`AGENCY_TABS`); Documents légaux/Abonnement & paiement stay inert (`AGENCY_INERT_ITEMS`).
  - `pnpm typecheck` + targeted `eslint` clean. Full `pnpm test` re-run pending at time of writing.
  - **Not done this pass (phase 2, by design)**: agency logo upload, team member invite-by-email + roles/pending status, real KPI stats (annonces/membres/pays/satisfaction) wired to actual data.

- [x] Documents légaux — `documents-legaux` (screenId `mU9G3YPaywt9`, fetched live via MCP 2026-07-30) → new `'documents'` tab in `frontend/src/app/settings/page.tsx`. Plan: `documents-legaux.md`. Commit: (uncommitted).
  - **Scope decision confirmed with the user**: real upload + per-document status, no admin back-office this pass. Documents belong to the user (agent), not the Organization. Fixed list of 6 document types from the mockup (`ID_CARD`/`PRO_CARD`/`RCCM`/`TAX_CERTIFICATE`/`MANAGEMENT_MANDATE`/`LIABILITY_INSURANCE`) — not free-form. Phase 2 (deferred) = an `/api/admin/legal-documents` route so ADMIN/SUPERADMIN can flip `PENDING → VERIFIED/REJECTED`; until it exists every upload stays `PENDING`, stated in the UI copy, not a bug.
  - New Prisma model `LegalDocument` (`userId`, `type`, `status` default `PENDING`, `key`/`url`/`filename`/`mimeType`/`sizeBytes` mirroring `FileUpload`, `expiresAt`, `rejectionReason`), `@@unique([userId, type])`. Migration `10_add_legal_documents`, applied to Neon.
  - New `GET`/`POST /api/legal-documents` — `GET` merges the 6 fixed types with the caller's uploaded rows (missing → `null`) plus derived stats (verified/pending/missing/total — no hardcoded placeholder numbers, unlike Mon Agence's KPI chips). `POST` is multipart (`type`/`file`/optional `expiresAt`), reuses the `/api/upload` trust boundary (CSRF → auth → Cloudinary probe → size/MIME gates → magic-byte sniff → Cloudinary) as its own route since the persistence target and upsert-by-`(userId, type)` semantics differ from generic `FileUpload`. Always resets status to `PENDING` on upload/replace; refuses to replace a `VERIFIED` document (409 `DOCUMENT_VERIFIED`). 15 tests (list merge, upload upsert, CSRF/auth/size/MIME/magic-byte gates, verified-blocks-replace, invalid expiresAt).
  - New component: `frontend/src/components/settings/LegalDocumentsCard.tsx` — derived stat chips + per-type document row (status badge, download/replace action, hidden per-row file input triggers a direct multipart `fetch` since the shared `api()` wrapper JSON-encodes bodies and can't carry `FormData`).
  - `SettingsSideNav.tsx`: "Documents légaux" promoted from `AGENCY_INERT_ITEMS` to `AGENCY_TABS` (real tab); Abonnement & paiement stays inert.
  - `pnpm typecheck` + targeted `eslint` clean. Full `pnpm test` re-run pending at time of writing.
  - **Not done this pass (phase 2, by design)**: admin verification workflow (`PENDING → VERIFIED/REJECTED`), so every uploaded document stays `PENDING` indefinitely for now.

- [x] Abonnement & paiement — `abonnement-paiement` (screenId `iB8MbJT5-w3v`, fetched live via MCP 2026-07-30) → new `'abonnement'` tab in `frontend/src/app/settings/page.tsx`. Plan: `abonnement-paiement.md`. Commit: (uncommitted).
  - **Scope decision confirmed with the user**: this screen is materially larger than the prior two (recurring billing, a token/wallet system, a "visites virtuelles" feature that doesn't exist anywhere else). Full recurring billing was explicitly ruled out. Real this pass: current plan + plan catalog + changing plan (downgrade to Free is immediate/no charge; upgrading to a paid plan is a real one-time Bictorys charge). Illustrative this pass (Banani's exact numbers, "Bientôt disponible"): jetons VR balance/usage, saved payment methods, payment history table.
  - **Reused the existing `Order`/Bictorys `PaymentProvider` pipeline instead of building a parallel charge route**: the frontend calls the already-battle-tested `POST /api/orders` directly with `metadata.kind = 'subscription_plan_change'`; no changes to that route or to the PROTECTED `webhook/handler.ts`/`circuit-breaker.ts`.
  - New Prisma model `Subscription` (`userId` unique, `planKey` default `FREE`, `status` default `ACTIVE`, `currentPeriodEnd`, `canceledAt`) — absence of a row means "on the Free plan" (find-or-create-on-upgrade, same convention as `Organization`). Migration `11_add_subscriptions`, applied to Neon.
  - New shared catalog `frontend/src/lib/subscription-plans.ts` (`PLAN_CATALOG`: FREE/PRO_AGENT/AGENCY_PREMIUM — label/price/features) — single source of truth imported by both the API routes and the UI so price never drifts.
  - New `GET /api/subscriptions/me`, `POST /api/subscriptions/change-plan` (FREE-only — moving to a paid plan returns 400 `UPGRADE_REQUIRES_PAYMENT` telling the client to use `/api/orders` instead, so there's only one charge-creation path), `POST /api/subscriptions/cancel` (flips to `CANCELED`, refuses if no active paid plan). 14 tests.
  - Updated `frontend/src/app/api/webhooks/bictorys/route.ts`'s `onPaid` (explicitly listed as project surface in CLAUDE.md, unlike the underlying PROTECTED `handler.ts` factory) — when a paid `Order`'s `metadata.kind === 'subscription_plan_change'`, upserts the `Subscription` to the target plan inside the same Serializable tx. 2 new tests (activates on match, ignores orders without the metadata tag).
  - New minimal pages `frontend/src/app/orders/[id]/{success,failed}/page.tsx` — `POST /api/orders`'s `successUrl`/`failureUrl` pointed at these paths already (pre-existing from an earlier payments phase) but neither page existed, so the checkout flow would have dead-ended at a 404 after a real Bictorys redirect. No DB read — the webhook already applied state by the time the user lands here.
  - New components: `frontend/src/components/settings/{SubscriptionCard,TokensCard,PaymentMethodsCard,PaymentHistoryCard}.tsx`. `SubscriptionCard` reuses `PasswordConfirmModal` (with `requirePassword={false}`) for the cancel confirmation.
  - **Explicit limitation, not silently swept under the rug**: no renewal cron exists. `currentPeriodEnd` (purchase +30d) is stored/displayed but nothing enforces it — a cancellation is immediate in the DB (not deferred to period end) and nothing auto-expires a plan. Flagged in the plan file, the schema comment, and the component's cancel-section copy.
  - `SettingsSideNav.tsx`: "Abonnement & paiement" promoted from `AGENCY_INERT_ITEMS` (now empty) to `AGENCY_TABS` (real tab) — all 3 "Agence" group items are now real.
  - `pnpm typecheck` + targeted `eslint` clean. Full `pnpm test` re-run pending at time of writing.
  - **Not done this pass (phase 2, by design)**: real token/wallet ledger, real "visites virtuelles" feature, real payment-method storage/tokenization, real receipts/history endpoint, a renewal cron.

- [x] Langue & Région — `langue-region` (screenId `ptEwwpnr4m_M`, fetched live via MCP 2026-07-30) → new `'langue'` tab in `frontend/src/app/settings/page.tsx`. Plan: `langue-region.md`. Commit: (uncommitted).
  - **Scope decision confirmed with the user**: much simpler surface than the prior three tabs — no payment, no upload, just preferences. Real, persisted, but **dormant**: no i18n library (`next-intl` or similar) exists in this starter, so picking a language doesn't translate any UI text yet, and date/number format aren't applied anywhere yet either — same convention as the 5 notification toggles from the base Settings Page pass. Stated in the component copy, not silently implied.
  - New `User` columns (migration `12_add_regional_preferences`): `locale` (default `fr`), `timezone` (default `Africa/Cotonou`, free-form), `currency` (default `XOF_UEMOA`), `dateFormat` (default `DMY`), `numberFormat` (default `SPACE`). Reused the **existing** `User.city`/`User.country` (added in the base Settings Page pass for the Profil card) for "Ville par défaut"/"Pays principal" instead of adding duplicate columns — same underlying concept, documented so it doesn't read as an accidental collision.
  - New `GET`/`PATCH /api/preferences/regional` — kept separate from `PATCH /api/auth/me` (the Profil card's route) even though both land on the same `User` row, since each settings card should own a distinct concern. 6 tests.
  - New component: `frontend/src/components/settings/LanguageRegionCard.tsx` — 4 sub-sections mirroring the mockup's 4 separate cards (Langue/Fuseau & région/Devise/Formats), each field saves independently on selection (language/currency/format pills) or via an inline "OK" button (timezone/country/city text inputs) rather than one big form with a single submit — matches the mockup's per-card save affordance.
  - `SettingsSideNav.tsx`: "Langue & région" promoted from `PREFERENCE_ITEMS` to a new `PREFERENCE_TABS` (real tab); "Apparence" is the sole remaining inert item (`PREFERENCE_INERT_ITEMS`).
  - `pnpm typecheck` + targeted `eslint` clean. Full `pnpm test` re-run pending at time of writing.
  - **Not done this pass (by design)**: any actual i18n/translation wiring, tz-database validation, real date/number formatting anywhere in the app.

- [x] Apparence — `apparence-settings` (screenId `X9QIFjiEhetp`, fetched live via MCP 2026-07-31) → new `'apparence'` tab in `frontend/src/app/settings/page.tsx`. Plan: `apparence-settings.md`. Commit: (uncommitted). **This was the last of the 5 explicitly-ordered menu items (Mon Agence → Documents légaux → Abonnement & paiement → Langue & région → Apparence) — every `SettingsSideNav` entry is now a real tab.**
  - **Scope decision**: same convention as the immediately-preceding "Langue & région" tab, applied without re-asking since the decision shape is identical — real, persisted, but **dormant**. This starter ships zero dark-mode CSS (`dark:` Tailwind variants) anywhere, so wiring a real light/dark/system theme switch would be a cross-cutting design-system change touching every page, genuinely out of scope for a single settings tab (unlike Langue & région's gap, which was just a missing i18n library).
  - New `User` columns (migration `13_add_appearance_preferences`): `theme` (default `LIGHT`), `accentColor` (default `#376BFF`, free-form hex), `fontScale` (default `NORMAL`), `density` (default `NORMAL`), `sidebarStyle` (default `EXPANDED`), `animationsEnabled`/`hoverEffectsEnabled` (`Boolean`, default `true`), `reduceMotion` (`Boolean`, default `false`).
  - New `GET`/`PATCH /api/preferences/appearance` — same partial-update shape as `/api/preferences/regional`, kept as its own route for the same reason. 6 tests.
  - New component: `frontend/src/components/settings/AppearanceCard.tsx` — 6 sub-sections mirroring the mockup (Thème/Couleur d'accentuation/Typographie/Densité/Barre latérale/Animations). Theme/accent/font-size/density/sidebar-style selections save immediately on click; the 3 animation toggles batch-save via one "Enregistrer" button (matches `NotificationsCard`'s pattern and the mockup's own dedicated footer on that card).
  - `SettingsSideNav.tsx`: **removed the `InertPill`/`InertEntry` machinery entirely** — with "Apparence" now real, both `AGENCY_INERT_ITEMS` and `PREFERENCE_INERT_ITEMS` were empty, so the dead-code path was deleted rather than left unused. Every tab across all 3 groups (Compte/Agence/Préférences) is now a real, functional tab.
  - `pnpm typecheck` + targeted `eslint` clean. Full `pnpm test` re-run pending at time of writing.
  - **Not done this pass (by design)**: any actual dark-mode CSS, accent-color theming, font-scale/density/sidebar-style application anywhere in the app.

## In progress
(none)

- [x] Nouvelle Alerte — `nouvelle-alerte` (screenId `pyVgOb8k_wRD`, fetched live via MCP 2026-08-03 — subscription still working past every predicted lapse date) → `frontend/src/app/alertes/new/page.tsx`. Plan: `nouvelle-alerte.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope as `/alertes` and `/demandes` (this session, same user instruction repeated a third time). No `Alert` Prisma model — nothing to persist to.
  - Full 6-section form reproduced with real client-side interactivity (transaction toggle, multi-select property-type chips, location/rooms/max-alerts selects, 4 criteria toggles, frequency radio, 3 notification-channel checkboxes) — all local `useState`, no backend call. The right-rail "Aperçu de l'alerte" preview card derives its chips live from the same state, mirroring the Banani mockup's static preview but reactive.
  - "Annuler" is a real `Link` back to `/alertes`. "Créer l'alerte" (both header and rail copies) and "Voir les correspondances" stay inert (`disabled` + "Bientôt disponible"), same convention as every other not-yet-backed action in this app.
  - `/alertes/page.tsx`'s "Nouvelle alerte" header button and "Créer une nouvelle alerte" dashed card both switched from disabled placeholders to real `<Link href="/alertes/new">`.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. Dev-server/browser breakpoint verification not done this pass (ask the user to eyeball 375/768/1280px).

- [x] Alerte Detail — `alerte-detail` (screenId `aLYiQWu5EH_7`, fetched live via MCP 2026-08-03) → `frontend/src/app/alertes/[id]/page.tsx`. Plan: `alerte-detail.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope, user's fourth repeat of this instruction across `/alertes`, `/alertes/new`, `/demandes`, and now this screen.
  - **Refactor**: extracted the alert data previously local to `/alertes/page.tsx` into shared `frontend/src/lib/alerts-data.ts` (`SectorAlert`/`AlertMatch`/`AlertStats` types, `MOCK_ALERTS`, `TRANSACTION_BADGE`) so the list and detail pages read from one source. Each alert gained `frequencyLabel` (split out of the old combined `createdLabel` string), `stats` (newToday/totalMatches/viewed/saved), and a per-alert `matches` array. `a1`'s 6 matches are the literal Banani "Alerte Detail" mockup rows; `a2`/`a3`/`a5` reuse their existing recent-match entry as a 1-2-row illustrative set; `a4` (inactive) gets an empty array → real empty state on the detail page, not fabricated rows.
  - `/alertes/page.tsx` alert cards are now real `<Link href="/alertes/{id}">`s (previously static, non-interactive divs).
  - Header card: name, meta row (flag/country/transaction/created/frequency), full criteria chip row, Active/Inactive badge + a real local toggle (`useState`, visual only — no persistence), Modifier/Supprimer inert. 4 mini stat cards driven by `alert.stats`. Filters bar, view-mode toggle, export, per-row actions, pagination — all inert `disabled` + "Bientôt disponible", same convention as every sibling screen.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/alertes/a1` (full 6-match dataset) and `/alertes/a4` (empty state) at 375/768/1280px.

- [x] Nouvelle Demande — `nouvelle-demande` (screenId `ZYtkWqU8KVNc`, fetched live via MCP 2026-08-03) → `frontend/src/app/demandes/new/page.tsx`. Plan: `nouvelle-demande.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated by the user across every screen this session. No `PropertyRequest` Prisma model — nothing to persist to.
  - **Scope decision, disclosed**: Banani's stepper shows 3 steps ("Informations du bien" / "Budget" / "Contact") but the fetched HTML only contained step 1's fields. Implemented as a real gated wizard (`step` state, one step visible at a time, stepper bar reproduced 1:1 for its chrome) — step 1 is a faithful reproduction of the fetched markup (type de bien/transaction option-cards, localisation grid, caractéristiques/équipements/priorité/notes); **steps 2 ("Budget": min/max, mode de financement, délai) and 3 ("Contact": nom/téléphone/email, type de client, source, notes commerciales) were authored to match the same visual language, not fetched from Banani** — flagged for the user to compare against the real steps 2/3 if/when selected.
  - `/demandes/page.tsx`'s "Nouvelle demande" header button switched from disabled to a real `<Link href="/demandes/new">`.
  - All form fields are real client `useState` (option-card selections, équipements multi-select, priorité, budget inputs, contact fields) — "Enregistrer en brouillon" and the final "Créer la demande" stay inert (`disabled` + "Bientôt disponible"), same convention as every sibling screen. "Annuler" is a real `Link` back to `/demandes`.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass.

- [x] Demande Detail — `demande-detail` (screenId `DEDJyYeJPGFP`, fetched live via MCP 2026-08-03) → `frontend/src/app/demandes/[id]/page.tsx`. Plan: `demande-detail.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated by the user across every screen this session.
  - **Refactor**: extracted `/demandes`' request data into shared `frontend/src/lib/requests-data.ts` (`PropertyRequest`/`CriterionItem`/`TimelineEvent`/`SuggestedListing` types, `MOCK_REQUESTS`, `PROPERTY_TYPE_ICON`, `PRIORITY_STYLE`, `STATUS_LABEL`, `TRANSACTION_BADGE`), same pattern as the `alerts-data.ts` refactor. `r1` (Kouassi Brou / DEM-2025-001) already matched the fetched "Demande Detail" mockup exactly — its description/8 criteria/5-event timeline/internal notes/3 suggested listings are the literal fetched content; the other 7 requests got shorter illustrative detail content built to the same shape.
  - `/demandes/page.tsx`'s per-row "Eye" (view) action switched from disabled to a real `<Link href="/demandes/{id}">`.
  - Hero card (title/ref/date, urgent/status/transaction badges, 6-cell info grid), description, 8-item criteria grid, action timeline, client info card (avatar/type/phone/email/address + Message/Appeler), status & priority card, internal notes, suggested listings — all rendered from `requests-data.ts`. Every action button (Modifier, Marquer traitée, Message, Appeler, Ajouter une note, Suggérer une annonce, Clôturer) is inert `disabled` + "Bientôt disponible" — no `PropertyRequest` model to act on. Back arrow/breadcrumb are real navigation to `/demandes`.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/demandes/r1` (full literal dataset) at 375/768/1280px.

- [x] Messages Inbox — `messages-inbox` (screenId `u_egjun0aqjO`, fetched live via MCP 2026-08-03) → `frontend/src/app/messages/page.tsx`. Plan: `messages-inbox.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated across every screen this session. First screen to activate the sidebar/bottom-nav "Messages" entry — both `DashboardShell.tsx` and `BottomNav.tsx` had it declared but inert; switched to `href: '/messages'`.
  - **Layout decision**: `DashboardShell`'s content slot is a padded, vertically-stacking container built for stat cards/tables, not a bounded-height split-pane chat UI. Wrapped the whole messages UI in one `rounded-2xl bg-white` card sized `h-[75vh] min-h-[560px]`, with the conversation list and chat transcript each independently scrollable inside it. `DashboardShell` itself untouched beyond the two nav-href changes.
  - 7 static conversations (literal Banani list data). Conversation `c1` (Aïcha Diallo / Villa Cocody) is the mockup's selected conversation — its property-context block and full 8-entry transcript (incl. the visit-request card with Confirmer/Proposer autre date, and the trailing typing indicator) are the literal fetched content. The other 6 conversations get a short illustrative 2-message transcript + their own property-context block — flagged as a simplification (only conversation 1 was fully fetched).
  - Real interactions: selecting a conversation (marks read, swaps header/property-context/transcript), Tous/Non lus/Visites filter tabs (Visites filters to the one conversation with `hasVisit`), Archivés real empty state (nothing archived in mock data), conversation search. Mobile (`<lg:`) uses a `mobileView` list/chat toggle with a back arrow, matching the two-panel-collapses-to-one pattern used elsewhere. Chat input, send, attachments, emoji, header call/calendar/"Voir l'annonce", and the visit card's own actions are all inert `disabled` + "Bientôt disponible" — no messaging backend exists.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/messages` at 375/768/1280px, and to confirm the fixed `75vh` panel height reads correctly on their screen (a chat UI's height is usually the first thing worth eyeballing in a real browser).

- [x] Contacts Reçus — `contacts-recus` (screenId `fu-2n-YWUFP8`, fetched live via MCP 2026-08-03) → `frontend/src/app/contacts/page.tsx`. Plan: `contacts-recus.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated across every screen this session. Activates the sidebar's "Contacts reçus" nav entry (`DashboardShell.tsx`'s `NavKey = 'contacts'` was declared but inert) — switched to `href: '/contacts'`.
  - 6 static contacts (literal Banani mockup data: Amavi Kodjovi, Fatoumata Diallo, Koffi Assiongbon, Ama Owusu, Sékou Traoré, Emmanuel Gbénou), each carrying its own detail-panel fields (budget, per-contact activity feed) so the right-hand panel isn't just mirroring the table row.
  - 4 stat cards (Total contacts/Nouveaux 7j/En attente/Taux de conversion — illustrative, Banani's exact numbers, same convention as every other stats-bar screen this app), filters bar (search real, Statut/Cette semaine/Annonce selects inert), table + sticky 300px detail panel (fiche contact/activité récente/notes), pagination.
  - Real interactions: clicking a table row selects it (highlights + updates the whole detail panel), search filters the table client-side, notes textarea has real local per-contact `useState` (in-memory only, "Enregistrer" stays inert). Every other action (Exporter, Ajouter un contact, Liste/Grille toggle, per-row message/calendar/more icons, Envoyer un message, Planifier une visite, Enregistrer, pagination) is inert `disabled` + "Bientôt disponible" — no `Contact` model exists.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/contacts` at 375/768/1280px (detail panel moves below the table on mobile, per the plan).

- [x] Visites Programmées — `visites-programmees` (screenId `_COuZRy6uykc`, fetched live via MCP 2026-08-03) → `frontend/src/app/visites/page.tsx`. Plan: `visites-programmees.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated across every screen this session. Activates the sidebar's "Visites programmées" nav entry (`NavKey = 'visits'` was declared but inert) — switched to `href: '/visites'`.
  - Literal July 2025 month calendar grid (day 15 = "today", event pills colored by status), "Visites du jour" panel (2 items, real Toutes/Confirmées/En attente filter), "Prochaines visites" panel (3 items), and a 5-row "Toutes les visites" table (literal ref/property/price/client/date/location/type/status data) — all from the fetched mockup.
  - **Disclosed interpretation**: the Liste/Calendrier view tabs are real — "Calendrier" (default) shows the month grid + side panel above the table, "Liste" hides that section and shows only the full-width table. Banani only shipped the Calendrier state; the Liste behavior wasn't fetched, this is the sensible reading of a list/calendar tab pair.
  - Real interactions: view toggle, today's-visits status filter, table search (client-side on property/client name). Everything else (calendar prev/next month, week/month toggle, "Tout voir"/"Voir tout", table "Filtrer", per-row eye/pencil/x actions, "Exporter", "Planifier une visite") is inert `disabled` + "Bientôt disponible" — no `Visit` model exists, calendar is a static snapshot.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/visites` at 375/768/1280px.

- [x] Jetons VR — `jetons-vr` (screenId `w3s4uzJeNef2`, page title "Jetons & Visites Virtuelles", fetched live via MCP 2026-08-04) → `frontend/src/app/jetons/page.tsx`. Plan: `jetons-vr.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated across every screen this session. No `TokenBalance`/`TokenTransaction` Prisma model, nothing to persist to. Activates the sidebar's "Jetons & visites VR" nav entry (`NavKey = 'tokens'` was declared but inert) — switched to `href: '/jetons'`.
  - Literal balance figures (solde 240, visites VR actives 8, jetons utilisés 60/300), 4 token packs (Starter/Standard "Populaire"/Pro/Entreprise with per-jeton pricing), 4 VR-active listings, static SVG donut chart (3 segments: Visites VR 60% / Boost annonces 25% / Mise en avant 15%, drawn via `stroke-dasharray` circles, no charting library) with matching legend/progress bars, and a 5-row transaction history table (achat/utilisation/bonus with running balance column) — all from the fetched mockup.
  - Real interaction: pack selection (`selectedPack` `useState`) highlights the clicked card and swaps its CTA to "Sélectionné" — no purchase side-effect. Everything else ("Exporter", "Acheter des jetons", "Filtrer" on the transactions table) is inert `disabled` + "Bientôt disponible".
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/jetons` at 375/768/1280px.

- [x] Statistiques Agent — `statistiques-agent` (screenId `47H2Ss5450Kt`, page title "HABITAT-AFRIK — Statistiques", fetched live via MCP 2026-08-04) → `frontend/src/app/statistiques/page.tsx`. Plan: `statistiques-agent.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated across every screen this session. No analytics/reporting Prisma model, nothing to persist to. Activates the sidebar's "Statistiques" nav entry (`NavKey = 'stats'` was declared but inert) — switched to `href: '/statistiques'`.
  - Literal mockup data across 8 chart cards: 4 KPI cards (vues/contacts/visites/conversion, each with a trend badge), line chart "Évolution des vues" (static inline SVG path + area fill, 5 x-axis labels), donut "Répartition des annonces" (Vérifié/En attente/Vendu, `stroke-dasharray` circles, same technique as the Jetons VR donut), bar chart "Contacts reçus" (7 daily bars Lun–Dim), progress list "Suivi des documents" (4 items), ranking "Top annonces" (5 items, medal emojis for top 3), "Sources de trafic" (4-item progress list), "Répartition géographique" (6-city progress list).
  - Real interaction: the 7 jours/30 jours/3 mois/1 an period toggle (`useState`) switches the active pill only — chart data stays static since Banani only shipped the "30 jours" state (disclosed simplification, same pattern as prior screens' single-fetched-state charts). "Exporter" and every per-chart "Ce mois"/"Cette semaine" select are inert `disabled` + "Bientôt disponible". All charts are static inline SVG/CSS — no charting library.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/statistiques` at 375/768/1280px.

- [x] Landing Page — `landing-page` (screenId `YKST5vLCMORh`, page title "Habitat-Afrik — Accueil", fetched live via MCP 2026-08-05) → `frontend/src/app/page.tsx`. Plan: `landing-page.md`. Commit: (uncommitted).
  - **Flow mismatch caught before building**: first fetch attempt returned "Nouvelle Demande" (step 3, contact) from a *different* Banani flow ("Ulrich Projet 2") than requested — flagged to the user instead of building the wrong screen; user re-selected in Banani and the re-fetch confirmed `screenName: "Landing Page"`. This confirms the "always fetch the exact screen, never improvise" convention paid off again.
  - **Different flow than every other screen this session**: "Ulrich Projet 2" (`E_uHv0vTnPhR`) vs. the "HABITATAFRIK EQUIPE" flow used for the agent dashboard screens — this is the **public marketing homepage**, not part of the back-office. Same brand/colors, separate design source.
  - **Replaces** the existing `redirect('/login')` in `frontend/src/app/page.tsx` (not the CLAUDE.md-documented `return null` stub — the repo had already been customized to redirect). Not wrapped in `DashboardShell` (public unauthenticated page, own navbar + footer).
  - 9 sections built from the literal Banani mockup: navbar, hero (full-bleed image + 4-country pill strip + floating search panel), brand-colored stats band (3 stats), premium listings (6 literal cards + 5 filter pills), destinations-by-country (4 literal cards: Bénin/Togo/Côte d'Ivoire/Sénégal), agents (1 featured editorial card + 3 compact cards, literal names/bios/stats), how-it-works (3 steps), CTA gradient band, 4-column footer. All images use the literal Banani-hosted URLs (`storage.googleapis.com/banani-generated-images/...`, `banani-avatars/...`) via plain `<img>`, same convention as prior avatar-heavy screens.
  - **Real interaction**: listing pill-tabs (Toutes/Maisons/Appartements/Terrains/Location) — real client-side filter (`useState`) over the 6 static cards; category/transaction tags per card were inferred from each listing's title/badges (disclosed, Banani's cards don't carry explicit filter-category data). "Connexion" is a real `Link` to `/login` (existing route).
  - Everything else (search panel fields/button, all other nav links, every "Voir →"/"Voir toutes les annonces"/"Explorer"/"Voir le profil"/"Découvrir tous les agents"/CTA actions, footer links, social icons) renders as a non-interactive styled `<span>` (`InertLink` helper, `cursor-not-allowed` + `title="Bientôt disponible"`) rather than a dead `<a href="#">` — no public listings-search, signup, or agent-profile routes exist yet.
  - **Substitution**: `lucide-react`'s `Facebook`/`Instagram`/`Twitter` icons don't exist in the installed version (`TS2305`, caught by typecheck) — swapped the 3 footer social buttons for plain bold-letter labels (`f`/`in`/`x`) instead of icons.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/` at 375/768/1280px, especially the floating search panel (desktop-only per the mockup, hidden below `lg:`) and the hero image legibility over the gradient overlay.

- [x] Annonces Listing — `annonces-listing` (screenId `wK7wVS2Vnz1J`, page title "Habitat-Afrik — Toutes les annonces", fetched live via MCP 2026-08-05) → `frontend/src/app/annonces/page.tsx`. Plan: `annonces-listing.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated across every screen this session. Same public flow ("Ulrich Projet 2") as `landing-page` — no public listings-search backend, no `Listing` public API.
  - **Refactor**: extracted the navbar and footer — identical markup on both `landing-page` and this screen — into shared `frontend/src/components/public/PublicNavbar.tsx` (`active` prop) and `PublicFooter.tsx`. `page.tsx` (landing) updated to consume both instead of its inline copies; dropped its now-unused `Home`/`Link` imports. Normalized the navbar to the landing page's fuller 5-link set (`Accueil/Annonces/Agents/Demande/Comment ça marche`) even though this screen's Banani fetch only shipped 4 (no "Demande") — disclosed simplification for public-site nav consistency.
  - Page header (breadcrumb, title, "128 annonces trouvées" result count — literal Banani copy, not derived from the 9 rendered mock cards), sticky filter bar (pays/villes/type/transaction/prix pills + "Plus de filtres" + tri), 260px sidebar filters (type de bien/transaction/prix range mock/pays/surface, all with literal counts from the mockup), 9 literal listing cards (title/location/agent name+avatar/features/price/badges), pagination (1/2/3/4/…/15).
  - Real interactions: grid/list view toggle (list renders the same 9 cards in a denser single-column row layout — disclosed interpretation, Banani only shipped the grid state) and the 6-pill type-tabs row (Toutes/Maisons/Appartements/Terrains/Bureaux/Location) filtering the 9 mock cards client-side, same convention as the landing page's listing filter.
  - Everything else (sidebar filter checkboxes/price slider/pays/surface, top filter-bar pills, sort select, "Réinitialiser"/"Appliquer les filtres", every card's "Voir →", pagination numbers) is inert via the same `InertPill`/non-interactive-span convention used on the landing page — no public search backend exists.
  - **Disclosed gap**: no mobile off-canvas filter drawer built this pass — the 260px sidebar is `hidden` below `lg:` with no replacement, same "not everything fetched gets full mobile treatment" pattern flagged on other screens.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/annonces` at 375/768/1280px, and confirm the missing mobile sidebar-filters gap is acceptable for now.

- [x] Demande Immobilière (public) — `demande-immobiliere` (screenId `2NroFS5QcFFJ`, page title "Habitat-Afrik — Demande Immobilière", fetched live via MCP 2026-08-05) → `frontend/src/app/demande-immobiliere/page.tsx`. Plan: `demande-immobiliere.md`. Commit: (uncommitted).
  - Same "front-end only, static data" scope repeated across every screen this session. No `PropertyRequest` public model, no matching/notification backend.
  - **Third distinct Banani flow this session**: "Projet Propré" (`m2kVFGxniJZl`) — different from both "HABITATAFRIK EQUIPE" (agent dashboard) and "Ulrich Projet 2" (`landing-page`/`annonces-listing`). Visually consistent with the public site though — its navbar links (Accueil/Annonces/Agents/Demande active/Comment ça marche) match `PublicNavbar` exactly, so it reuses `PublicNavbar`/`PublicFooter` directly with no changes needed to those shared components.
  - Route intentionally **not** `/demandes` (that's the existing authenticated agent-dashboard route from earlier this session) — this is the buyer-facing public marketing page for the "Demande Immobilière" feature, a different persona.
  - Sections built from the literal Banani mockup: gradient hero (sky-blue, distinct one-off gradient from the brand-blue CTA gradient, matches the mockup's dedicated hero color) with a frosted stats card (320+ demandes/94% correspondance/48h délai), "Comment ça marche" 4-step grid, "Demandes en cours" anonymized public table (6 literal rows: type/localisation/transaction/budget/superficie/statut/correspondances/date, with type badges Villa=brand/Appartement=violet/Terrain=amber/Bureau=emerald and status badges Active=emerald/En attente=amber/Clôturée=gray), FAQ 2×2 grid (4 literal Q/A), CTA gradient band.
  - Pure marketing/informational page — no real interactivity in the fetched mockup (no filters/toggles). Every action ("Déposer une demande" ×2, "Voir mes demandes", "Voir les annonces", table-header "Déposer ma demande") renders as an inert `InertLink` span — no authenticated buyer-request flow exists yet at a public route.
  - `pnpm typecheck` and `pnpm lint` both clean. `pnpm format` run. No dev-server/browser breakpoint verification this pass — ask the user to eyeball `/demande-immobiliere` at 375/768/1280px, especially the table's `overflow-x-auto` wrap on mobile.

- [x] Mes Annonces — `mes-annonces` (screenId `V9hOWu9LzoGk`, fetched live via MCP 2026-07-31) → rebuilt `frontend/src/app/listings/page.tsx`. Plan: `mes-annonces.md`. Commit: (uncommitted). Supersedes an earlier generic `/listings` draft built the same day from a non-Banani spec (`docs/superpowers/specs/2026-07-31-listings-page-design.md`, `docs/superpowers/plans/2026-07-31-listings-page.md`) *before* the user pointed to the actual selected Banani screen — the user caught the mismatch on review ("tu n'as pas respecté exactement le design"). Only that earlier pass's `frontend/src/lib/listings.ts` extraction survived; the page itself was rebuilt from scratch against the real mockup.
  - **8 scope decisions, all "go with your recommendations"** (full rationale in `mes-annonces.md`): (1) new `Listing.transactionType: SALE | RENT` field drives the Type pill + "/ mois" price suffix — `propertyType` isn't shown on this screen; (2) photo thumbnails are a neutral placeholder (no Cloudinary listing-photo feature yet); (3) Contacts column shows `—` (no `Contact` model, no fabricated numbers); (4) ref code `#ANN-{year}-{id suffix}` derived, not a real sequence; (5) row checkboxes are decorative (no bulk actions/backend); (6) true numbered pagination built on top of the existing cursor API via client-side sequential prefetch-and-cache (no backend contract break); (7) the 4 stats-bar cards are REAL (`counts` field, not illustrative like the Agent Dashboard's KPIs); (8) dropped the redundant "Filtrer" button (Ville/Type selects + status tabs already cover it).
  - Migration `14_add_listing_transaction_type` applied to Neon. `GET /api/listings` extended: `transactionType` added to `select`, new `counts: { total, verified, pending, sold }` (4 parallel `prisma.listing.count()` calls scoped to `userId`, independent of pagination/cursor). 2 new tests (9 total in `route.test.ts`, all passing).
  - **Known caveat, disclosed in-UI**: search/city/type/status filters apply only to the currently displayed page's rows (pagination stays cursor-based server-side under the hood) — a small note appears under the table when a filter is active.
  - 685/685 unit tests pass, `pnpm typecheck`/`lint` clean (same 2 pre-existing unrelated `preferences/*` typecheck errors noted throughout this file). SSR verification only (`/listings` → 200, `/api/listings` unauthenticated → 401) — same headless-browser sandbox limitation as every other screen this project; **ask the user to eyeball 375/768/1280px in a real browser** before considering this fully pixel-verified.
  - **Not done this pass**: `annonces-mobile` (desktop-first, same convention as Agent Dashboard → dashboard-mobile).

- [x] Publier Annonce Alt — `publier-annonce-alt` (screenId `93t22EgsWF0x`, fetched live via MCP 2026-07-31) → `frontend/src/app/listings/new/page.tsx`. Plan: `publier-annonce-alt.md`. Commit: (uncommitted). User explicitly picked **Alt** as the canonical variant of the 4 `publier-annonce*` screens.
  - **8 scope decisions, all "go with your recommendations"**: (1) `Listing.transactionType` gains a 3rd value `SHORT_RENT` ("Location courte durée"); (2) single continuous scrolling form with a clickable-anchor stepper sidebar (not a gated wizard) — matches "Alt" being the alternate/simpler layout; (3) full scope built for real (all 5 sections persisted, no placeholders) — same size class as the "Documents légaux" pass; (4) no `accountType` gate added — stays open to any authenticated user like every other route; (5) no client-side autosave timer — "Enregistrer le brouillon" is a real, manually-triggered save (CLAUDE.md's no-`setInterval` cron philosophy applied to the client too); (6) `Listing.status` gains `DRAFT` (new listings start here); (7) successful publish redirects to `/listings`; (8) draft resume/edit is out of scope — create-only, `PATCH` refuses non-DRAFT listings with 409.
  - New Prisma columns on `Listing`: `description`, `surfaceM2`, `yearBuilt`, `standing`, `roomsTotal`, `bedrooms`, `bathrooms`, `amenities` (`Json`, string array) — all nullable, required-for-publish validation happens at the API layer not the DB. New models `ListingPhoto` (multi-photo, one `isPrimary`) and `ListingDocument` (3 fixed types: `LAND_TITLE`/`SALE_MANDATE`/`CADASTRAL_PLAN`, same upsert-by-type + PENDING-on-upload convention as the user-level `LegalDocument`). Migration `15_add_listing_publish_fields`, applied to Neon.
  - New routes: `POST /api/listings` (creates a bare DRAFT so the page has a `listingId` to attach uploads to immediately — no client-side staging of unsaved files); `PATCH /api/listings/[id]` (partial draft save, or `publish: true` which merges incoming fields with the stored draft, validates every required field/photo/document, and only then flips status to `PENDING`, returning `400 PUBLISH_REQUIREMENTS_NOT_MET` with a `missing` array otherwise); `POST /api/listings/[id]/photos` + `DELETE .../photos/[photoId]` (Cloudinary, image-only, 20-photo cap, auto-primary-on-first-upload, promotes the next photo to primary when the primary is deleted); `POST /api/listings/[id]/documents` (mirrors `/api/legal-documents`'s trust boundary exactly, keyed by `listingId` instead of `userId`). All edit routes refuse non-DRAFT listings with 409 and scope ownership checks to 404 (not 403) on mismatch. `GET /api/listings` (Mes Annonces) now excludes DRAFT rows from both the list and the stats counts — an unfinished draft would otherwise be a confusing dead row with no way to resume it this pass.
  - `/listings` page's "Publier une annonce" button is no longer disabled — links to `/listings/new`.
  - 55 new tests across the 5 new/modified route test files (POST create, PATCH save/publish/validation, photos POST/DELETE incl. primary-promotion, documents POST) — 735/735 total pass. `pnpm typecheck`/`lint` clean (same 2 pre-existing unrelated `preferences/*` errors). Dev-server curl checks: `/listings/new` → 200, all 4 new API routes → 403 without a CSRF token (confirms the gate fires before touching the DB) — same sandbox limitation as every other screen, no authenticated-browser screenshot possible; **ask the user to walk through the actual publish flow (fill form → upload photos/docs → publish) in a real browser.**
  - **Not done this pass**: `publier-annonce` (the literal non-Alt wizard variant, if ever needed), `annonces-mobile`/mobile responsive pass for this screen, admin verification workflow for `ListingDocument` (stays PENDING forever until that ships, same disclosed gap as the user-level legal documents feature).
  - **2026-07-31 revision** (user correction, post-initial-build): converted from a single continuous scroll into an actual gated wizard — only one section renders at a time (`step` state), with a "Étape précédente / Étape suivante" nav bar and a clickable sidebar (jumps to any step, no longer anchor links). Also removed the "Documents légaux" section from the form entirely per user request; since the backend still required `LAND_TITLE`/`SALE_MANDATE` to publish and there was no other UI to supply them, the `PATCH /api/listings/[id]` publish-requirements check was updated in lockstep (dropped the `documents.*` missing checks, confirmed via `AskUserQuestion`) — publish now only requires title/description/price/surfaceM2/city/country/propertyType/transactionType/photos. `ListingDocument`/`POST /api/listings/[id]/documents` routes are untouched and still usable by a future "modifier annonce" screen. 4 wizard steps: Type → Informations de base → Équipements → Photos. 55 listings tests still pass (1 assertion adjusted to drop the two `documents.*` expectations), typecheck/lint clean, dev-server verified (`/listings/new` → 200, `/listings` → 200, unauthenticated PATCH → 403).

## Pending — archived, not yet implemented (48 screens)

Raw source for each is in `.planning/banani/raw/<slug>.html` (+ `.meta.json`
for theme tokens). Slug list (from `_index.json`), grouped by apparent area:

**Auth / onboarding**
- `login-mobile`, `register-mobile`
- `otp-verification` (note: distinct from `sms-verification`, which is now implemented — this one was NOT part of the 4-screen selection and remains unimplemented)
- `new-password-mobile`, `success-mobile`

**Dashboard / agent**
- `statistiques-agent`, `statistiques-mobile`
- `mon-agence-mobile` (desktop `mon-agence` now Done — phase 1, see above)

**Annonces (listings)**
- `publier-annonce`, `publier-annonce-mobile`, `publier-annonce-alt-mobile` (desktop `publier-annonce-alt` now Done, see above)
- `modifier-annonce`, `modifier-annonce-mobile`, `modifier-annonce-mobile-x9tyh65n9hgj` (duplicate-named variant — check both, one may be stale)
- `annonces-mobile` (desktop `mes-annonces` now In progress, see above)
- `annonce-detail`, `annonce-detail-mobile`

**Messaging / contacts / visites**
- `messages-inbox`, `messages-mobile`
- `contacts-recus`, `contacts-mobile`
- `visites-programmees`, `visites-mobile`

**Notifications / alerts**
- `notifications-center`, `notifications-mobile`
- `alerte-secteur`, `alerte-secteur-mobile`, `alerte-secteur-mobile-pjd6hr3sh_pr` (duplicate-named variant — check both)

**Settings**
- `settings-mobile` (desktop `settings-page` now Done, see above)
- `apparence-mobile` (desktop `apparence-settings` now Done, see above)
- `langue-region-mobile` (desktop `langue-region` now Done, see above)
- `documents-legaux-mobile` (desktop `documents-legaux` now Done, see above)
- `centre-aide`, `centre-aide-mobile`

**Billing**
- `abonnement-mobile` (desktop `abonnement-paiement` now Done, see above)
- `jetons-vr`, `jetons-vr-mobile`

## Open design questions
- Hero background image (login screen) is hotlinked from Banani's storage bucket — swap for a self-hosted asset before prod. Raised 2026-07-23.
- Phone country-code prefix ("+229 ▾") is visual-only in this pass, no country picker logic. Raised 2026-07-23.
- No live screenshot verification was possible for the login screen this session — headless Chromium download (Playwright) stalled/blocked in this sandboxed environment. Recommend opening http://localhost:3000/login in a real browser at 375/768/1280px to confirm pixel parity.
- Two screen names each have 2 variants with the same name (`Modifier Annonce Mobile`, `Alerte Secteur Mobile`) — both archived under distinct slugs; figure out with the user which one is current/intended before implementing.
- Several screens reference hotlinked Banani-generated stock photos (property photos, map thumbnails) — same self-hosting caveat as the login hero image, multiplied across every listing-related screen.
