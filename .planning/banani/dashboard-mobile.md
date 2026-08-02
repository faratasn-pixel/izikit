# Dashboard Mobile — Banani → Next.js/Tailwind

## Source
- Banani screen ID: `7lN40rBbl4AH` ("Dashboard Mobile")
- Fetched: 2026-07-24

## Why this exists
The current `/dashboard` (`frontend/src/app/dashboard/page.tsx` +
`frontend/src/components/dashboard/DashboardShell.tsx`) has **zero responsive
treatment** — the 248px fixed sidebar and hardcoded `grid-cols-4` /
`grid-cols-3` rows render as-is on a 375px viewport, producing the broken
squeeze the user flagged. Banani's "Dashboard Mobile" screen isn't a shrunk
desktop layout — it swaps the left sidebar for a compact topbar + fixed
bottom tab bar, which is the correct mobile nav paradigm and what we build
toward.

## Structure map (Banani mobile screen)
- **Topbar** (compact, no search box): logo mark, notif bell + dot, user
  avatar + name + role pill — same data as desktop topbar, different layout.
- **Banner**: hero image + greeting, shorter (`min-height: 190px` vs desktop
  210px), no stat cards baked into it (stats moved below as their own grid).
- **Stats grid**: `2 columns` (not desktop's 4).
- **3 chart cards**: donut (annonces), bar (contacts), progress (documents)
  — stacked full-width vertically (not desktop's 3-column row).
- **Table card** ("Mes annonces"): compact toolbar (icon-only filter,
  short "Publier" label vs desktop's "Publier une annonce"), rows as
  stacked info blocks (title/id/location/type tag left, price/badge right)
  — NOT the desktop `<table>` grid, a card-row layout instead.
- **Bottom nav**: 5 tabs — Dashboard (active), Messages (badge "5" in
  mockup), Annonces, Alerte secteur, Paramètres.

## Component breakdown
- **REUSE** `InitialsAvatar`, `useApi`, `useAuth`/`useUser`, `/api/listings`,
  `/api/notifications/count` — same data sources as desktop, no backend change.
- **NEW** `MobileTopbar` (`components/dashboard/MobileTopbar.tsx`) — logo,
  notif bell, user pill. Lives inside `DashboardShell`, shown `lg:hidden`.
- **NEW** `BottomNav` (`components/dashboard/BottomNav.tsx`) — fixed bottom
  tab bar, 5 tabs, only "Dashboard" has a real `href` (matches the existing
  sidebar's "Bientôt" convention for unbuilt screens).
- **MODIFY** `DashboardShell.tsx` — sidebar becomes `hidden lg:flex`, desktop
  topbar becomes `hidden lg:flex`, mount `MobileTopbar` + `BottomNav` at
  `lg:hidden`, add `pb-[76px] lg:pb-0` to the content scroll area so content
  isn't hidden behind the fixed bottom nav.
- **MODIFY** `dashboard/page.tsx` — make every hardcoded grid mobile-first:
  stats `grid-cols-2 lg:grid-cols-4`, charts `grid-cols-1 lg:grid-cols-3`,
  banner paddings/min-height scale down below `lg:`. Table: keep the real
  `<table>` markup (already has `overflow-x-auto`) rather than rebuilding as
  Banani's stacked card-rows — cheaper, still usable via horizontal scroll,
  and avoids a second parallel row-rendering implementation. Toolbar button
  labels shrink to icon-only / short label below `lg:` to avoid overflow.

## Token mapping (Banani → project)
Same design tokens the rest of the app already uses (`--primary: #376BFF` =
existing `bg-brand`/`text-brand`, `--radius-xl: 12px` = `rounded-xl`,
Sora for headings / Inter for body — already the app's font stack). No new
tokens needed.

## Responsive plan
- **Base (375px)**: mobile topbar + bottom nav, 2-col stats, stacked charts,
  compact banner, table toolbar icon-only filter + short "Publier" label.
- **lg (1024px+)**: current desktop layout unchanged — sidebar, desktop
  topbar with search box, 4-col stats, 3-col charts row, full table toolbar.
- Nothing between (no dedicated tablet treatment) — matches how the rest of
  the app's admin/back-office screens are built (mobile + desktop only).

## Open questions for user
1. **Messages badge "5"** in the Banani mockup — Messages isn't built yet
   (renders inert, same as desktop sidebar). Showing a fake unread count for
   a non-existent feature would be fabricated data. **Plan: omit the badge**,
   keep the tab inert like the others. Flag if you'd rather keep the "5" as
   a placeholder.
2. **Table rows on mobile**: keeping the existing `<table>` (scrolls
   horizontally) instead of rebuilding Banani's stacked-card row layout —
   faster, one row-rendering path to maintain, but less faithful to the
   mockup's exact mobile row design. Say if you want the full stacked-card
   rows instead.
3. Bottom nav order/tabs mirror Banani exactly (Dashboard, Messages,
   Annonces, Alerte secteur, Paramètres) — all but Dashboard stay inert
   "Bientôt" like the desktop sidebar, consistent with what's actually built.

## Implementation checklist
- [ ] `MobileTopbar` component
- [ ] `BottomNav` component
- [ ] `DashboardShell` responsive wiring (sidebar/topbar hidden lg:, mobile
      nav hidden above lg:, bottom padding for content)
- [ ] `dashboard/page.tsx` mobile-first grids or banner/table toolbar
- [ ] 375px check — no horizontal overflow, bottom nav doesn't clip content
- [ ] 768px check
- [ ] 1024px+ check — matches existing desktop pixel-for-pixel (no regression)
- [ ] Touch targets ≥ 44px on bottom nav / topbar icons
- [ ] `pnpm format && lint && typecheck && test`
