# Login Screen — Banani → Next.js 16 / Tailwind v4

## Source
- Banani flow: "HABITATAFRIK EQUIPE" (`https://app.banani.co/flow/DRXBZMH20_G8`)
- Screen ID: `Fz9eihsTRNuO` — "Login Screen"
- Fetched: 2026-07-23

## Decisions (confirmed with user)
1. **Phone-based login**: add `phone` (E.164, nullable+unique) to `User`. `/api/auth/login` accepts `{ phone, password }` looked up by phone, not email. Existing email/password accounts are untouched (email stays the account's primary identifier for signup/reset/notifications — those flows are out of scope for this screen). A user cannot yet self-register a phone number until the Signup screen is built (deferred) — so phone-login is functionally inert for brand-new signups until then, which is expected.
2. **Facebook OAuth**: implement for real, modeled on `lib/server/oauth/google.ts`. `arctic`'s `Facebook` provider has no PKCE/id_token — needs a Graph API call (`GET https://graph.facebook.com/me?fields=id,name,email`) to fetch profile after `validateAuthorizationCode`. Env-gated (`FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET`/`FACEBOOK_REDIRECT_URI`), inert (404) without envs — same pattern as Google.
3. **Post-login redirect**: `/dashboard` — create a minimal placeholder page (doesn't exist yet) using `useUser()`.
4. **Scope**: Login screen only this pass. "S'inscrire" / "Pas encore de compte" link to `/signup`, "Mot de passe oublié" links to `/forgot-password` — both currently unbuilt routes (will 404 until their own Banani screens are selected and implemented). Acceptable per user's "continue with Login only" decision.

## Structure map
- **Left panel** (50% width, desktop only) — full-bleed background photo + dark gradient overlay, logo top-left, hero headline + subheadline + pagination dots bottom-left. Decorative — hidden on mobile (no room, and the design has no mobile spec for it).
- **Right panel** — scrollable form column: top-right "S'inscrire" pill link, form header (title + subtitle), phone field (country-code prefix + number), password field (with show/hide toggle + forgot-password link), primary CTA, divider, 2 social buttons (Google, Facebook), bottom signup prompt.

## Component breakdown
- **NEW** `src/components/ui/Button.tsx` — `variant: 'primary' | 'social'`, `size` not needed (single size in this design). Primary = filled brand button; social = outlined icon+label button.
- **NEW** `src/components/ui/TextField.tsx` — label + input shell, focus ring, optional trailing icon slot (used for password show/hide).
- **NEW** `src/components/ui/PhoneField.tsx` — label + country-prefix segment (flag + dial code, static "+229" for now — no country picker logic in this design pass, just visual) + number input.
- **NEW** `src/components/auth/AuthSplitLayout.tsx` — the reusable left-hero/right-form shell (will be reused by Signup, Forgot Password, Reset Password later).
- **NEW** `src/app/login/page.tsx` — composes the above, wires to `/api/auth/login`.
- **REUSE** `useAuth()` / `AuthContext` (`refresh()` after login), `api()` / `ApiError` from `@/lib/api`.
- **PRIMITIVE new dep**: `lucide-react` (design uses Lucide icons via iconify in the Banani mock — home, user-plus, chevron-down, eye, chevron-down).

## Token mapping (Banani → project)
Project ships zero Tailwind `@theme` customization (`globals.css` is just `@import 'tailwindcss';`). This is the **first screen**, so the plan extends `@theme` once with this design's tokens (reused by every future screen fetched from the same Banani flow):

| Banani token | Value | Tailwind |
|---|---|---|
| `--primary` / `--accent` | `#376BFF` | `@theme { --color-brand: #376BFF; }` → `bg-brand` / `text-brand` |
| `--foreground` | `#111111` | `text-neutral-900` (close enough, no override needed) |
| `--muted-foreground` | `#9CA3AF` | `text-gray-400` |
| `--border` | `#00000014` | `border-black/[0.08]` |
| `--input` bg | `#F7F8FA` | `bg-gray-50` |
| `--radius-lg` | `10px` | `@theme { --radius-brand-lg: 10px; }` → `rounded-[10px]` (Tailwind's default `rounded-lg`=8px is close but not exact — use arbitrary value for pixel parity) |
| Font: Sora (headings) / Inter (body) | — | Inter is already wired via `next/font/google` in `layout.tsx`. Add Sora the same way for headline-weight text only. |

## Responsive plan (mandatory)
- **Base (375px)**: left panel hidden entirely (`hidden md:flex`). Right panel is full-width, padding drops to `px-6 py-8`. Top-right "S'inscrire" pill stays. Form title drops from 32px → 24px (`text-2xl md:text-3xl`). Social buttons stack full-width (`flex-col md:flex-row`) since two 48px-min-height buttons side-by-side at 375px get too cramped for the button text.
- **md (768px+)**: left panel appears (`hidden md:flex`, 50/50 split via flex). Right panel padding grows to the design's `60px`. Social buttons go side-by-side.
- **lg (1024px+) / the Banani mock**: pixel-faithful reproduction — 50/50 split, 36/60/48 paddings, 32px form title, 48px hero title on the left panel.
- Touch targets: inputs/buttons already ≥48px per the design's own `min-height: 48px` — kept as-is, satisfies the ≥48px rule natively.

## Interactions / state
- Password field: show/hide toggle (client state, `type` swap, `lucide-react` `Eye`/`EyeOff`).
- Phone field: static `+229` prefix (no country dropdown logic — visual chevron only, matches design; not a functional picker in this pass).
- Submit: disabled + "Connexion…" label while in flight.
- Google button: plain `<a href="/api/auth/oauth/google/start?next=/dashboard">` (top-level nav, per the existing `login.tsx` example pattern — never a fetch).
- Facebook button: same pattern, `/api/auth/oauth/facebook/start?next=/dashboard`.
- Error banner above the CTA, mapped from `ApiError.code`:
  - `INVALID_CREDENTIALS` → "Numéro ou mot de passe incorrect."
  - `LOCKED_OUT` → "Compte temporairement verrouillé. Réessayez plus tard."
  - `ACCOUNT_SUSPENDED` → "Ce compte a été suspendu. Contactez le support."
  - `TOO_MANY_LOGIN_ATTEMPTS` → "Trop de tentatives. Réessayez dans quelques minutes."
  - fallback → `err.message`
- Keyboard: visible focus ring (`focus-visible:ring-2 ring-brand`) on every interactive element; logical tab order (phone → password → forgot-link → submit → social buttons → signup link).

## Copy / i18n
No i18n system in this headless starter — French strings are written directly in JSX (matches the Banani source, matches the target market). All strings live inline in `login/page.tsx` (no shared `constants.ts` dictionary exists in this project; introducing one is out of scope for a single screen).

## Backend changes (prerequisite, not part of "UI translation" but required for the screen to function)
1. `frontend/prisma/schema.prisma` — add `phone String? @unique` + `@@index([phone])` on `User`. New migration via `pnpm db:migrate:dev`.
2. `frontend/src/app/api/auth/login/route.ts` — swap `LoginSchema` from `{ email }` to `{ phone: zPhone }`; lookup `prisma.user.findUnique({ where: { phone } })`; keep lockout/rate-limit calls but key them by the phone string instead of email (the helpers are generically keyed strings despite the "email" naming — no rename, just pass phone).
3. `frontend/src/lib/server/oauth/facebook.ts` — new, modeled on `google.ts`: `tryCreateFacebookProvider()`, `fetchFacebookUser(accessToken)` (Graph API call).
4. `frontend/src/app/api/auth/oauth/facebook/{start,callback}/route.ts` — new, modeled on the Google pair (no PKCE cookie needed — Facebook's arctic client doesn't take/require a verifier).
5. `.env.example` — document `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` / `FACEBOOK_REDIRECT_URI` next to the Google section.
6. `frontend/src/app/dashboard/page.tsx` — minimal placeholder (`useUser()` + logout button) since nothing redirects there yet.
7. `package.json` — add `lucide-react`.

## Implementation checklist
- [ ] Schema migration (`phone` on User)
- [ ] Login route rewritten for phone
- [ ] Facebook OAuth provider + start/callback routes
- [ ] `.env.example` Facebook section
- [ ] `lucide-react` dependency
- [ ] UI primitives (Button, TextField, PhoneField, AuthSplitLayout)
- [ ] `/login` page wired to `/api/auth/login` + Google/Facebook hrefs
- [ ] `/dashboard` placeholder page
- [ ] 375px check
- [ ] 768px check
- [ ] 1280px check (pixel compare vs Banani mock)
- [ ] `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
- [ ] Manual dev-server check of the login flow (phone+password against a seeded user, Google button redirect, error states)

## Open questions for user
- Background hero photo is hotlinked from Banani's own generated-image bucket (`storage.googleapis.com/banani-generated-images/...`) — fine for now (dev), but should be swapped for a self-hosted/Cloudinary asset before shipping to prod since Banani doesn't guarantee that URL stays alive. Not blocking this pass.
- No country-picker logic behind the "+229 ▾" prefix (visual only) — confirm this is fine for now, or if country selection should be wired later.
