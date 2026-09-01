# Public Annonces Listing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fully-static `/annonces` public listing page (hardcoded `LISTINGS` array, inert filters, invented counts) with a real, filterable, paginated view backed by the actual `Listing` database table.

**Architecture:** A new unauthenticated API route, `GET /api/public/listings`, queries `Listing` rows with `status: 'VERIFIED'` plus optional filters (country, propertyType, transactionType, price range), returns a page of results alongside real filter-option counts ("facets"). `/annonces/page.tsx` is rewritten to fetch this endpoint, replacing its mock data and inert filter UI with state-driven, working filters and real pagination. `InitialsAvatar` gets a small `seed` prop so the public page can render an agent's avatar color without ever receiving or exposing their email.

**Tech Stack:** Next.js 16 App Router, Prisma 5 (PostgreSQL/Neon), Zod, Vitest, vitest-mock-extended, Tailwind, lucide-react.

**Spec:** [docs/superpowers/specs/2026-08-18-public-listings-design.md](../specs/2026-08-18-public-listings-design.md)

## Global Constraints

- Every Route Handler already has `export const runtime = 'nodejs'` — do not remove it.
- `pnpm format && pnpm lint && pnpm typecheck && pnpm test` must all pass before any commit that isn't itself a WIP checkpoint inside a task.
- `GET /api/public/listings` is intentionally unauthenticated (no `requireAuth`, no `verifyCsrf` — it's a read-only public route, mirrors `frontend/src/app/api/health/route.ts`'s no-auth pattern).
- Only `status: 'VERIFIED'` listings are ever returned by this endpoint — never DRAFT, PENDING, or SOLD.
- The response DTO must never include the agent's `email` — only `{ id, name, avatarUrl }` from `User`.
- Invalid/malformed query params are ignored, never a 400 — this is a public navigation page, a bad filter value must degrade to "no filter", not break the page.
- Pagination is page-numbered (`page`, `limit`), not cursor-based — intentionally different from `/api/alerts` and `/api/notifications`, matching this page's existing numbered-pagination UI.
- Out of scope (do not touch): `/annonces/[id]` detail page, city filter, surface filter, sort-order selector, "Plus de filtres" panel — all stay exactly as inert as they are today.

---

### Task 1: API — `GET /api/public/listings`

**Files:**
- Create: `frontend/src/app/api/public/listings/route.ts`
- Create: `frontend/src/app/api/public/listings/route.test.ts`

**Interfaces:**
- Produces: `GET /api/public/listings?country=&propertyType=&transactionType=&priceMin=&priceMax=&page=&limit=` → `200`:
  ```typescript
  {
    items: Array<{
      id: string;
      title: string;
      city: string;
      country: string;
      propertyType: string;
      transactionType: string;
      price: number;
      currency: string;
      createdAt: string; // ISO
      primaryPhotoUrl: string | null;
      photoCount: number;
      agent: { name: string | null; avatarUrl: string | null; seed: string };
    }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    facets: {
      countries: { value: string; count: number }[];
      propertyTypes: { value: string; count: number }[];
      transactionTypes: { value: string; count: number }[];
    };
  }
  ```
  Task 3's `/annonces` page consumes this exact shape via `api<...>('/api/public/listings?...')`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/api/public/listings/route.test.ts`:

```typescript
// PUBLIC-LISTINGS-01 — GET /api/public/listings tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    title: 'Villa duplex standing',
    city: 'Cocody',
    country: 'Bénin',
    propertyType: 'VILLA',
    transactionType: 'VENTE',
    price: 185_000_000,
    currency: 'XOF',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    photos: [{ url: 'https://example.com/photo.jpg' }],
    _count: { photos: 3 },
    user: { id: 'user-1', name: 'Kofi Atta', avatarUrl: null },
    ...overrides,
  };
}

function makeGet(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/public/listings${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.listing.findMany.mockResolvedValue([makeRow()] as never);
  prismaMock.listing.count.mockResolvedValue(1 as never);
  prismaMock.listing.groupBy.mockResolvedValue([] as never);
});

describe('GET /api/public/listings', () => {
  it('only queries status VERIFIED', async () => {
    await GET(makeGet());
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    );
    expect(prismaMock.listing.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    );
  });

  it('applies country, propertyType, transactionType, and price filters', async () => {
    await GET(makeGet('?country=B%C3%A9nin&propertyType=VILLA&transactionType=VENTE&priceMin=1000&priceMax=2000'));
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'VERIFIED',
          country: 'Bénin',
          propertyType: 'VILLA',
          transactionType: 'VENTE',
          price: { gte: 1000, lte: 2000 },
        }),
      }),
    );
  });

  it('ignores malformed price params instead of 400ing', async () => {
    const res = await GET(makeGet('?priceMin=not-a-number'));
    expect(res.status).toBe(200);
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ price: expect.anything() }),
      }),
    );
  });

  it('defaults to page 1 / limit 9, and computes totalPages', async () => {
    prismaMock.listing.count.mockResolvedValueOnce(19 as never);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 9 }),
    );
    expect(body.page).toBe(1);
    expect(body.limit).toBe(9);
    expect(body.total).toBe(19);
    expect(body.totalPages).toBe(3);
  });

  it('applies page/limit as skip/take', async () => {
    await GET(makeGet('?page=3&limit=6'));
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 12, take: 6 }),
    );
  });

  it('clamps limit to [1, 24]', async () => {
    await GET(makeGet('?limit=999'));
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 24 }),
    );
  });

  it('maps rows to the flat DTO shape, never including agent email', async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items).toEqual([
      {
        id: 'listing-1',
        title: 'Villa duplex standing',
        city: 'Cocody',
        country: 'Bénin',
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 185_000_000,
        currency: 'XOF',
        createdAt: '2026-08-01T00:00:00.000Z',
        primaryPhotoUrl: 'https://example.com/photo.jpg',
        photoCount: 3,
        agent: { name: 'Kofi Atta', avatarUrl: null, seed: 'user-1' },
      },
    ]);
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('primaryPhotoUrl is null when the listing has no primary photo', async () => {
    prismaMock.listing.findMany.mockResolvedValueOnce([makeRow({ photos: [] })] as never);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items[0].primaryPhotoUrl).toBeNull();
  });

  it('facets reflect groupBy counts, sorted by count descending', async () => {
    prismaMock.listing.groupBy.mockResolvedValue([
      { country: 'Togo', _count: { _all: 2 } },
      { country: 'Bénin', _count: { _all: 5 } },
    ] as never);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.facets.countries).toEqual([
      { value: 'Bénin', count: 5 },
      { value: 'Togo', count: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run "src/app/api/public/listings/route.test.ts"`
Expected: FAIL — `./route` does not exist yet.

- [ ] **Step 3: Implement the route**

Create `frontend/src/app/api/public/listings/route.ts`:

```typescript
// PUBLIC-LISTINGS-01 — GET /api/public/listings
//
// Unauthenticated, read-only listing browse for the public "/annonces"
// marketing page. Mirrors the no-auth pattern of api/health/route.ts —
// there is no requireAuth() call here on purpose. Only VERIFIED listings
// are ever returned (never DRAFT/PENDING/SOLD). Query params are
// best-effort: anything malformed is silently ignored rather than
// rejected with a 400, since this backs a public navigation page, not a
// form submission.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 24;

function parsePage(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const LISTING_SELECT = {
  id: true,
  title: true,
  city: true,
  country: true,
  propertyType: true,
  transactionType: true,
  price: true,
  currency: true,
  createdAt: true,
  photos: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true },
  },
  _count: { select: { photos: true } },
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const params = req.nextUrl.searchParams;

    const country = params.get('country')?.trim() || undefined;
    const propertyType = params.get('propertyType')?.trim() || undefined;
    const transactionType = params.get('transactionType')?.trim() || undefined;
    const priceMin = parsePositiveInt(params.get('priceMin'));
    const priceMax = parsePositiveInt(params.get('priceMax'));
    const page = parsePage(params.get('page'));
    const limit = parseLimit(params.get('limit'));

    // Builds the Prisma `where` clause. `omit` drops one filter dimension
    // from the clause — used so each facet's own counts aren't collapsed by
    // its own currently-selected value (e.g. filtering by country=Bénin
    // must NOT shrink the country facet list down to just Bénin).
    function buildWhere(omit?: 'country' | 'propertyType' | 'transactionType'): Prisma.ListingWhereInput {
      const where: Prisma.ListingWhereInput = { status: 'VERIFIED' };
      if (country && omit !== 'country') where.country = country;
      if (propertyType && omit !== 'propertyType') where.propertyType = propertyType;
      if (transactionType && omit !== 'transactionType') where.transactionType = transactionType;
      if (priceMin !== undefined || priceMax !== undefined) {
        where.price = {
          ...(priceMin !== undefined && { gte: priceMin }),
          ...(priceMax !== undefined && { lte: priceMax }),
        };
      }
      return where;
    }

    const baseWhere = buildWhere();

    const [rows, total, countryFacet, propertyTypeFacet, transactionTypeFacet] = await Promise.all([
      prisma.listing.findMany({
        where: baseWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: LISTING_SELECT,
      }),
      prisma.listing.count({ where: baseWhere }),
      prisma.listing.groupBy({
        by: ['country'],
        where: buildWhere('country'),
        _count: { _all: true },
      }),
      prisma.listing.groupBy({
        by: ['propertyType'],
        where: buildWhere('propertyType'),
        _count: { _all: true },
      }),
      prisma.listing.groupBy({
        by: ['transactionType'],
        where: buildWhere('transactionType'),
        _count: { _all: true },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      city: r.city,
      country: r.country,
      propertyType: r.propertyType,
      transactionType: r.transactionType,
      price: r.price,
      currency: r.currency,
      createdAt: r.createdAt,
      primaryPhotoUrl: r.photos[0]?.url ?? null,
      photoCount: r._count.photos,
      agent: { name: r.user.name, avatarUrl: r.user.avatarUrl, seed: r.user.id },
    }));

    const toFacet = (rows: { _count: { _all: number } }[], key: string) =>
      rows
        .map((r) => ({ value: (r as unknown as Record<string, string>)[key], count: r._count._all }))
        .sort((a, b) => b.count - a.count);

    return NextResponse.json(
      {
        items,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        facets: {
          countries: toFacet(countryFacet, 'country'),
          propertyTypes: toFacet(propertyTypeFacet, 'propertyType'),
          transactionTypes: toFacet(transactionTypeFacet, 'transactionType'),
        },
      },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/api/public/listings/route.test.ts"`
Expected: PASS, all 10 cases green.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors from the new route file.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/api/public/
git commit -m "feat(api): add public GET /api/public/listings with real filters and facets"
```

---

### Task 2: `InitialsAvatar` — email-free `seed` prop

**Files:**
- Modify: `frontend/src/components/dashboard/InitialsAvatar.tsx`

**Interfaces:**
- Produces: `InitialsAvatar({ name, email, avatarUrl, seed?, size?, className? })` — when `seed` is provided, it drives the background hue instead of `email` (the `email` prop remains required for the text-fallback-initials computation's type, but Task 3 passes `''` for it since the public page never has an email to show). Existing callers (unchanged) keep working exactly as before since `seed` is optional and unused by them.

- [ ] **Step 1: Add the `seed` prop and use it for hue when present**

Replace the full contents of `frontend/src/components/dashboard/InitialsAvatar.tsx`:

```typescript
import { cn } from '@/lib/utils';

function initialsFrom(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && name) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

// Deterministic brand-adjacent hue from the source string so the same user
// always gets the same avatar color, without needing a real photo upload
// feature (none exists yet — `User.avatarUrl` is currently only ever
// populated by OAuth sign-in).
function hueFrom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 360;
}

export function InitialsAvatar({
  name,
  email,
  avatarUrl,
  seed,
  size = 34,
  className,
}: {
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  // Optional hue source that does NOT need to be a real email — pass this
  // on pages (e.g. public /annonces) that must never receive or render a
  // user's email address. Falls back to `email` when omitted.
  seed?: string;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? email}
        className={cn('flex-shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const hue = hueFrom(seed ?? email);
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `hsl(${hue} 70% 45%)`,
      }}
      aria-hidden
    >
      {initialsFrom(name, email)}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors — existing callers of `InitialsAvatar` (dashboard) don't pass `seed`, which is optional, so nothing breaks.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/InitialsAvatar.tsx
git commit -m "feat(ui): add email-free seed prop to InitialsAvatar for public pages"
```

---

### Task 3: UI — wire `/annonces` to the public API

**Files:**
- Modify: `frontend/src/app/annonces/page.tsx` (full rewrite of the component body — the mock data and inert-filter markup are replaced; `PublicNavbar`/`PublicFooter` usage and the overall page shell/visual structure are kept)

**Interfaces:**
- Consumes: `GET /api/public/listings` DTO from Task 1; `InitialsAvatar` `seed` prop from Task 2; `PROPERTY_TYPE_LABEL`, `TRANSACTION_TYPE_LABEL`, `formatListingPrice` from `frontend/src/lib/listings.ts`; `COUNTRY_FLAG`, `formatDate` from `frontend/src/lib/alerts.ts`.

- [ ] **Step 1: Replace the file contents**

Replace the full contents of `frontend/src/app/annonces/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Check,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { InitialsAvatar } from '@/components/dashboard/InitialsAvatar';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL, formatListingPrice } from '@/lib/listings';
import { COUNTRY_FLAG, formatDate } from '@/lib/alerts';

interface PublicListingItem {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  transactionType: string;
  price: number;
  currency: string;
  createdAt: string;
  primaryPhotoUrl: string | null;
  photoCount: number;
  agent: { name: string | null; avatarUrl: string | null; seed: string };
}

interface Facet {
  value: string;
  count: number;
}

interface PublicListingsResponse {
  items: PublicListingItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: {
    countries: Facet[];
    propertyTypes: Facet[];
    transactionTypes: Facet[];
  };
}

const LIMIT = 9;

function InertPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      title="Bientôt disponible"
      className={cn(
        'inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-black/[0.08] px-3.5 py-2 text-[13px] font-medium whitespace-nowrap text-gray-500 select-none',
        className,
      )}
    >
      {children}
    </span>
  );
}

export default function AnnoncesPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const [country, setCountry] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PublicListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (propertyType) params.set('propertyType', propertyType);
    if (transactionType) params.set('transactionType', transactionType);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    params.set('page', String(page));
    params.set('limit', String(LIMIT));

    api<PublicListingsResponse>(`/api/public/listings?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country, propertyType, transactionType, priceMin, priceMax, page]);

  function resetFilters() {
    setCountry('');
    setPropertyType('');
    setTransactionType('');
    setPriceMin('');
    setPriceMax('');
    setPage(1);
  }

  function setFilterAndResetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const setCountryFiltered = setFilterAndResetPage(setCountry);
  const setPropertyTypeFiltered = setFilterAndResetPage(setPropertyType);
  const setTransactionTypeFiltered = setFilterAndResetPage(setTransactionType);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const countries = data?.facets.countries ?? [];
  const propertyTypes = data?.facets.propertyTypes ?? [];
  const transactionTypes = data?.facets.transactionTypes ?? [];

  const countryLabel = countries.length
    ? countries.map((c) => c.value).join(', ')
    : 'Bénin, Togo, Côte d’Ivoire, Sénégal';

  return (
    <div className="bg-white text-neutral-900">
      <PublicNavbar active="annonces" />

      {/* PAGE HEADER */}
      <div className="border-b border-black/[0.06]">
        <div className="mx-auto max-w-[1280px] px-4 py-8 lg:px-7">
          <p className="mb-2.5 flex items-center gap-2 text-[13px] text-gray-500">
            <span>Accueil</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-neutral-900">Toutes les annonces</span>
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-sora text-[26px] font-extrabold tracking-[-0.04em] lg:text-[32px]">
                Toutes les annonces
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                <span className="font-semibold text-brand">{total} annonce{total === 1 ? '' : 's'}</span>{' '}
                trouvée{total === 1 ? '' : 's'} · {countryLabel}
              </p>
            </div>
            <div className="flex items-center gap-0.5 rounded-lg border border-black/[0.08] p-1">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md',
                  view === 'grid' ? 'bg-gray-100 text-neutral-900' : 'text-gray-400',
                )}
                aria-label="Vue grille"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md',
                  view === 'list' ? 'bg-gray-100 text-neutral-900' : 'text-gray-400',
                )}
                aria-label="Vue liste"
              >
                <List className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="sticky top-0 z-10 border-b border-black/[0.06] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1280px] overflow-x-auto px-4 py-3.5 lg:px-7">
          <div className="flex items-center gap-2.5">
            <InertPill className="border-brand bg-brand/[0.06] text-brand">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Tous les pays
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <InertPill>
              Toutes les villes
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <InertPill>
              Type de bien
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <InertPill>
              Transaction
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <InertPill>
              Prix
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <span className="h-7 w-px flex-shrink-0 bg-black/[0.08]" />
            <InertPill>
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Plus de filtres
            </InertPill>
            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <span className="text-[13px] whitespace-nowrap text-gray-500">Trier par :</span>
              <InertPill>
                Date (récent)
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </InertPill>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-[1280px] px-4 py-8 lg:px-7">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[260px_1fr]">
          {/* SIDEBAR FILTERS — desktop only, no mobile off-canvas built this pass */}
          <aside className="hidden rounded-2xl border border-black/[0.06] bg-white p-[22px] lg:sticky lg:top-[88px] lg:block lg:self-start">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[15px] font-bold">Filtres</p>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-brand"
              >
                Réinitialiser
              </button>
            </div>

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Type de bien
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setPropertyTypeFiltered('')}
                  className="flex items-center gap-2.5 text-left text-[13px]"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                      propertyType === '' ? 'bg-brand' : 'border border-black/[0.15]',
                    )}
                  >
                    {propertyType === '' && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                  </span>
                  Tous les types
                </button>
                {propertyTypes.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setPropertyTypeFiltered(f.value)}
                    className="flex items-center gap-2.5 text-left text-[13px] text-gray-600"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                        propertyType === f.value ? 'bg-brand' : 'border border-black/[0.15]',
                      )}
                    >
                      {propertyType === f.value && (
                        <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                      )}
                    </span>
                    <span className="flex-1">{PROPERTY_TYPE_LABEL[f.value] ?? f.value}</span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Fourchette de prix
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min (FCFA)"
                  value={priceMin}
                  onChange={(e) => {
                    setPriceMin(e.target.value.replace(/\D/g, ''));
                    setPage(1);
                  }}
                  className="rounded-lg border border-black/[0.08] bg-gray-50 px-2.5 py-2 text-xs text-neutral-900 focus:border-brand focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max (FCFA)"
                  value={priceMax}
                  onChange={(e) => {
                    setPriceMax(e.target.value.replace(/\D/g, ''));
                    setPage(1);
                  }}
                  className="rounded-lg border border-black/[0.08] bg-gray-50 px-2.5 py-2 text-xs text-neutral-900 focus:border-brand focus:outline-none"
                />
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Pays
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setCountryFiltered('')}
                  className="flex items-center gap-2.5 text-left text-[13px]"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                      country === '' ? 'bg-brand' : 'border border-black/[0.15]',
                    )}
                  >
                    {country === '' && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                  </span>
                  Tous les pays
                </button>
                {countries.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setCountryFiltered(f.value)}
                    className="flex items-center gap-2.5 text-left text-[13px] text-gray-600"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                        country === f.value ? 'bg-brand' : 'border border-black/[0.15]',
                      )}
                    >
                      {country === f.value && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                    </span>
                    <span className="flex-1">
                      {COUNTRY_FLAG[f.value] ?? ''} {f.value}
                    </span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-5">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Surface minimale
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-brand">
                    <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                  </span>
                  Toutes surfaces
                </div>
                {['50 m² +', '100 m² +', '200 m² +', '500 m² +'].map((s) => (
                  <div key={s} className="flex items-center gap-2.5 text-[13px] text-gray-600">
                    <span className="h-4 w-4 flex-shrink-0 rounded border border-black/[0.15]" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* LISTINGS AREA */}
          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTransactionTypeFiltered('')}
                className={cn(
                  'rounded-full border px-4 py-2 text-[13px] font-medium whitespace-nowrap',
                  transactionType === ''
                    ? 'border-brand bg-brand text-white'
                    : 'border-black/[0.08] text-gray-500',
                )}
              >
                Toutes ({total})
              </button>
              {transactionTypes.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setTransactionTypeFiltered(f.value)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-[13px] font-medium whitespace-nowrap',
                    transactionType === f.value
                      ? 'border-brand bg-brand text-white'
                      : 'border-black/[0.08] text-gray-500',
                  )}
                >
                  {TRANSACTION_TYPE_LABEL[f.value] ?? f.value} ({f.count})
                </button>
              ))}
            </div>

            {loading && !data ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.06] py-14 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
                <p className="text-xs text-gray-400">Chargement des annonces…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.06] py-14 text-center">
                <p className="text-sm font-medium text-neutral-700">Aucune annonce ne correspond</p>
                <p className="text-xs text-gray-400">Essayez d&apos;élargir vos filtres.</p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
                {items.map((listing) => (
                  <div
                    key={listing.id}
                    className="overflow-hidden rounded-2xl border border-black/[0.06]"
                  >
                    <div className="relative h-[200px] bg-gray-100">
                      {listing.primaryPhotoUrl ? (
                        <img
                          src={listing.primaryPhotoUrl}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-300" aria-hidden />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-black/78 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                          {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
                        </span>
                        <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                          {TRANSACTION_TYPE_LABEL[listing.transactionType] ?? listing.transactionType}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 p-4">
                      <p className="mb-1.5 text-[15px] leading-snug font-bold">{listing.title}</p>
                      <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                        {listing.city} · {COUNTRY_FLAG[listing.country] ?? ''} {listing.country}
                      </p>
                      <div className="mb-3 flex items-center gap-2">
                        <InitialsAvatar
                          name={listing.agent.name}
                          email=""
                          avatarUrl={listing.agent.avatarUrl}
                          seed={listing.agent.seed}
                          size={22}
                        />
                        <span className="text-xs text-gray-500">
                          {listing.agent.name ?? 'Agent'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                          <BadgeCheck className="h-3 w-3" aria-hidden />
                          Vérifié
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] pt-2.5">
                        <p className="text-lg font-extrabold tracking-[-0.03em] text-brand">
                          {formatListingPrice(listing.price, listing.currency)}
                        </p>
                        <Link
                          href={`/annonces/${listing.id}`}
                          className="flex items-center gap-1 text-[13px] font-medium text-brand"
                        >
                          Voir <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {items.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] sm:flex-row"
                  >
                    <div className="relative h-[200px] flex-shrink-0 bg-gray-100 sm:h-auto sm:w-[220px]">
                      {listing.primaryPhotoUrl ? (
                        <img
                          src={listing.primaryPhotoUrl}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-300" aria-hidden />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="rounded-full bg-black/78 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                          {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
                        </span>
                        <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                          {TRANSACTION_TYPE_LABEL[listing.transactionType] ?? listing.transactionType}
                        </span>
                      </div>
                      <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-black/70 px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap text-white">
                        <ImageIcon className="h-[11px] w-[11px]" aria-hidden />
                        {listing.photoCount}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-3 p-[18px] sm:p-5">
                      <div>
                        <div className="mb-2 flex items-start justify-between gap-4">
                          <p className="max-w-[480px] truncate text-[17px] font-bold tracking-[-0.02em]">
                            {listing.title}
                          </p>
                          <p className="flex-shrink-0 text-right text-xl font-extrabold whitespace-nowrap text-brand">
                            {formatListingPrice(listing.price, listing.currency)}
                          </p>
                        </div>
                        <p className="mb-2.5 flex items-center gap-1.5 text-[13px] text-gray-500">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                          {listing.city} · {COUNTRY_FLAG[listing.country] ?? ''} {listing.country}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-3">
                        <div className="flex items-center gap-2">
                          <InitialsAvatar
                            name={listing.agent.name}
                            email=""
                            avatarUrl={listing.agent.avatarUrl}
                            seed={listing.agent.seed}
                            size={26}
                          />
                          <span className="text-[13px] text-gray-500">
                            {listing.agent.name ?? 'Agent'}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                            <BadgeCheck className="h-3 w-3" aria-hidden />
                            Vérifié
                          </span>
                          <span className="text-xs whitespace-nowrap text-gray-400">
                            · Publié le {formatDate(listing.createdAt)}
                          </span>
                        </div>
                        <Link
                          href={`/annonces/${listing.id}`}
                          className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[13px] font-medium whitespace-nowrap text-white"
                        >
                          Voir le détail
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<number[]>((acc, n) => {
                    if (acc.length && n - acc[acc.length - 1]! > 1) acc.push(-1); // ellipsis marker
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === -1 ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg border text-[13px] font-medium',
                          n === page
                            ? 'border-brand bg-brand text-white'
                            : 'border-black/[0.08] text-neutral-700',
                        )}
                      >
                        {n}
                      </button>
                    ),
                  )}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors in `frontend/src/app/annonces/page.tsx`.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no unused-import or unused-variable warnings.

- [ ] **Step 4: Manual verification in the browser**

Run: `pnpm dev`, navigate to `http://localhost:3000/annonces`. Verify:
- The header count and country list reflect real data (not "128 annonces").
- Only `VERIFIED` listings appear — spot-check via `pnpm db:studio` that a `PENDING`/`DRAFT` listing you have does NOT show up here.
- Clicking a property-type checkbox in the sidebar filters the grid and updates the URL-driving state (re-fetch happens, `Réinitialiser` clears it back).
- Clicking a country in the sidebar filters correctly; clicking a transaction pill at the top filters correctly; combining both together narrows further.
- Typing values into "Min (FCFA)" / "Max (FCFA)" filters by price.
- Pagination buttons only appear when `totalPages > 1`, and clicking a page number or the arrows changes the visible listings.
- A listing with no uploaded photo shows the gray placeholder + `ImageIcon`, not a broken `<img>`.
- Agent avatar renders (photo if `avatarUrl` set, colored initials otherwise) and never shows or requests an email anywhere (check the Network tab response for `/api/public/listings` — no `email` key).
- List view (toggle top-right) renders the same real data correctly.

- [ ] **Step 5: Full verification suite**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass (aside from the already-known pre-existing, unrelated failure in `frontend/src/app/api/listings/[id]/route.test.ts` — confirm no new failures appear in `annonces` or `public/listings` files).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/annonces/page.tsx
git commit -m "feat(annonces): wire public listings page to real, filterable, paginated data"
```
