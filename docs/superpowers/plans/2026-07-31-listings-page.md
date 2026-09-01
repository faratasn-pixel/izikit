# Listings Page ("Mes annonces") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/listings` page ("Mes annonces") with a searchable, filterable, cursor-paginated table of the current user's listings, and wire the existing (currently inert) nav links to it.

**Architecture:** A new client page (`frontend/src/app/listings/page.tsx`) inside the existing `DashboardShell`, consuming the already-shipped `GET /api/listings` cursor-paginated endpoint. Shared display logic (types, labels, price formatting) is extracted from `frontend/src/app/dashboard/page.tsx` into a new `frontend/src/lib/listings.ts` module so both pages stay in sync. No backend changes.

**Tech Stack:** Next.js 16 App Router, React client components, Tailwind v4, lucide-react icons, existing `useApi`/`api` fetch helpers.

## Global Constraints

- No new API routes, no Prisma changes — `GET /api/listings` (`frontend/src/app/api/listings/route.ts`) already returns everything needed (`{ items: Listing[], nextCursor: string | null }`), scoped to the authenticated user.
- Publish/View/Edit actions stay disabled (`disabled` + `title="Bientôt disponible…"`) — their backend (`POST`/detail/`PATCH`) does not exist yet and is out of scope.
- Search and status/type filtering are **client-side only**, applied to listings already loaded in memory (no new query params on `/api/listings`).
- French UI copy only, matching the existing tone in `dashboard/page.tsx` (e.g. "Aucune annonce pour l'instant", "Bientôt disponible").
- Tailwind utility classes only — no new UI/component library. Match the existing visual language: `font-sora` for headings, `rounded-2xl` / `rounded-lg` cards and inputs, `border-black/[0.06]` / `border-black/[0.08]` hairlines, `bg-brand` / `text-brand` for the accent color, `text-gray-400` for secondary text.
- **No automated tests for this feature.** Confirmed before writing this plan: `frontend/src/lib/*.test.ts`, `frontend/src/components/**/*.test.tsx`, and `frontend/src/app/**/*.test.tsx` all return zero matches — this codebase has no test convention for client-side pages/components/libs (only API routes and `lib/server/*` are unit-tested). Verify each task manually with `pnpm dev` + browser instead of writing Vitest specs for this UI work.
- Run `pnpm format && pnpm lint && pnpm typecheck` before each commit per CLAUDE.md. **Caveat:** at the time of writing, `pnpm typecheck` already fails on two pre-existing, unrelated errors (`frontend/src/app/api/preferences/appearance/route.ts` and `.../regional/route.ts`, `exactOptionalPropertyTypes` violations). These are not part of this plan's scope — confirm your diff doesn't introduce *new* typecheck errors (e.g. by checking the output only mentions those two files), rather than expecting a fully clean run. The pre-commit hook will still fail on this pre-existing state; committing this feature's tasks therefore requires `git commit --no-verify` until that unrelated issue is fixed separately — confirm with the user before using it, same as was done for the design spec commit.

---

### Task 1: Extract shared listings display logic into `lib/listings.ts`

**Files:**
- Create: `frontend/src/lib/listings.ts`
- Modify: `frontend/src/app/dashboard/page.tsx:1-59` (imports + local type/const/function removal), `frontend/src/app/dashboard/page.tsx:354` (call site)

**Interfaces:**
- Produces: `Listing` (type), `PROPERTY_TYPE_LABEL: Record<string, string>`, `STATUS_LABEL: Record<string, string>`, `STATUS_STYLE: Record<string, { label: string; className: string }>`, `formatListingPrice(price: number, currency: string): string` — all exported from `@/lib/listings`, consumed by Task 2/3's `/listings` page and by `dashboard/page.tsx`.

Note the name `formatListingPrice` (not `formatPrice`) is deliberate: `frontend/src/lib/utils.ts` already exports a generic `formatPrice(amount, currency)` with different behavior (no XOF→FCFA relabeling). Reusing the name would collide/confuse — keep them distinct.

- [ ] **Step 1: Create `frontend/src/lib/listings.ts`**

```ts
export interface Listing {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  price: number;
  currency: string;
  status: string;
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  VILLA: 'Villa',
  APARTMENT: 'Appartement',
  LAND: 'Terrain',
  DUPLEX: 'Duplex',
  OFFICE: 'Bureau',
};

export const STATUS_LABEL: Record<string, string> = {
  VERIFIED: 'Vérifié',
  PENDING: 'En attente',
  SOLD: 'Vendu',
};

export const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: `✓ ${STATUS_LABEL.VERIFIED}`, className: 'bg-emerald-100 text-emerald-800' },
  PENDING: { label: `⏳ ${STATUS_LABEL.PENDING}`, className: 'bg-amber-100 text-amber-800' },
  SOLD: { label: STATUS_LABEL.SOLD, className: 'bg-red-100 text-red-800' },
};

/** Format a listing price stored in its smallest currency unit (e.g. XOF has no decimals). */
export function formatListingPrice(price: number, currency: string): string {
  return `${price.toLocaleString('fr-FR')} ${currency === 'XOF' ? 'FCFA' : currency}`;
}
```

- [ ] **Step 2: Update `frontend/src/app/dashboard/page.tsx` to import from the new module**

Remove the local `interface Listing { ... }` (lines 22-31), `PROPERTY_TYPE_LABEL` (lines 33-39), `STATUS_STYLE` (lines 41-45), and the local `formatPrice` function (lines 57-59).

Add this import alongside the existing ones at the top of the file:

```ts
import {
  type Listing,
  PROPERTY_TYPE_LABEL,
  STATUS_STYLE,
  formatListingPrice,
} from '@/lib/listings';
```

Replace the single call site at (previously) line 355:

```ts
{formatPrice(l.price, l.currency)}
```

with:

```ts
{formatListingPrice(l.price, l.currency)}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter frontend exec tsc --noEmit`
Expected: no new errors mentioning `dashboard/page.tsx` or `lib/listings.ts` (the two pre-existing `preferences/*` errors noted in Global Constraints may still appear — that's expected).

- [ ] **Step 4: Manually verify the dashboard is unchanged**

Run `pnpm dev`, log in, open `/dashboard`. The "Mes annonces" table at the bottom should render identically to before (same prices with "FCFA" suffix for XOF, same status badges, same property type chips).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/listings.ts frontend/src/app/dashboard/page.tsx
git commit -m "refactor: extract listing display helpers into lib/listings.ts"
```

---

### Task 2: Build the `/listings` page — data loading, pagination, table

**Files:**
- Create: `frontend/src/app/listings/page.tsx`

**Interfaces:**
- Consumes: `Listing`, `PROPERTY_TYPE_LABEL`, `STATUS_STYLE`, `formatListingPrice` from `@/lib/listings` (Task 1); `useApi<T>(path): { data, loading }` from `@/lib/useApi`; `api<T>(path): Promise<T>` from `@/lib/api`; `DashboardShell` from `@/components/dashboard/DashboardShell` (accepts `active: NavKey`, already includes `'listings'`); `useUser()` from `@/contexts/AuthContext`; `cn()` from `@/lib/utils`.
- Produces: default export `ListingsPage` (the route component). Local state shape `{ nextCursor, listings }` that Task 3 extends with search/filter state — keep these names (`listings`, `nextCursor`, `loadingMore`, `loadMore`) as Task 3 builds directly on top of this file.

- [ ] **Step 1: Create `frontend/src/app/listings/page.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Plus, MapPin, Eye, Pencil, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PROPERTY_TYPE_LABEL, STATUS_STYLE, formatListingPrice, type Listing } from '@/lib/listings';
import { cn } from '@/lib/utils';

interface ListingsPageResult {
  items: Listing[];
  nextCursor: string | null;
}

export default function ListingsPage() {
  const user = useUser();
  const { data: firstPage, loading } = useApi<ListingsPageResult>('/api/listings?limit=20');

  const [extraPages, setExtraPages] = useState<Listing[][]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Resets accumulated extra pages whenever the first page is (re)fetched —
  // e.g. on mount, or on useApi's background stale-while-revalidate refresh.
  useEffect(() => {
    setExtraPages([]);
    setNextCursor(firstPage?.nextCursor ?? null);
  }, [firstPage]);

  const listings = useMemo(
    () => [...(firstPage?.items ?? []), ...extraPages.flat()],
    [firstPage, extraPages],
  );

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api<ListingsPageResult>(
        `/api/listings?limit=20&cursor=${encodeURIComponent(nextCursor)}`,
      );
      setExtraPages((prev) => [...prev, page.items]);
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  if (!user) return null;

  return (
    <DashboardShell active="listings">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap lg:gap-3">
          <div className="w-full lg:mr-auto lg:w-auto">
            <h1 className="font-sora text-[15px] font-semibold text-neutral-900">Mes annonces</h1>
            <p className="text-xs text-gray-400">
              {listings.length} annonce{listings.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Bientôt disponible — l'écran de publication n'est pas encore implémenté"
            className="flex flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-3.5 py-1.5 text-[13px] font-semibold text-white lg:px-4"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Publier</span>
            <span className="hidden lg:inline">Publier une annonce</span>
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Chargement…</p>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <p className="text-sm font-medium text-neutral-700">
              Aucune annonce pour l&apos;instant
            </p>
            <p className="max-w-xs text-xs text-gray-400">
              L&apos;écran de publication n&apos;est pas encore construit — cette table
              s&apos;affichera dès qu&apos;une annonce existera pour votre compte.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {[
                      { label: 'ID', mobileHidden: true },
                      { label: "Titre de l'annonce", mobileHidden: false },
                      { label: 'Localisation', mobileHidden: false },
                      { label: 'Type', mobileHidden: true },
                      { label: 'Prix', mobileHidden: false },
                      { label: 'Statut', mobileHidden: false },
                      { label: '', mobileHidden: false },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={cn(
                          'font-sora border-b border-black/[0.06] px-3.5 py-2 text-left text-[11px] font-semibold whitespace-nowrap text-gray-400 uppercase',
                          h.mobileHidden && 'hidden lg:table-cell',
                        )}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => {
                    const st = STATUS_STYLE[l.status] ?? STATUS_STYLE.PENDING!;
                    return (
                      <tr key={l.id} className="border-b border-black/[0.06] last:border-0">
                        <td className="hidden px-3.5 py-3 text-xs text-gray-400 lg:table-cell">
                          #{l.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="max-w-[160px] truncate px-3.5 py-3 text-[13.5px] font-medium text-neutral-900 lg:max-w-[220px]">
                          {l.title}
                        </td>
                        <td className="px-3.5 py-3 text-[13px] text-neutral-700">
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <MapPin className="h-3 w-3 text-gray-400" aria-hidden />
                            {l.city}, {l.country}
                          </span>
                        </td>
                        <td className="hidden px-3.5 py-3 lg:table-cell">
                          <span className="rounded bg-gray-100 px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap text-neutral-700">
                            {PROPERTY_TYPE_LABEL[l.propertyType] ?? l.propertyType}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-[13.5px] font-semibold whitespace-nowrap text-neutral-900">
                          {formatListingPrice(l.price, l.currency)}
                        </td>
                        <td className="px-3.5 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                              st.className,
                            )}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled
                              title="Bientôt disponible"
                              className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md bg-gray-100 text-gray-400"
                            >
                              <Eye className="h-[13px] w-[13px]" aria-hidden />
                            </button>
                            <button
                              type="button"
                              disabled
                              title="Bientôt disponible"
                              className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md bg-gray-100 text-gray-400"
                            >
                              <Pencil className="h-[13px] w-[13px]" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {nextCursor && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  {loadingMore ? 'Chargement…' : 'Charger plus'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Temporarily wire the nav so the page is reachable for manual testing**

This is undone/superseded by Task 4's proper wiring — for now, just navigate directly to the URL instead of clicking through nav (Task 4 adds the `href`). Skip editing nav files in this task.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter frontend exec tsc --noEmit`
Expected: no new errors mentioning `app/listings/page.tsx`.

- [ ] **Step 4: Manually verify**

Run `pnpm dev`, log in, navigate directly to `http://localhost:3000/listings`.
- If the logged-in user has 0 listings: see the "Aucune annonce pour l'instant" empty state.
- If they have listings (seed some via `pnpm db:studio` or the dev seed script if needed): table renders with correct prices/status/type; if there are more than 20, a "Charger plus" button appears at the bottom and clicking it appends the next page and eventually disappears once `nextCursor` is `null`.
- Resize to a narrow viewport: ID and Type columns hide, rest of the table stays usable.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/listings/page.tsx
git commit -m "feat: add /listings page with cursor-paginated table"
```

---

### Task 3: Add search and status/type filter popover

**Files:**
- Modify: `frontend/src/app/listings/page.tsx` (built in Task 2)

**Interfaces:**
- Consumes: `STATUS_LABEL` from `@/lib/listings` (Task 1) — not used in Task 2, now needed for the filter dropdown options.
- Produces: nothing new for later tasks (Task 4 only touches nav files).

- [ ] **Step 1: Add imports and derived option lists**

At the top of `frontend/src/app/listings/page.tsx`, update the icon import and `@/lib/listings` import:

```ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Plus, MapPin, Eye, Pencil, Loader2, X } from 'lucide-react';
```

```ts
import {
  PROPERTY_TYPE_LABEL,
  STATUS_STYLE,
  STATUS_LABEL,
  formatListingPrice,
  type Listing,
} from '@/lib/listings';
```

Below the `ListingsPageResult` interface, add:

```ts
const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));
const TYPE_OPTIONS = Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}));
```

- [ ] **Step 2: Add filter/search state and derived data**

Inside `ListingsPage`, right after the existing `loadingMore` state, add:

```ts
const [search, setSearch] = useState('');
const [statusFilter, setStatusFilter] = useState('');
const [typeFilter, setTypeFilter] = useState('');
const [filterOpen, setFilterOpen] = useState(false);
const filterPanelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  function onClickOutside(e: MouseEvent) {
    if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
      setFilterOpen(false);
    }
  }
  if (filterOpen) document.addEventListener('mousedown', onClickOutside);
  return () => document.removeEventListener('mousedown', onClickOutside);
}, [filterOpen]);

const activeFilterCount = (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0);

const filteredListings = useMemo(() => {
  const q = search.trim().toLowerCase();
  return listings.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (typeFilter && l.propertyType !== typeFilter) return false;
    if (
      q &&
      !(
        l.title.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q)
      )
    ) {
      return false;
    }
    return true;
  });
}, [listings, search, statusFilter, typeFilter]);

function resetFilters() {
  setSearch('');
  setStatusFilter('');
  setTypeFilter('');
}
```

- [ ] **Step 3: Replace the header subtitle to reflect filtered count**

Change:

```tsx
<p className="text-xs text-gray-400">
  {listings.length} annonce{listings.length === 1 ? '' : 's'}
</p>
```

to:

```tsx
<p className="text-xs text-gray-400">
  {filteredListings.length} annonce{filteredListings.length === 1 ? '' : 's'}
</p>
```

- [ ] **Step 4: Insert the search input and filter popover into the toolbar**

Between the title/subtitle `<div>` and the "Publier une annonce" `<button>`, insert:

```tsx
<div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-1.5 lg:min-w-[200px] lg:flex-none">
  <Search className="h-[14px] w-[14px] flex-shrink-0 text-gray-400" aria-hidden />
  <input
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Rechercher une annonce…"
    className="w-full truncate bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
  />
</div>
<div className="relative flex-shrink-0" ref={filterPanelRef}>
  <button
    type="button"
    onClick={() => setFilterOpen((v) => !v)}
    className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-gray-50 lg:px-3.5"
  >
    <SlidersHorizontal className="h-[14px] w-[14px]" aria-hidden />
    <span className="hidden lg:inline">Filtrer</span>
    {activeFilterCount > 0 && (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
        {activeFilterCount}
      </span>
    )}
  </button>
  {filterOpen && (
    <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-black/[0.06] bg-white p-4 shadow-lg">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Statut</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-[13px] text-neutral-900"
          >
            <option value="">Tous</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase">Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-[13px] text-neutral-900"
          >
            <option value="">Tous</option>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 self-start text-[12px] font-medium text-brand hover:underline"
          >
            <X className="h-3 w-3" aria-hidden />
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 5: Add the "no results" empty state and switch the table body to `filteredListings`**

Change the three-way conditional:

```tsx
{loading ? (
  <p className="py-8 text-center text-sm text-gray-400">Chargement…</p>
) : listings.length === 0 ? (
  <div className="flex flex-col items-center gap-1.5 py-10 text-center">
    <p className="text-sm font-medium text-neutral-700">
      Aucune annonce pour l&apos;instant
    </p>
    <p className="max-w-xs text-xs text-gray-400">
      L&apos;écran de publication n&apos;est pas encore construit — cette table
      s&apos;affichera dès qu&apos;une annonce existera pour votre compte.
    </p>
  </div>
) : (
  <>
```

to a four-way conditional:

```tsx
{loading ? (
  <p className="py-8 text-center text-sm text-gray-400">Chargement…</p>
) : listings.length === 0 ? (
  <div className="flex flex-col items-center gap-1.5 py-10 text-center">
    <p className="text-sm font-medium text-neutral-700">
      Aucune annonce pour l&apos;instant
    </p>
    <p className="max-w-xs text-xs text-gray-400">
      L&apos;écran de publication n&apos;est pas encore construit — cette table
      s&apos;affichera dès qu&apos;une annonce existera pour votre compte.
    </p>
  </div>
) : filteredListings.length === 0 ? (
  <div className="flex flex-col items-center gap-1.5 py-10 text-center">
    <p className="text-sm font-medium text-neutral-700">Aucun résultat pour ces critères</p>
    <button
      type="button"
      onClick={resetFilters}
      className="text-xs font-medium text-brand hover:underline"
    >
      Réinitialiser les filtres
    </button>
  </div>
) : (
  <>
```

Then in the table body, replace both occurrences of `listings.map((l) => {` (there's one) with `filteredListings.map((l) => {`.

- [ ] **Step 6: Add the "filtered among loaded" note above the Load More button**

Immediately before the `{nextCursor && ( <div className="flex justify-center pt-1"> ... Charger plus ... </div> )}` block, insert:

```tsx
{(search || activeFilterCount > 0) && nextCursor && (
  <p className="px-1 text-center text-[11px] text-gray-400">
    Résultats filtrés parmi les annonces chargées — cliquez sur Charger plus pour élargir la
    recherche.
  </p>
)}
```

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter frontend exec tsc --noEmit`
Expected: no new errors mentioning `app/listings/page.tsx`.

- [ ] **Step 8: Manually verify**

Run `pnpm dev`, navigate to `/listings`.
- Type in the search box: table narrows to matching title/city/country, subtitle count updates.
- Click "Filtrer", pick a status and/or type: table narrows accordingly, badge count on the Filtrer button reflects active filters, "Réinitialiser" inside the popover clears them.
- Search/filter for something that matches nothing: "Aucun résultat pour ces critères" empty state appears with a working "Réinitialiser les filtres" button.
- Click outside the open filter popover: it closes.
- With more than 20 listings and a filter/search active plus more pages available: the "Résultats filtrés parmi les annonces chargées…" note appears above "Charger plus".

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/listings/page.tsx
git commit -m "feat: add client-side search and status/type filtering to /listings"
```

---

### Task 4: Wire the nav links to `/listings`

**Files:**
- Modify: `frontend/src/components/dashboard/DashboardShell.tsx:58`
- Modify: `frontend/src/components/dashboard/BottomNav.tsx:22`

**Interfaces:**
- Consumes: nothing new — the `/listings` route from Task 2/3 must already exist and render correctly for a logged-in user.
- Produces: nothing consumed elsewhere — this is the final task.

- [ ] **Step 1: Add the href in the desktop sidebar**

In `frontend/src/components/dashboard/DashboardShell.tsx`, change:

```ts
{ key: 'listings', label: 'Mes annonces', icon: Building2 },
```

to:

```ts
{ key: 'listings', label: 'Mes annonces', icon: Building2, href: '/listings' },
```

- [ ] **Step 2: Add the href in the mobile bottom nav**

In `frontend/src/components/dashboard/BottomNav.tsx`, change:

```ts
{ key: 'listings', label: 'Annonces', icon: Building2 },
```

to:

```ts
{ key: 'listings', label: 'Annonces', icon: Building2, href: '/listings' },
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter frontend exec tsc --noEmit`
Expected: no new errors mentioning `DashboardShell.tsx` or `BottomNav.tsx`.

- [ ] **Step 4: Manually verify**

Run `pnpm dev`, log in, land on `/dashboard`.
- Desktop width: the "Mes annonces" sidebar entry no longer shows the "Bientôt" badge, is clickable, navigates to `/listings`, and highlights as active there.
- Narrow/mobile width: the "Annonces" bottom-nav tab is no longer inert (no `cursor-not-allowed`/gray styling), navigates to `/listings`, and highlights as active there.
- From `/listings`, navigating back to `/dashboard` via the "Tableau de bord" entry still works and the dashboard's own "Mes annonces" preview table still renders correctly (regression check for Task 1's refactor).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/DashboardShell.tsx frontend/src/components/dashboard/BottomNav.tsx
git commit -m "feat: wire Mes annonces nav links to /listings"
```
