# Public Listing Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fully-mocked `/annonces/[id]` public listing detail page (invented photos/agent/features/counts, decorative contact/report/VR buttons) with real data and a working minimal contact/report backend.

**Architecture:** A new unauthenticated `GET /api/public/listings/[id]` returns the full listing DTO (all real fields, all photos, agent contact info, geocoded location, similar listings) and increments a new `Listing.viewCount`. Two new unauthenticated POST endpoints (`/inquiries`, `/reports`) let an anonymous visitor send a lead (message or VR-visit request, notifying the listing owner in-app + by email) or flag a listing (queued for admin moderation via a new `GET`/`PATCH /api/admin/listing-reports` pair — API only, no admin UI this session). `/annonces/[id]/page.tsx` is rewritten to fetch and wire all of this, keeping its existing visual structure.

**Tech Stack:** Next.js 16 App Router, Prisma 5 (PostgreSQL/Neon), Zod, Vitest, vitest-mock-extended, Tailwind, lucide-react, OpenStreetMap Nominatim (geocoding) + embed iframe (map).

**Spec:** [docs/superpowers/specs/2026-08-18-listing-detail-page-design.md](../specs/2026-08-18-listing-detail-page-design.md)

## Global Constraints

- Every Route Handler has `export const runtime = 'nodejs'`.
- `pnpm format && pnpm lint && pnpm typecheck && pnpm test` must all pass before any commit that isn't itself a WIP checkpoint inside a task.
- `GET /api/public/listings/[id]`, `POST .../inquiries`, `POST .../reports` are unauthenticated (no `requireAuth`). The two POSTs skip `verifyCsrf` too — same pre-session carve-out as `/api/auth/signup` (an anonymous visitor has no CSRF cookie).
- Only a `status: 'VERIFIED'` listing is ever returned/actionable by any of the three public routes — 404 `LISTING_NOT_FOUND` otherwise (never leak DRAFT/PENDING/SOLD existence).
- The DTO must never include the agent's `email` — only `{ name, avatarUrl, phone, seed }`.
- `prisma migrate dev` cannot run non-interactively on this machine/OS — hand-create the migration folder + `migration.sql`, then apply with `prisma migrate deploy`. `prisma generate` can EPERM if a dev server holds `query_engine-windows.dll.node` — stop `pnpm dev` first if that happens.
- Out of scope (do not touch): `/messages` (stays fully mocked), any admin frontend page (`/admin/*` — none exists yet, API only), real video/VR infrastructure, a "favoris" model, exact-address geocoding.

---

### Task 1: Schema — `viewCount`, `ListingInquiry`, `ListingReport`

**Files:**
- Modify: `frontend/prisma/schema.prisma`
- Create: `frontend/prisma/migrations/<timestamp>_add_listing_inquiries_reports/migration.sql`

**Interfaces:**
- Produces: `Listing.viewCount: number`, `ListingInquiry { id, listingId, type, name, phone, email, message, createdAt }`, `ListingReport { id, listingId, reason, detail, status, createdAt }` — consumed by every route in Tasks 2-5.

- [ ] **Step 1: Edit the schema**

In `frontend/prisma/schema.prisma`, inside `model Listing`, add `viewCount` and the two new relations (near the existing `photos`/`documents` relations):

```prisma
  photos    ListingPhoto[]
  documents ListingDocument[]
  inquiries ListingInquiry[]
  reports   ListingReport[]

  viewCount Int @default(0)

  createdAt DateTime @default(now())
```

(Keep `createdAt`/`updatedAt`/the two `@@index` lines exactly where they already are — only the three lines above are new/moved into the relations block.)

Then add two new models directly after `model Listing { ... }` closes (before `PropertyRequest`):

```prisma
// A single inbound lead from the public listing-detail page — either a
// general contact message or a VR-visit request. Anonymous (no userId):
// the visitor is never required to be logged in. Not a conversation
// thread — see frontend/src/app/messages/page.tsx for the (currently
// fully mocked, separately-scoped) rich inbox this may eventually feed.
model ListingInquiry {
  id        String  @id @default(cuid())
  listingId String
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  type    String // MESSAGE | VR_VISIT
  name    String
  phone   String
  email   String?
  message String

  createdAt DateTime @default(now())

  @@index([listingId, createdAt])
}

// A visitor-submitted flag on a listing, queued for admin moderation.
// Anonymous, matching ListingInquiry — no reporter identity captured.
model ListingReport {
  id        String  @id @default(cuid())
  listingId String
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  reason String // FAKE | SOLD | INCORRECT_INFO | SCAM | OTHER
  detail String?
  status String @default("PENDING") // PENDING | REVIEWED | DISMISSED

  createdAt DateTime @default(now())

  @@index([status, createdAt])
}
```

- [ ] **Step 2: Hand-create the migration**

Get a timestamp prefix:

```bash
date -u +%Y%m%d%H%M%S
```

Create `frontend/prisma/migrations/<that-timestamp>_add_listing_inquiries_reports/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ListingInquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingReport" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingInquiry_listingId_createdAt_idx" ON "ListingInquiry"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingReport_status_createdAt_idx" ON "ListingReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ListingInquiry" ADD CONSTRAINT "ListingInquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply the migration and regenerate the client**

```bash
pnpm --filter frontend exec prisma migrate deploy
pnpm --filter frontend exec prisma generate
```

If `prisma generate` fails with `EPERM` on `query_engine-windows.dll.node`, a running `pnpm dev` process is holding the file lock — stop it first, then retry.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (Task 1 adds no application code yet — this just confirms the regenerated Prisma client compiles cleanly against the rest of the app).

- [ ] **Step 5: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations/
git commit -m "feat(db): add Listing.viewCount, ListingInquiry, ListingReport"
```

---

### Task 2: API — `GET /api/public/listings/[id]` (detail, view count, geocoding, similar)

**Files:**
- Create: `frontend/src/lib/server/geocode.ts`
- Create: `frontend/src/lib/server/geocode.test.ts`
- Create: `frontend/src/app/api/public/listings/[id]/route.ts`
- Create: `frontend/src/app/api/public/listings/[id]/route.test.ts`

**Interfaces:**
- Produces: `geocodeCity(city: string, country: string): Promise<{ lat: number; lon: number } | null>`.
- Produces: `GET /api/public/listings/[id]` → `200`:
  ```typescript
  {
    id: string; title: string; description: string | null; landmark: string | null;
    city: string; country: string; propertyType: string; transactionType: string;
    price: number; currency: string; surfaceM2: number | null; capacity: number | null;
    yearBuilt: number | null; standing: string | null; roomsTotal: number | null;
    bedrooms: number | null; bathrooms: number | null; kitchens: number | null;
    amenities: string[]; viewCount: number; createdAt: string;
    photos: { url: string; isPrimary: boolean }[];
    agent: { name: string | null; avatarUrl: string | null; phone: string | null; seed: string };
    location: { lat: number; lon: number } | null;
    similar: Array<{ // same flat shape as GET /api/public/listings' `items`
      id: string; title: string; city: string; country: string; propertyType: string;
      transactionType: string; price: number; currency: string; createdAt: string;
      primaryPhotoUrl: string | null; photoCount: number;
      agent: { name: string | null; avatarUrl: string | null; seed: string };
    }>;
  }
  ```
  `404 { error: 'LISTING_NOT_FOUND' }` when missing or not `VERIFIED`. Task 6's page consumes this exact shape.

- [ ] **Step 1: Write the failing geocode tests**

Create `frontend/src/lib/server/geocode.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { geocodeCity } from './geocode';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('geocodeCity', () => {
  it('returns lat/lon parsed from the first Nominatim result', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '6.3654', lon: '2.4183' }],
    }) as unknown as typeof fetch;
    const result = await geocodeCity('Cotonou', 'Bénin');
    expect(result).toEqual({ lat: 6.3654, lon: 2.4183 });
  });

  it('returns null when Nominatim returns no results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as unknown as typeof fetch;
    const result = await geocodeCity('Nowhere', 'Nowhere');
    expect(result).toBeNull();
  });

  it('returns null when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => [],
    }) as unknown as typeof fetch;
    const result = await geocodeCity('Cotonou', 'Bénin');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const result = await geocodeCity('Cotonou', 'Bénin');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter frontend exec vitest run "src/lib/server/geocode.test.ts"`
Expected: FAIL — `./geocode` does not exist yet.

- [ ] **Step 3: Implement `geocode.ts`**

Create `frontend/src/lib/server/geocode.ts`:

```typescript
// GEOCODE-01 — best-effort city/country → lat/lon via OpenStreetMap's free
// Nominatim search API. No API key. Every failure mode (non-ok response,
// empty result set, thrown network error) resolves to `null` rather than
// throwing — callers treat geocoding as optional enrichment, never a hard
// dependency of the listing-detail response.
import 'server-only';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export async function geocodeCity(city: string, country: string): Promise<GeoPoint | null> {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(`${city}, ${country}`)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HabitatAfrikOffi/1.0' },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = rows[0];
    if (!first) return null;
    const lat = Number.parseFloat(first.lat);
    const lon = Number.parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run geocode tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/lib/server/geocode.test.ts"`
Expected: PASS, all 4 cases green.

- [ ] **Step 5: Write the failing route tests**

Create `frontend/src/app/api/public/listings/[id]/route.test.ts`:

```typescript
// PUBLIC-LISTING-DETAIL-01 — GET /api/public/listings/[id] tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/geocode', () => ({
  geocodeCity: vi.fn().mockResolvedValue({ lat: 6.36, lon: 2.42 }),
}));

import { GET } from './route';

function makeListingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    title: 'Villa duplex standing',
    description: 'Belle villa',
    landmark: null,
    city: 'Cocody',
    country: 'Bénin',
    propertyType: 'VILLA',
    transactionType: 'VENTE',
    price: 185_000_000,
    currency: 'XOF',
    surfaceM2: 320,
    capacity: null,
    yearBuilt: 2022,
    standing: 'HIGH',
    roomsTotal: 6,
    bedrooms: 5,
    bathrooms: 4,
    kitchens: 1,
    amenities: ['POOL', 'PARKING'],
    status: 'VERIFIED',
    viewCount: 10,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    photos: [{ url: 'https://example.com/1.jpg', isPrimary: true }],
    user: { id: 'user-1', name: 'Kofi Atta', avatarUrl: null, phone: '+22990000000' },
    ...overrides,
  };
}

function makeGet(id = 'listing-1'): {
  req: NextRequest;
  ctx: { params: Promise<{ id: string }> };
} {
  return {
    req: new NextRequest(`http://test/api/public/listings/${id}`),
    ctx: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.listing.findUnique.mockResolvedValue(makeListingRow() as never);
  prismaMock.listing.update.mockResolvedValue({ viewCount: 11 } as never);
  prismaMock.listing.findMany.mockResolvedValue([] as never);
});

describe('GET /api/public/listings/[id]', () => {
  it('404s when the listing does not exist', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('LISTING_NOT_FOUND');
  });

  it('404s when the listing is not VERIFIED', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce(
      makeListingRow({ status: 'DRAFT' }) as never,
    );
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it('increments viewCount and returns the updated value', async () => {
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    expect(prismaMock.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1' },
        data: { viewCount: { increment: 1 } },
      }),
    );
    const body = await res.json();
    expect(body.viewCount).toBe(11);
  });

  it('does not fail the request when the viewCount increment throws', async () => {
    prismaMock.listing.update.mockRejectedValueOnce(new Error('db down'));
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.viewCount).toBe(10);
  });

  it('maps agent fields, never including email', async () => {
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(body.agent).toEqual({
      name: 'Kofi Atta',
      avatarUrl: null,
      phone: '+22990000000',
      seed: 'user-1',
    });
    expect(JSON.stringify(body)).not.toContain('"email"');
  });

  it('parses amenities as a string array', async () => {
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(body.amenities).toEqual(['POOL', 'PARKING']);
  });

  it('includes geocoded location from geocodeCity', async () => {
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(body.location).toEqual({ lat: 6.36, lon: 2.42 });
  });

  it('queries similar listings with the same country and propertyType, excluding itself', async () => {
    const { req, ctx } = makeGet();
    await GET(req, ctx);
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'VERIFIED',
          country: 'Bénin',
          propertyType: 'VILLA',
          id: { not: 'listing-1' },
        },
        take: 3,
      }),
    );
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `pnpm --filter frontend exec vitest run "src/app/api/public/listings/[id]/route.test.ts"`
Expected: FAIL — `./route` does not exist yet.

- [ ] **Step 7: Implement the route**

Create `frontend/src/app/api/public/listings/[id]/route.ts`:

```typescript
// PUBLIC-LISTING-DETAIL-01 — GET /api/public/listings/[id]
//
// Unauthenticated, read-only single-listing detail for the public
// "/annonces/[id]" page. Same no-auth pattern as GET /api/public/listings.
// Only a VERIFIED listing is ever returned — 404 for DRAFT/PENDING/SOLD/
// missing, so this route never leaks a non-public listing's existence.
// Increments Listing.viewCount on every successful read (best-effort — a
// lost increment under a race is an acceptable trade-off for a vanity
// counter, no financial/legal invariant here). Also geocodes city/country
// via Nominatim (best-effort, non-fatal) and returns up to 3 similar
// VERIFIED listings (same country + propertyType).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { geocodeCity } from '@/lib/server/geocode';
import { log } from '@/lib/server/observability/log';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const LISTING_SELECT = {
  id: true,
  title: true,
  description: true,
  landmark: true,
  city: true,
  country: true,
  propertyType: true,
  transactionType: true,
  price: true,
  currency: true,
  surfaceM2: true,
  capacity: true,
  yearBuilt: true,
  standing: true,
  roomsTotal: true,
  bedrooms: true,
  bathrooms: true,
  kitchens: true,
  amenities: true,
  status: true,
  viewCount: true,
  createdAt: true,
  photos: {
    orderBy: { position: 'asc' as const },
    select: { url: true, isPrimary: true },
  },
  user: { select: { id: true, name: true, avatarUrl: true, phone: true } },
} as const;

const SIMILAR_SELECT = {
  id: true,
  title: true,
  city: true,
  country: true,
  propertyType: true,
  transactionType: true,
  price: true,
  currency: true,
  createdAt: true,
  photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
  _count: { select: { photos: true } },
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { id } = await ctx.params;

    const listing = await prisma.listing.findUnique({ where: { id }, select: LISTING_SELECT });
    if (!listing || listing.status !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    let viewCount = listing.viewCount;
    try {
      const updated = await prisma.listing.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      viewCount = updated.viewCount;
    } catch (err) {
      log.warn('listing-detail: viewCount increment failed', {
        listingId: id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    const location = await geocodeCity(listing.city, listing.country).catch(() => null);

    const similarRows = await prisma.listing.findMany({
      where: {
        status: 'VERIFIED',
        country: listing.country,
        propertyType: listing.propertyType,
        id: { not: id },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
      select: SIMILAR_SELECT,
    });

    const similar = similarRows.map((r) => ({
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

    return NextResponse.json(
      {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        landmark: listing.landmark,
        city: listing.city,
        country: listing.country,
        propertyType: listing.propertyType,
        transactionType: listing.transactionType,
        price: listing.price,
        currency: listing.currency,
        surfaceM2: listing.surfaceM2,
        capacity: listing.capacity,
        yearBuilt: listing.yearBuilt,
        standing: listing.standing,
        roomsTotal: listing.roomsTotal,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        kitchens: listing.kitchens,
        amenities: (listing.amenities as string[]) ?? [],
        viewCount,
        createdAt: listing.createdAt,
        photos: listing.photos,
        agent: {
          name: listing.user.name,
          avatarUrl: listing.user.avatarUrl,
          phone: listing.user.phone,
          seed: listing.user.id,
        },
        location,
        similar,
      },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/api/public/listings/[id]/route.test.ts"`
Expected: PASS, all 7 cases green.

- [ ] **Step 9: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/lib/server/geocode.ts frontend/src/lib/server/geocode.test.ts frontend/src/app/api/public/listings/\[id\]/
git commit -m "feat(api): add public GET /api/public/listings/[id] with geocoding and similar listings"
```

---

### Task 3: API — `POST /api/public/listings/[id]/inquiries` (message + VR-visit lead)

**Files:**
- Modify: `frontend/src/lib/server/notifications/templates.ts`
- Create: `frontend/src/app/api/public/listings/[id]/inquiries/route.ts`
- Create: `frontend/src/app/api/public/listings/[id]/inquiries/route.test.ts`

**Interfaces:**
- Consumes: `Listing`/`ListingInquiry` from Task 1, `createNotification` from `frontend/src/lib/server/notifications/index.ts`, `getEmailQueue` from `frontend/src/lib/server/queues/email-queue-singleton.ts`, `createEmailLimiter` from `frontend/src/lib/server/middleware/rate-limit-by-email.ts`.
- Produces: `listingInquiryNotification(...)` template function. `POST /api/public/listings/[id]/inquiries` body `{ type: 'MESSAGE'|'VR_VISIT', name, phone, email?, message }` → `201 { ok: true }` or `404 LISTING_NOT_FOUND` / `400 VALIDATION_FAILED` / `429 TOO_MANY_INQUIRIES`.

- [ ] **Step 1: Add the notification template**

In `frontend/src/lib/server/notifications/templates.ts`, append (after `alertMatchNotification`):

```typescript
/**
 * Dispatched to a Listing's owner when a visitor submits the public
 * detail page's contact form (a general message or a VR-visit request).
 */
export function listingInquiryNotification(
  userId: string,
  listingId: string,
  listingTitle: string,
  inquiryId: string,
  inquiryType: 'MESSAGE' | 'VR_VISIT',
  fromName: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'LISTING_INQUIRY',
    title:
      inquiryType === 'VR_VISIT'
        ? `Demande de visite VR — ${listingTitle}`
        : `Nouveau message — ${listingTitle}`,
    body: `${fromName} s'intéresse à « ${listingTitle} ».`,
    data: { listingId, inquiryId },
    dedupeKey: `listing-inquiry:${inquiryId}`,
  };
}
```

- [ ] **Step 2: Write the failing route tests**

Create `frontend/src/app/api/public/listings/[id]/inquiries/route.test.ts`:

```typescript
// PUBLIC-LISTING-INQUIRY-01 — POST /api/public/listings/[id]/inquiries tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockEnqueue = vi.fn().mockResolvedValue({ id: 'email-1' });
vi.mock('@/lib/server/queues/email-queue-singleton', () => ({
  getEmailQueue: () => ({ enqueue: mockEnqueue }),
}));

import { POST } from './route';

function makePost(
  body: unknown,
  opts: { id?: string; ip?: string } = {},
): { req: NextRequest; ctx: { params: Promise<{ id: string }> } } {
  const id = opts.id ?? 'listing-1';
  const headers: Record<string, string> = {
    'x-forwarded-for': opts.ip ?? `test-ip-${Math.random()}`,
  };
  return {
    req: new NextRequest(`http://test/api/public/listings/${id}/inquiries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

const validBody = { type: 'MESSAGE', name: 'Awa', phone: '90000000', message: 'Bonjour' };

beforeEach(() => {
  vi.clearAllMocks();
  mockEnqueue.mockResolvedValue({ id: 'email-1' });
  prismaMock.listing.findUnique.mockResolvedValue({
    id: 'listing-1',
    title: 'Villa duplex standing',
    status: 'VERIFIED',
    userId: 'owner-1',
  } as never);
  prismaMock.listingInquiry.create.mockResolvedValue({
    id: 'inquiry-1',
    listingId: 'listing-1',
    type: 'MESSAGE',
    name: 'Awa',
    phone: '90000000',
    email: null,
    message: 'Bonjour',
    createdAt: new Date(),
  } as never);
  prismaMock.notification.create.mockResolvedValue({} as never);
  prismaMock.user.findUnique.mockResolvedValue({ email: 'owner@example.com' } as never);
});

describe('POST /api/public/listings/[id]/inquiries', () => {
  it('404s when the listing does not exist or is not VERIFIED', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePost(validBody);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it('400s on invalid body', async () => {
    const { req, ctx } = makePost({ type: 'MESSAGE' });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it('creates the inquiry row and returns 201', async () => {
    const { req, ctx } = makePost(validBody);
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
    expect(prismaMock.listingInquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          type: 'MESSAGE',
          name: 'Awa',
          message: 'Bonjour',
        }),
      }),
    );
  });

  it('notifies the listing owner via createNotification', async () => {
    const { req, ctx } = makePost({ ...validBody, type: 'VR_VISIT' });
    await POST(req, ctx);
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'owner-1', type: 'LISTING_INQUIRY' }),
      }),
    );
  });

  it('enqueues an email to the owner', async () => {
    const { req, ctx } = makePost(validBody);
    await POST(req, ctx);
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com' }));
  });

  it('still returns 201 when the email enqueue throws', async () => {
    mockEnqueue.mockRejectedValueOnce(new Error('brevo down'));
    const { req, ctx } = makePost(validBody);
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
  });

  it('rejects a 6th request from the same IP within the window', async () => {
    const ip = 'fixed-rate-limit-ip';
    for (let i = 0; i < 5; i++) {
      const { req, ctx } = makePost(validBody, { ip });
      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
    }
    const { req, ctx } = makePost(validBody, { ip });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter frontend exec vitest run "src/app/api/public/listings/[id]/inquiries/route.test.ts"`
Expected: FAIL — `./route` does not exist yet.

- [ ] **Step 4: Implement the route**

Create `frontend/src/app/api/public/listings/[id]/inquiries/route.ts`:

```typescript
// PUBLIC-LISTING-INQUIRY-01 — POST /api/public/listings/[id]/inquiries
//
// Unauthenticated lead-capture: a visitor on the public listing detail
// page sends a message or requests a VR visit. No CSRF check — same
// pre-session carve-out as /api/auth/signup (an anonymous visitor has no
// CSRF cookie). Rate-limited per-IP (no email/account to key the limiter
// on — `createEmailLimiter` falls back to the IP bucket when passed
// `email: null`). The notification/email side-effects never block or
// fail the 201 — a lead is still captured even if Brevo/notifications
// are down.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { createNotification } from '@/lib/server/notifications';
import { listingInquiryNotification } from '@/lib/server/notifications/templates';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';
import { log } from '@/lib/server/observability/log';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  type: z.enum(['MESSAGE', 'VR_VISIT']),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(30),
  email: z.string().trim().email().optional(),
  message: z.string().trim().min(1).max(2000),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'listing-inquiry',
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: 'TOO_MANY_INQUIRIES',
  message: 'Too many requests. Try again later.',
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const limited = await limiter.check(req, null);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, userId: true },
    });
    if (!listing || listing.status !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const inquiry = await prisma.listingInquiry.create({
      data: {
        listingId: id,
        type: parsed.data.type,
        name: parsed.data.name,
        phone: parsed.data.phone,
        // exactOptionalPropertyTypes: only set the key when defined —
        // assigning `email: undefined` explicitly is a type error against
        // Prisma's `email?: string | null` input shape.
        ...(parsed.data.email !== undefined && { email: parsed.data.email }),
        message: parsed.data.message,
      },
    });

    try {
      await createNotification(
        prisma,
        listingInquiryNotification(
          listing.userId,
          id,
          listing.title,
          inquiry.id,
          parsed.data.type,
          parsed.data.name,
        ),
      );

      const owner = await prisma.user.findUnique({
        where: { id: listing.userId },
        select: { email: true },
      });
      const queue = getEmailQueue();
      if (owner && queue) {
        const subject =
          parsed.data.type === 'VR_VISIT'
            ? `Demande de visite VR — ${listing.title}`
            : `Nouveau message — ${listing.title}`;
        await queue.enqueue({
          to: owner.email,
          subject,
          html: `<p>${parsed.data.name} (${parsed.data.phone}) : ${parsed.data.message}</p>`,
          text: `${parsed.data.name} (${parsed.data.phone}): ${parsed.data.message}`,
        });
      }
    } catch (err) {
      log.warn('listing-inquiry: notification/email dispatch failed', {
        listingId: id,
        inquiryId: inquiry.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/api/public/listings/[id]/inquiries/route.test.ts"`
Expected: PASS, all 7 cases green.

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/server/notifications/templates.ts frontend/src/app/api/public/listings/\[id\]/inquiries/
git commit -m "feat(api): add public POST /api/public/listings/[id]/inquiries lead capture"
```

---

### Task 4: API — `POST /api/public/listings/[id]/reports`

**Files:**
- Create: `frontend/src/app/api/public/listings/[id]/reports/route.ts`
- Create: `frontend/src/app/api/public/listings/[id]/reports/route.test.ts`

**Interfaces:**
- Consumes: `ListingReport` from Task 1, `createEmailLimiter` from `frontend/src/lib/server/middleware/rate-limit-by-email.ts`.
- Produces: `POST /api/public/listings/[id]/reports` body `{ reason: 'FAKE'|'SOLD'|'INCORRECT_INFO'|'SCAM'|'OTHER', detail?: string }` → `201 { ok: true }` or `404 LISTING_NOT_FOUND` / `400 VALIDATION_FAILED` / `429 TOO_MANY_REPORTS`. Consumed by Task 5's admin queue and Task 6's UI.

- [ ] **Step 1: Write the failing route tests**

Create `frontend/src/app/api/public/listings/[id]/reports/route.test.ts`:

```typescript
// PUBLIC-LISTING-REPORT-01 — POST /api/public/listings/[id]/reports tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function makePost(
  body: unknown,
  opts: { id?: string; ip?: string } = {},
): { req: NextRequest; ctx: { params: Promise<{ id: string }> } } {
  const id = opts.id ?? 'listing-1';
  const headers: Record<string, string> = {
    'x-forwarded-for': opts.ip ?? `test-ip-${Math.random()}`,
  };
  return {
    req: new NextRequest(`http://test/api/public/listings/${id}/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

const validBody = { reason: 'FAKE' };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.listing.findUnique.mockResolvedValue({ id: 'listing-1', status: 'VERIFIED' } as never);
  prismaMock.listingReport.create.mockResolvedValue({
    id: 'report-1',
    listingId: 'listing-1',
    reason: 'FAKE',
    detail: null,
    status: 'PENDING',
    createdAt: new Date(),
  } as never);
});

describe('POST /api/public/listings/[id]/reports', () => {
  it('404s when the listing does not exist or is not VERIFIED', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePost(validBody);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it('400s on an invalid reason', async () => {
    const { req, ctx } = makePost({ reason: 'NOPE' });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it('creates the report row and returns 201', async () => {
    const { req, ctx } = makePost({ reason: 'SCAM', detail: 'Semble frauduleux' });
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
    expect(prismaMock.listingReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          reason: 'SCAM',
          detail: 'Semble frauduleux',
        }),
      }),
    );
  });

  it('rejects a 6th request from the same IP within the window', async () => {
    const ip = 'fixed-rate-limit-ip-reports';
    for (let i = 0; i < 5; i++) {
      const { req, ctx } = makePost(validBody, { ip });
      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
    }
    const { req, ctx } = makePost(validBody, { ip });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter frontend exec vitest run "src/app/api/public/listings/[id]/reports/route.test.ts"`
Expected: FAIL — `./route` does not exist yet.

- [ ] **Step 3: Implement the route**

Create `frontend/src/app/api/public/listings/[id]/reports/route.ts`:

```typescript
// PUBLIC-LISTING-REPORT-01 — POST /api/public/listings/[id]/reports
//
// Unauthenticated report/flag submission. Same CSRF carve-out and per-IP
// rate-limit pattern as .../inquiries. No notification is sent on
// purpose — admins review the moderation queue via
// GET /api/admin/listing-reports (Task 5) instead of being paged per
// report.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  reason: z.enum(['FAKE', 'SOLD', 'INCORRECT_INFO', 'SCAM', 'OTHER']),
  detail: z.string().trim().max(1000).optional(),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'listing-report',
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: 'TOO_MANY_REPORTS',
  message: 'Too many requests. Try again later.',
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const limited = await limiter.check(req, null);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!listing || listing.status !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    await prisma.listingReport.create({
      data: {
        listingId: id,
        reason: parsed.data.reason,
        // exactOptionalPropertyTypes: same rule as ListingInquiry.email above.
        ...(parsed.data.detail !== undefined && { detail: parsed.data.detail }),
      },
    });

    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/api/public/listings/[id]/reports/route.test.ts"`
Expected: PASS, all 4 cases green.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/api/public/listings/\[id\]/reports/
git commit -m "feat(api): add public POST /api/public/listings/[id]/reports"
```

---

### Task 5: API — admin `GET`/`PATCH /api/admin/listing-reports` moderation queue

**Files:**
- Create: `frontend/src/app/api/admin/listing-reports/route.ts`
- Create: `frontend/src/app/api/admin/listing-reports/route.test.ts`
- Create: `frontend/src/app/api/admin/listing-reports/[id]/route.ts`
- Create: `frontend/src/app/api/admin/listing-reports/[id]/route.test.ts`

**Interfaces:**
- Consumes: `ListingReport` from Task 1, `requireAdmin`/`enforceAdminRateLimit` middleware, `clampLimit`/`cursorWhere`/`decodeCursor`/`buildPage` from `frontend/src/lib/server/pagination/paginate.ts`, `logAdminAction` from `frontend/src/lib/server/admin/audit.ts`.
- Produces: `GET /api/admin/listing-reports?status=&cursor=&limit=` → `{ items, nextCursor }`. `PATCH /api/admin/listing-reports/[id]` body `{ status: 'REVIEWED'|'DISMISSED' }` → `200 { report }` / `404 REPORT_NOT_FOUND` / `400 VALIDATION_FAILED`. No frontend consumes this in this plan — API only, per spec.

- [ ] **Step 1: Write the failing GET tests**

Create `frontend/src/app/api/admin/listing-reports/route.test.ts`:

```typescript
// ADMIN-LISTING-REPORTS-01 — GET /api/admin/listing-reports tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({
  requireAdmin: vi.fn(),
}));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { GET } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);

const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
  prismaMock.listingReport.findMany.mockResolvedValue([] as never);
});

describe('GET /api/admin/listing-reports', () => {
  it('applies the status filter when provided', async () => {
    await GET(makeGet('http://test/api/admin/listing-reports?status=PENDING'));
    expect(prismaMock.listingReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
    );
  });

  it('returns items + nextCursor', async () => {
    prismaMock.listingReport.findMany.mockResolvedValueOnce([
      {
        id: 'r1',
        listingId: 'l1',
        reason: 'FAKE',
        detail: null,
        status: 'PENDING',
        createdAt: new Date('2026-08-01T00:00:00Z'),
        listing: { id: 'l1', title: 'Villa', status: 'VERIFIED' },
      },
    ] as never);
    const res = await GET(makeGet('http://test/api/admin/listing-reports'));
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.nextCursor).toBeNull();
  });

  it('propagates 403 from requireAdmin without a DB hit', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(makeGet('http://test/api/admin/listing-reports'));
    expect(res.status).toBe(403);
    expect(prismaMock.listingReport.findMany).not.toHaveBeenCalled();
  });

  it('propagates 429 from the rate limiter without a DB hit', async () => {
    mockRateLimit.mockResolvedValueOnce(
      NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 }),
    );
    const res = await GET(makeGet('http://test/api/admin/listing-reports'));
    expect(res.status).toBe(429);
    expect(prismaMock.listingReport.findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Write the failing PATCH tests**

Create `frontend/src/app/api/admin/listing-reports/[id]/route.test.ts`:

```typescript
// ADMIN-LISTING-REPORTS-02 — PATCH /api/admin/listing-reports/[id] tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({
  requireAdmin: vi.fn(),
}));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { PATCH } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);

const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makePatch(
  id: string,
  body: unknown,
): { req: NextRequest; ctx: { params: Promise<{ id: string }> } } {
  return {
    req: new NextRequest(`http://test/api/admin/listing-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
  prismaMock.listingReport.findUnique.mockResolvedValue({ id: 'r1', status: 'PENDING' } as never);
  prismaMock.listingReport.update.mockResolvedValue({ id: 'r1', status: 'DISMISSED' } as never);
  prismaMock.adminAction.create.mockResolvedValue({} as never);
});

describe('PATCH /api/admin/listing-reports/[id]', () => {
  it('404s when the report does not exist', async () => {
    prismaMock.listingReport.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePatch('missing', { status: 'DISMISSED' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it('400s on an invalid status', async () => {
    const { req, ctx } = makePatch('r1', { status: 'NOPE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('updates the status and logs an admin action', async () => {
    const { req, ctx } = makePatch('r1', { status: 'DISMISSED' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.listingReport.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1' }, data: { status: 'DISMISSED' } }),
    );
    expect(prismaMock.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'listing-report.resolve', targetId: 'r1' }),
      }),
    );
  });
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `pnpm --filter frontend exec vitest run "src/app/api/admin/listing-reports"`
Expected: FAIL — neither route exists yet.

- [ ] **Step 4: Implement the GET route**

Create `frontend/src/app/api/admin/listing-reports/route.ts`:

```typescript
// ADMIN-LISTING-REPORTS-01 — GET /api/admin/listing-reports
//
// Moderation queue for visitor-submitted listing reports (Task 4's
// public POST endpoint). Cursor pagination mirrors GET
// /api/admin/withdrawals's shared helpers. `status` filter is optional
// (omit to see every status); pass `?status=PENDING` for the actionable
// queue. No admin frontend consumes this in this plan — API only.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const REPORT_SELECT = {
  id: true,
  listingId: true,
  reason: true,
  detail: true,
  status: true,
  createdAt: true,
  listing: { select: { id: true, title: true, status: true } },
} as const satisfies Prisma.ListingReportSelect;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const status = url.searchParams.get('status');
    const cursor = decodeCursor(url.searchParams.get('cursor'));

    const where: Prisma.ListingReportWhereInput = {
      ...(status ? { status } : {}),
      ...cursorWhere(cursor),
    };

    const rows = await prisma.listingReport.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: REPORT_SELECT,
    });

    return NextResponse.json(buildPage(rows, limit), { headers: { 'x-request-id': ctx.requestId } });
  });
}
```

- [ ] **Step 5: Implement the PATCH route**

Create `frontend/src/app/api/admin/listing-reports/[id]/route.ts`:

```typescript
// ADMIN-LISTING-REPORTS-02 — PATCH /api/admin/listing-reports/[id]
//
// Resolves a report: REVIEWED (admin looked at it, no action needed
// beyond that) or DISMISSED (not actionable). Unlike
// /api/admin/users/[id]/status, there's no same-value no-op suppression
// — re-resolving a report (e.g. correcting a mistaken DISMISSED) is a
// legitimate action here, not audit-log noise.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  status: z.enum(['REVIEWED', 'DISMISSED']),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const existing = await prisma.listingReport.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'REPORT_NOT_FOUND', message: 'Report not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const updated = await prisma.listingReport.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    await logAdminAction(prisma, {
      actorId: auth.admin.id,
      action: 'listing-report.resolve',
      targetType: 'ListingReport',
      targetId: id,
      metadata: { from: existing.status, to: parsed.data.status },
    });

    return NextResponse.json(
      { report: updated },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/api/admin/listing-reports"`
Expected: PASS, all 8 cases green (4 GET + 4 PATCH).

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/api/admin/listing-reports/
git commit -m "feat(api): add admin listing-reports moderation queue (GET/PATCH)"
```

---

### Task 6: UI — wire `/annonces/[id]` to the public API

**Files:**
- Modify: `frontend/src/app/annonces/[id]/page.tsx` (full rewrite of the component body — mock data, `SIMILAR`/`FEATURES`/`AMENITIES`/`META` constants, and the message/report/VR button markup are replaced; `PublicNavbar`/`PublicFooter` usage and the overall visual/section structure are kept)

**Interfaces:**
- Consumes: `GET /api/public/listings/[id]` DTO from Task 2, `POST .../inquiries` from Task 3, `POST .../reports` from Task 4, `InitialsAvatar` `seed` prop (already shipped), `PROPERTY_TYPE_LABEL`, `TRANSACTION_TYPE_LABEL`, `STANDING_LABEL`, `AMENITY_LABEL`, `formatListingPrice` from `frontend/src/lib/listings.ts`, `COUNTRY_FLAG`, `formatDate` from `frontend/src/lib/alerts.ts`, `api` from `frontend/src/lib/api.ts`.

- [ ] **Step 1: Replace the file contents**

Replace the full contents of `frontend/src/app/annonces/[id]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Calendar,
  Car,
  ChevronDown,
  Droplets,
  Eye,
  FileText,
  Flag,
  Grid2x2,
  Heart,
  Image as ImageIcon,
  Info,
  LayoutList,
  Loader2,
  Map,
  MapPin,
  MessageSquare,
  Move,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  TreePine,
  Utensils,
  Video,
  Waves,
  Wifi,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { InitialsAvatar } from '@/components/dashboard/InitialsAvatar';
import {
  PROPERTY_TYPE_LABEL,
  TRANSACTION_TYPE_LABEL,
  STANDING_LABEL,
  AMENITY_LABEL,
  formatListingPrice,
} from '@/lib/listings';
import { COUNTRY_FLAG, formatDate } from '@/lib/alerts';

interface PublicListingDetail {
  id: string;
  title: string;
  description: string | null;
  landmark: string | null;
  city: string;
  country: string;
  propertyType: string;
  transactionType: string;
  price: number;
  currency: string;
  surfaceM2: number | null;
  capacity: number | null;
  yearBuilt: number | null;
  standing: string | null;
  roomsTotal: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  kitchens: number | null;
  amenities: string[];
  viewCount: number;
  createdAt: string;
  photos: { url: string; isPrimary: boolean }[];
  agent: { name: string | null; avatarUrl: string | null; phone: string | null; seed: string };
  location: { lat: number; lon: number } | null;
  similar: SimilarListing[];
}

interface SimilarListing {
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

const AMENITY_ICON: Record<string, typeof Waves> = {
  POOL: Waves,
  PARKING: Car,
  AC: Wind,
  GARDEN: TreePine,
  GENERATOR: Zap,
  RUNNING_WATER: Droplets,
  SECURITY: ShieldCheck,
  TERRACE: Sun,
  FIBER: Wifi,
  ELEVATOR: Move,
  INTERCOM: Phone,
  FITTED_KITCHEN: Utensils,
};

const REPORT_REASON_LABEL: Record<string, string> = {
  FAKE: 'Annonce factice',
  SOLD: 'Déjà vendu / loué',
  INCORRECT_INFO: 'Informations incorrectes',
  SCAM: 'Arnaque suspectée',
  OTHER: 'Autre',
};

function InertRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div title="Bientôt disponible" className={cn('cursor-not-allowed select-none', className)}>
      {children}
    </div>
  );
}

export default function AnnonceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [listing, setListing] = useState<PublicListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const [inquiryType, setInquiryType] = useState<'MESSAGE' | 'VR_VISIT'>('MESSAGE');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Bonjour, je suis intéressé par cette annonce...');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('FAKE');
  const [reportDetail, setReportDetail] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<PublicListingDetail>(`/api/public/listings/${id}`)
      .then((res) => {
        if (cancelled) return;
        setListing(res);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendError('');
    try {
      await api(`/api/public/listings/${id}/inquiries`, {
        method: 'POST',
        body: { type: inquiryType, name, phone, message },
      });
      setSent(true);
    } catch (err) {
      setSendError(
        err instanceof ApiError && err.status === 429
          ? 'Trop de demandes envoyées. Réessayez plus tard.'
          : "Échec de l'envoi. Réessayez.",
      );
    } finally {
      setSending(false);
    }
  }

  async function submitReport() {
    setReportSending(true);
    try {
      await api(`/api/public/listings/${id}/reports`, {
        method: 'POST',
        body: { reason: reportReason, detail: reportDetail || undefined },
      });
      setReportSent(true);
    } catch {
      // best-effort — the reason select stays open so the visitor can retry
    } finally {
      setReportSending(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="bg-[#F5F6F8] text-[#1A1A1A]">
        <PublicNavbar active="annonces" />
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
          <p className="text-xs text-gray-400">Chargement de l&apos;annonce…</p>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="bg-[#F5F6F8] text-[#1A1A1A]">
        <PublicNavbar active="annonces" />
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-sm font-medium text-neutral-700">Cette annonce est introuvable.</p>
          <Link href="/annonces" className="text-sm font-semibold text-brand">
            Retour aux annonces
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const FEATURES: { icon: typeof BedDouble; val: string | number; label: string }[] = [
    ...(listing.bedrooms !== null ? [{ icon: BedDouble, val: listing.bedrooms, label: 'Chambres' }] : []),
    ...(listing.bathrooms !== null
      ? [{ icon: Bath, val: listing.bathrooms, label: 'Salles de bain' }]
      : []),
    ...(listing.surfaceM2 !== null
      ? [{ icon: Move, val: `${listing.surfaceM2} m²`, label: 'Surface' }]
      : []),
    ...(listing.roomsTotal !== null
      ? [{ icon: LayoutList, val: listing.roomsTotal, label: 'Pièces' }]
      : []),
    ...(listing.kitchens !== null ? [{ icon: Utensils, val: listing.kitchens, label: 'Cuisines' }] : []),
    ...(listing.capacity !== null ? [{ icon: Grid2x2, val: listing.capacity, label: 'Capacité' }] : []),
    ...(listing.yearBuilt !== null ? [{ icon: Calendar, val: listing.yearBuilt, label: 'Année' }] : []),
    ...(listing.standing !== null
      ? [{ icon: Sparkles, val: STANDING_LABEL[listing.standing] ?? listing.standing, label: 'Standing' }]
      : []),
  ];

  const primaryPhoto = listing.photos.find((p) => p.isPrimary) ?? listing.photos[0];
  const otherPhotos = listing.photos.filter((p) => p !== primaryPhoto).slice(0, 2);

  return (
    <div className="bg-[#F5F6F8] text-[#1A1A1A]">
      <PublicNavbar active="annonces" />

      {/* BREADCRUMB */}
      <div className="border-b border-black/[0.06] bg-white py-3.5">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 text-[13px] text-gray-500 lg:px-7">
          <Link href="/" className="text-gray-500">
            Accueil
          </Link>
          <span className="text-gray-300">/</span>
          <Link href="/annonces" className="text-gray-500">
            Annonces
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-neutral-900">{listing.title}</span>
        </div>
      </div>

      {/* HERO GALLERY */}
      <div className="bg-[#0F172A]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-[3px] lg:h-[420px] lg:grid-cols-[1.45fr_1fr]">
          <div className="relative h-[260px] overflow-hidden lg:h-full">
            {primaryPhoto ? (
              <img src={primaryPhoto.url} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-800">
                <ImageIcon className="h-10 w-10 text-slate-500" aria-hidden />
              </div>
            )}
            <div className="absolute top-4 left-4 z-[2] flex gap-2">
              <span className="rounded-full bg-emerald-500 px-3.5 py-[5px] text-xs font-bold whitespace-nowrap text-white">
                {TRANSACTION_TYPE_LABEL[listing.transactionType] ?? listing.transactionType}
              </span>
              <span className="rounded-full bg-black/75 px-3.5 py-[5px] text-xs font-bold whitespace-nowrap text-white">
                {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
              </span>
            </div>
            <div className="absolute top-4 right-4 z-[2] flex gap-2">
              <button
                type="button"
                onClick={() => setSaved((s) => !s)}
                className="flex items-center gap-1.5 rounded-full bg-white/92 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-neutral-900"
              >
                <Heart
                  className={cn('h-3.5 w-3.5', saved ? 'fill-red-500 text-red-500' : 'text-red-500')}
                  aria-hidden
                />
                {saved ? 'Sauvegardé' : 'Sauvegarder'}
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 rounded-full bg-white/92 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-neutral-900"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                {shared ? 'Lien copié !' : 'Partager'}
              </button>
            </div>
            {listing.photos.length > 0 && (
              <span className="absolute right-3.5 bottom-3.5 z-[2] flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-[5px] text-xs font-semibold whitespace-nowrap text-white">
                <ImageIcon className="h-[13px] w-[13px]" aria-hidden />
                {listing.photos.length} photo{listing.photos.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="grid grid-rows-2 gap-[3px]">
            {otherPhotos.length > 0 ? (
              otherPhotos.map((p) => (
                <div key={p.url} className="h-[130px] overflow-hidden lg:h-full">
                  <img src={p.url} alt={listing.title} className="h-full w-full object-cover" />
                </div>
              ))
            ) : (
              <>
                <div className="flex h-[130px] items-center justify-center bg-slate-800 lg:h-full">
                  <ImageIcon className="h-8 w-8 text-slate-600" aria-hidden />
                </div>
                <div className="flex h-[130px] items-center justify-center bg-slate-800 lg:h-full">
                  <ImageIcon className="h-8 w-8 text-slate-600" aria-hidden />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DETAIL CONTENT */}
      <div className="mx-auto max-w-[1280px] px-4 py-9 pb-[72px] lg:px-7">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* MAIN */}
          <div className="min-w-0">
            {/* TITLE BLOCK */}
            <div className="mb-4 rounded-2xl bg-white p-7">
              <div className="mb-4 flex flex-col-reverse items-start justify-between gap-5 sm:flex-row">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold whitespace-nowrap text-brand">
                    {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType} ·{' '}
                    {TRANSACTION_TYPE_LABEL[listing.transactionType] ?? listing.transactionType}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold whitespace-nowrap text-emerald-600">
                    <BadgeCheck className="h-[11px] w-[11px]" aria-hidden />
                    Annonce vérifiée
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold whitespace-nowrap text-gray-500">
                    Réf. {listing.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[26px] font-extrabold whitespace-nowrap text-brand lg:text-[30px]">
                    {formatListingPrice(listing.price, listing.currency)}
                  </div>
                </div>
              </div>
              <h1 className="font-sora mb-3 text-2xl font-extrabold tracking-[-0.03em] lg:text-[26px]">
                {listing.title}
              </h1>
              <div className="mb-4.5 flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="h-[15px] w-[15px] flex-shrink-0 text-brand" aria-hidden />
                {listing.city}
                {listing.landmark ? ` — ${listing.landmark}` : ''} ·{' '}
                {COUNTRY_FLAG[listing.country] ?? ''} {listing.country}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-black/[0.06] pt-3.5">
                <span className="flex items-center gap-1.5 text-[13px] whitespace-nowrap text-gray-500">
                  <Eye className="h-[13px] w-[13px]" aria-hidden />
                  {listing.viewCount} vue{listing.viewCount === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1.5 text-[13px] whitespace-nowrap text-gray-500">
                  <Calendar className="h-[13px] w-[13px]" aria-hidden />
                  Publié le {formatDate(listing.createdAt)}
                </span>
              </div>
            </div>

            {/* CARACTERISTIQUES */}
            {FEATURES.length > 0 && (
              <div className="mb-4 rounded-2xl bg-white p-7">
                <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                  <LayoutList className="h-[17px] w-[17px] text-brand" aria-hidden />
                  Caractéristiques
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {FEATURES.map((f) => (
                    <div
                      key={f.label}
                      className="flex flex-col items-center gap-1.5 rounded-[14px] bg-gray-50 px-2.5 py-4 text-center"
                    >
                      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-brand/10">
                        <f.icon className="h-[18px] w-[18px] text-brand" aria-hidden />
                      </div>
                      <div className="text-base font-bold">{f.val}</div>
                      <div className="text-[11px] leading-tight text-gray-500">{f.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EQUIPEMENTS */}
            {listing.amenities.length > 0 && (
              <div className="mb-4 rounded-2xl bg-white p-7">
                <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                  <Wrench className="h-[17px] w-[17px] text-brand" aria-hidden />
                  Équipements &amp; prestations
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {listing.amenities.map((key) => {
                    const Icon = AMENITY_ICON[key] ?? Sparkles;
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2.5 rounded-[10px] bg-gray-50 px-3.5 py-2.5 text-[13px]"
                      >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                          <Icon className="h-3.5 w-3.5 text-brand" aria-hidden />
                        </div>
                        {AMENITY_LABEL[key] ?? key}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DESCRIPTION */}
            {listing.description && (
              <div className="mb-4 rounded-2xl bg-white p-7">
                <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                  <FileText className="h-[17px] w-[17px] text-brand" aria-hidden />
                  Description
                </div>
                <p
                  className={cn(
                    'text-sm leading-[1.75] whitespace-pre-line',
                    !descExpanded && 'line-clamp-4',
                  )}
                >
                  {listing.description}
                </p>
                {listing.description.length > 240 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-semibold text-brand"
                  >
                    {descExpanded ? 'Voir moins' : 'Lire la suite'}
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', descExpanded && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                )}
              </div>
            )}

            {/* LOCALISATION */}
            {listing.location && (
              <div className="mb-4 rounded-2xl bg-white p-7">
                <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                  <Map className="h-[17px] w-[17px] text-brand" aria-hidden />
                  Localisation
                </div>
                <div className="overflow-hidden rounded-[14px]">
                  <iframe
                    title="Localisation"
                    className="h-[280px] w-full border-0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.location.lon - 0.05},${listing.location.lat - 0.05},${listing.location.lon + 0.05},${listing.location.lat + 0.05}&marker=${listing.location.lat},${listing.location.lon}&layer=mapnik`}
                  />
                </div>
                <div className="mt-3 flex items-start gap-1.5 text-[13px] text-gray-500">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand" aria-hidden />
                  {listing.city}, {listing.country} — Adresse exacte communiquée après contact avec
                  l&apos;agent
                </div>
              </div>
            )}

            {/* ANNONCES SIMILAIRES */}
            {listing.similar.length > 0 && (
              <div className="rounded-2xl bg-white p-7">
                <div className="mb-5 flex items-center gap-2 text-[17px] font-bold">
                  <Grid2x2 className="h-[17px] w-[17px] text-brand" aria-hidden />
                  Annonces similaires
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {listing.similar.map((s) => (
                    <Link
                      key={s.id}
                      href={`/annonces/${s.id}`}
                      className="overflow-hidden rounded-[14px] border border-black/[0.06]"
                    >
                      <div className="relative h-[148px] bg-gray-100">
                        {s.primaryPhotoUrl ? (
                          <img
                            src={s.primaryPhotoUrl}
                            alt={s.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-gray-300" aria-hidden />
                          </div>
                        )}
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-emerald-500 px-2.5 py-[3px] text-[11px] font-bold whitespace-nowrap text-white">
                          {TRANSACTION_TYPE_LABEL[s.transactionType] ?? s.transactionType}
                        </span>
                      </div>
                      <div className="p-3.5">
                        <p className="mb-1 truncate text-[13px] font-bold">{s.title}</p>
                        <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-[11px] w-[11px]" aria-hidden />
                          {s.city} · {COUNTRY_FLAG[s.country] ?? ''} {s.country}
                        </p>
                        <p className="text-[15px] font-extrabold text-brand">
                          {formatListingPrice(s.price, s.currency)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="flex flex-col gap-3.5 lg:sticky lg:top-5">
            {/* PRICE + AGENT + CTA */}
            <div className="rounded-2xl bg-white p-[22px]">
              <div className="mb-[18px] text-[26px] font-extrabold whitespace-nowrap text-brand">
                {formatListingPrice(listing.price, listing.currency)}
              </div>

              <div className="mb-[18px] flex items-center gap-3 rounded-xl bg-gray-50 p-3.5">
                <InitialsAvatar
                  name={listing.agent.name}
                  email=""
                  avatarUrl={listing.agent.avatarUrl}
                  seed={listing.agent.seed}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{listing.agent.name ?? 'Agent'}</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap text-emerald-600">
                    <BadgeCheck className="h-[11px] w-[11px]" aria-hidden />
                    Vérifié
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setInquiryType('MESSAGE');
                  document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-3 py-3.5 text-sm font-bold whitespace-nowrap text-white"
              >
                <Send className="h-[15px] w-[15px]" aria-hidden />
                Contacter l&apos;agent
              </button>
              {listing.agent.phone ? (
                <a
                  href={`tel:${listing.agent.phone}`}
                  className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-gray-50 px-3 py-3 text-sm font-semibold whitespace-nowrap"
                >
                  <Phone className="h-[15px] w-[15px] text-emerald-500" aria-hidden />
                  Appeler l&apos;agent
                </a>
              ) : (
                <InertRow className="mb-2.5">
                  <span className="flex w-full items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-gray-50 px-3 py-3 text-sm font-semibold whitespace-nowrap">
                    <Phone className="h-[15px] w-[15px] text-emerald-500" aria-hidden />
                    Appeler l&apos;agent
                  </span>
                </InertRow>
              )}
              <button
                type="button"
                onClick={() => {
                  setInquiryType('VR_VISIT');
                  document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-brand bg-brand/[0.06] px-3 py-3 text-sm font-bold whitespace-nowrap text-brand"
              >
                <Video className="h-[15px] w-[15px]" aria-hidden />
                Demander une visite VR
              </button>
              <button
                type="button"
                onClick={() => setReportOpen((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 text-xs whitespace-nowrap text-gray-500"
              >
                <Flag className="h-[13px] w-[13px]" aria-hidden />
                Signaler cette annonce
              </button>

              {reportOpen && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3.5">
                  {reportSent ? (
                    <p className="text-center text-xs font-medium text-emerald-600">
                      Signalement envoyé. Merci.
                    </p>
                  ) : (
                    <>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="mb-2 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-xs"
                      >
                        {Object.entries(REPORT_REASON_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={reportDetail}
                        onChange={(e) => setReportDetail(e.target.value)}
                        placeholder="Détail (facultatif)"
                        rows={2}
                        className="mb-2 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 py-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={reportSending}
                        onClick={submitReport}
                        className="w-full rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {reportSending ? 'Envoi…' : 'Envoyer le signalement'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* CONTACT FORM */}
            <div id="inquiry-form" className="rounded-2xl bg-white p-[22px]">
              <div className="mb-4 flex items-center gap-2 text-[15px] font-bold">
                <MessageSquare className="h-4 w-4 text-brand" aria-hidden />
                {inquiryType === 'VR_VISIT' ? 'Demander une visite VR' : 'Envoyer un message'}
              </div>
              {sent ? (
                <p className="rounded-lg bg-emerald-50 p-3 text-center text-xs font-medium text-emerald-600">
                  Votre demande a été envoyée à l&apos;agent.
                </p>
              ) : (
                <form onSubmit={submitInquiry}>
                  <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
                    Nom complet
                  </p>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    className="mb-3 w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[13px] outline-none placeholder:text-gray-400"
                  />
                  <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
                    Téléphone
                  </p>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+225 · Votre numéro"
                    className="mb-3 w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[13px] outline-none placeholder:text-gray-400"
                  />
                  <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
                    Message
                  </p>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="mb-3 w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[13px] outline-none"
                  />
                  {sendError && <p className="mb-3 text-xs text-red-500">{sendError}</p>}
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-3 py-3 text-sm font-bold whitespace-nowrap text-white disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    {sending ? 'Envoi…' : 'Envoyer'}
                  </button>
                </form>
              )}
            </div>

            {/* META CARD */}
            <div className="rounded-2xl bg-white p-[22px]">
              <div className="mb-1 flex items-center gap-2 text-[15px] font-bold">
                <Info className="h-4 w-4 text-brand" aria-hidden />
                Infos pratiques
              </div>
              {[
                { label: 'Référence', value: listing.id.slice(-8).toUpperCase() },
                { label: 'Publié le', value: formatDate(listing.createdAt) },
                {
                  label: 'Type de bien',
                  value: PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType,
                },
                {
                  label: 'Transaction',
                  value: TRANSACTION_TYPE_LABEL[listing.transactionType] ?? listing.transactionType,
                },
                { label: 'Statut', value: 'Vérifié', green: true },
              ].map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between border-b border-black/[0.06] py-2.5 text-[13px] last:border-0"
                >
                  <span className="text-gray-500">{m.label}</span>
                  <span className={cn('font-semibold', m.green ? 'text-emerald-500' : 'text-neutral-900')}>
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors in `frontend/src/app/annonces/[id]/page.tsx`.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no unused-import or unused-variable warnings (in particular: every icon imported from `lucide-react` must be used — remove any left over from the old mock's `FEATURES`/`AMENITIES` constants that no longer apply, e.g. `Layers`, `Mountain`, `Cpu`, `User`, `Star`, `RefreshCw`, `CalendarPlus` are NOT imported in the new version above).

- [ ] **Step 4: Manual verification in the browser**

Run: `pnpm dev`, navigate to `http://localhost:3000/annonces/<a real VERIFIED listing id>` (find one via `pnpm db:studio` or from `/annonces`). Verify:
- Real title, price, city/country, photos (or the gray placeholder if none) render — no "Kofi Atta" or invented copy anywhere.
- Reloading the page increments `viewCount` (visible in the "X vues" line) — confirm via `pnpm db:studio` that `Listing.viewCount` actually incremented in the database.
- Caractéristiques/Équipements/Description/Localisation sections only appear when the underlying listing actually has that data (test against a listing missing some fields, e.g. no `description`).
- "Appeler l'agent" is a real `tel:` link when the agent has a phone, decorative otherwise.
- Filling and submitting "Envoyer un message" returns a success state; confirm via `pnpm db:studio` that a `ListingInquiry` row was created, and that a `Notification` row exists for the listing owner.
- Clicking "Demander une visite VR" scrolls to the same form with its header switched to "Demander une visite VR"; submitting creates a `ListingInquiry` with `type: 'VR_VISIT'`.
- "Signaler cette annonce" opens the reason form; submitting creates a `ListingReport` row (check via `pnpm db:studio`).
- "Partager" copies the current URL to the clipboard and shows "Lien copié !" briefly.
- Annonces similaires shows other VERIFIED listings sharing the same country + propertyType (or the section is hidden if none exist).
- A non-existent or non-VERIFIED listing id shows the "introuvable" state, not a crash.

- [ ] **Step 5: Full verification suite**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass (aside from the already-known pre-existing, unrelated failure in `frontend/src/app/api/listings/[id]/route.test.ts` — confirm no new failures appear in any `annonces`, `public/listings`, `geocode`, or `admin/listing-reports` files).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/annonces/\[id\]/page.tsx
git commit -m "feat(annonces): wire listing detail page to real data, contact form, and reports"
```
