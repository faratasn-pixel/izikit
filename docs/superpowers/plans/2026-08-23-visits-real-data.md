# Visites programmées — brancher des données réelles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static mock data on `/visites` with a real `Visit` Prisma model, full CRUD API routes, and a real navigable month calendar — a visit is always created by converting an existing `ListingInquiry`.

**Architecture:** New `Visit` model with a unique `inquiryId` FK to `ListingInquiry` (no duplicated client/listing data — always joined through `inquiry.listing`). Four new/extended API routes under `frontend/src/app/api/visits/` following the exact `requireAuth`/`verifyCsrf`/`withRequestContext`/cursor-pagination pattern already used by `api/listings/inquiries`. The frontend page is rewired incrementally: table+stats first, then the calendar, then the creation flow — each step leaves the page in a working, deployable state.

**Tech Stack:** Next.js 16 Route Handlers, Prisma 5, Zod, Vitest + `vitest-mock-extended` (`prismaMock`), React (client component), the existing `api()` fetch wrapper (`frontend/src/lib/api.ts`).

**Spec:** [docs/superpowers/specs/2026-08-23-visits-real-data-design.md](../specs/2026-08-23-visits-real-data-design.md)

## Global Constraints

- Every Route Handler file MUST start with `export const runtime = 'nodejs';` (CI tripwire enforces this).
- Mutating routes call `verifyCsrf(req)` before `requireAuth()`, same order as every existing route.
- Ownership mismatches return **404**, never 403 (existing convention on `ListingInquiry`/`Listing`).
- Payment/money handling is not touched by this feature — n/a here, but no new deviation from the "integer smallest unit" rule since we only read `listing.price`, never write it.
- No `DELETE` route — cancellation is `PATCH { status: 'ANNULEE' }` (soft, per spec).
- No hard-coded secrets; no new env vars needed.
- `pnpm format && pnpm lint && pnpm typecheck && pnpm test` must pass before any commit that isn't itself a fix for one of these.

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend/prisma/schema.prisma` | `Visit` model + `ListingInquiry.visit` back-relation |
| `frontend/prisma/migrations/<ts>_add_visit/` | Generated migration (via `prisma migrate dev`) |
| `frontend/src/lib/visits.ts` | Shared types, status/type label+badge maps, date formatters, `buildCalendarGrid` (pure, unit-tested) |
| `frontend/src/lib/server/visits/select.ts` | Shared Prisma `select` shape + status/type tuples, consumed by the three `/api/visits*` routes |
| `frontend/src/app/api/visits/route.ts` | `GET` (paginated list + monthly stats), `POST` (create from an inquiry) |
| `frontend/src/app/api/visits/route.test.ts` | Tests for the above |
| `frontend/src/app/api/visits/[id]/route.ts` | `PATCH` (status/notes/scheduledAt/type) |
| `frontend/src/app/api/visits/[id]/route.test.ts` | Tests for the above |
| `frontend/src/app/api/visits/calendar/route.ts` | `GET` month grid + today/upcoming agenda |
| `frontend/src/app/api/visits/calendar/route.test.ts` | Tests for the above |
| `frontend/src/app/api/listings/inquiries/route.ts` | +`?eligibleForVisit=true` filter (modify) |
| `frontend/src/app/api/listings/inquiries/route.test.ts` | +tests for the new filter (modify) |
| `frontend/src/app/visites/page.tsx` | Rewired page — table/stats (Task 7), calendar (Task 8), create modal (Task 9) |

---

### Task 1: Prisma schema — `Visit` model

**Files:**
- Modify: `frontend/prisma/schema.prisma:505-523` (the `ListingInquiry` model) and immediately after it
- Migration: generated, not hand-written

**Interfaces:**
- Produces: Prisma model `Visit` with fields `id, inquiryId, scheduledAt, type, status, notes, createdAt, updatedAt`; `ListingInquiry.visit` optional back-relation. All later tasks query via `prisma.visit.*` and `prisma.listingInquiry.findUnique({ ..., select: { visit: ... } })`.

- [ ] **Step 1: Add the `visit` back-relation field to `ListingInquiry`**

In `frontend/prisma/schema.prisma`, the `ListingInquiry` model currently ends like this (around line 516-523):

```prisma
  status String  @default("EN_ATTENTE") // EN_ATTENTE | REPONDU | VISITE_PLANIFIEE | NON_QUALIFIE
  notes  String?

  createdAt DateTime @default(now())

  @@index([listingId, createdAt])
  @@index([status, createdAt])
}
```

Change it to:

```prisma
  status String  @default("EN_ATTENTE") // EN_ATTENTE | REPONDU | VISITE_PLANIFIEE | NON_QUALIFIE
  notes  String?

  createdAt DateTime @default(now())

  // One inquiry converts into at most one scheduled visit — see Visit below.
  visit Visit?

  @@index([listingId, createdAt])
  @@index([status, createdAt])
}
```

- [ ] **Step 2: Add the `Visit` model**

Immediately after the `ListingInquiry` model's closing `}` (and before the `ListingReport` model comment), insert:

```prisma
// A scheduled property visit — always created by converting an existing
// ListingInquiry (see frontend/src/app/api/visits/route.ts POST). No
// client/listing fields are duplicated here; they're read through
// `inquiry.name/phone/email` and `inquiry.listing`. Creating a Visit also
// flips the source ListingInquiry.status to VISITE_PLANIFIEE.
model Visit {
  id        String         @id @default(cuid())
  inquiryId String         @unique
  inquiry   ListingInquiry @relation(fields: [inquiryId], references: [id], onDelete: Cascade)

  scheduledAt DateTime
  type        String  @default("PRESENTIEL") // PRESENTIEL | VIRTUELLE
  status      String  @default("EN_ATTENTE") // CONFIRMEE | EN_ATTENTE | ANNULEE
  notes       String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([scheduledAt])
  @@index([status])
}
```

- [ ] **Step 3: Generate the migration**

Run from repo root:
```bash
pnpm --filter frontend exec prisma migrate dev --name add_visit
```
Expected: Prisma prints "Your database is now in sync with your schema" and creates
`frontend/prisma/migrations/<timestamp>_add_visit/migration.sql` containing a `CREATE TABLE "Visit"` and an `ALTER TABLE "ListingInquiry"` is **not** needed (the back-relation is virtual, no column added to `ListingInquiry`). Verify the generated SQL contains `CREATE TABLE "Visit"`, a `FOREIGN KEY ("inquiryId") REFERENCES "ListingInquiry"`, and a `UNIQUE` constraint on `"inquiryId"`.

- [ ] **Step 4: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations
git commit -m "feat(schema): add Visit model linked to ListingInquiry"
```

---

### Task 2: Shared types, labels, formatters, calendar-grid helper

**Files:**
- Create: `frontend/src/lib/visits.ts`
- Test: `frontend/src/lib/visits.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no server/DB imports — safe for both client components and, where convenient, route handlers).
- Produces: types `VisitStatus`, `VisitType`, `Visit`, `VisitStats`, `EligibleInquiry`, `CalendarDayEvent`, `CalendarCell`, `AgendaVisit`, `VisitsCalendarResponse`; constants `STATUS_LABEL`, `STATUS_BADGE_CLASS`, `TYPE_LABEL`, `TYPE_BADGE_CLASS`, `DATE_BLOCK_STYLE`; functions `formatVisitTime(iso): string`, `formatVisitDateTime(iso): string`, `formatVisitDayMonth(iso): { day: string; month: string }`, `formatDateKey(d: Date): string`, `buildCalendarGrid(year, month, eventsByDate): CalendarCell[]`. Task 7-9 (the page) and Task 3/5 (server routes, for the type constants only) import from here.

- [ ] **Step 1: Write the failing test for `buildCalendarGrid`**

Create `frontend/src/lib/visits.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCalendarGrid, formatDateKey } from './visits';

describe('buildCalendarGrid', () => {
  it('builds the July 2025 grid with correct leading/trailing days (Tue 1st → Thu 31st)', () => {
    const cells = buildCalendarGrid(2025, 7, {});
    // Monday-start week: July 1 2025 is a Tuesday, so 1 leading day (June 30),
    // 31 days of July, then 3 trailing days (Aug 1-3) to complete the last week.
    expect(cells).toHaveLength(35);
    expect(cells[0]).toMatchObject({ day: 30, dateStr: '2025-06-30', otherMonth: true });
    expect(cells[1]).toMatchObject({ day: 1, dateStr: '2025-07-01', otherMonth: false });
    expect(cells[31]).toMatchObject({ day: 31, dateStr: '2025-07-31', otherMonth: false });
    expect(cells[32]).toMatchObject({ day: 1, dateStr: '2025-08-01', otherMonth: true });
    expect(cells[34]).toMatchObject({ day: 3, dateStr: '2025-08-03', otherMonth: true });
  });

  it('attaches events from eventsByDate to the matching day, empty array otherwise', () => {
    const events = { '2025-07-15': [{ id: 'v1', label: 'Villa, Lomé', status: 'CONFIRMEE' as const }] };
    const cells = buildCalendarGrid(2025, 7, events);
    const day15 = cells.find((c) => c.dateStr === '2025-07-15');
    expect(day15?.events).toEqual(events['2025-07-15']);
    const day14 = cells.find((c) => c.dateStr === '2025-07-14');
    expect(day14?.events).toEqual([]);
  });

  it('handles a January boundary (leading days roll back to the previous December)', () => {
    const cells = buildCalendarGrid(2026, 1, {});
    // Jan 1 2026 is a Thursday → 3 leading days from Dec 2025.
    expect(cells[0]).toMatchObject({ day: 29, dateStr: '2025-12-29', otherMonth: true });
    expect(cells[3]).toMatchObject({ day: 1, dateStr: '2026-01-01', otherMonth: false });
  });
});

describe('formatDateKey', () => {
  it('formats a Date as YYYY-MM-DD using local date parts', () => {
    expect(formatDateKey(new Date(2025, 6, 5))).toBe('2025-07-05');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/lib/visits.test.ts`
Expected: FAIL — `./visits` module does not exist yet.

- [ ] **Step 3: Implement `frontend/src/lib/visits.ts`**

```ts
export type VisitStatus = 'CONFIRMEE' | 'EN_ATTENTE' | 'ANNULEE';
export type VisitType = 'PRESENTIEL' | 'VIRTUELLE';

export interface VisitListingSummary {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  transactionType: string;
  price: number;
  currency: string;
}

export interface VisitInquirySummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  listing: VisitListingSummary;
}

export interface Visit {
  id: string;
  scheduledAt: string;
  type: VisitType;
  status: VisitStatus;
  notes: string | null;
  createdAt: string;
  inquiry: VisitInquirySummary;
}

export interface VisitStats {
  total: number;
  confirmees: number;
  enAttente: number;
  annulees: number;
}

export interface EligibleInquiry {
  id: string;
  name: string;
  phone: string;
  message: string;
  createdAt: string;
  listing: { id: string; title: string; city: string };
}

export interface CalendarDayEvent {
  id: string;
  label: string;
  status: VisitStatus;
}

export interface CalendarCell {
  day: number;
  dateStr: string;
  otherMonth: boolean;
  events: CalendarDayEvent[];
}

export interface AgendaVisit {
  id: string;
  listingTitle: string;
  scheduledAt: string;
  clientName: string;
  status: VisitStatus;
}

export interface VisitsCalendarResponse {
  days: { date: string; events: CalendarDayEvent[] }[];
  today: AgendaVisit[];
  upcoming: AgendaVisit[];
}

export const STATUS_LABEL: Record<VisitStatus, string> = {
  CONFIRMEE: 'Confirmée',
  EN_ATTENTE: 'En attente',
  ANNULEE: 'Annulée',
};

export const STATUS_BADGE_CLASS: Record<VisitStatus, string> = {
  CONFIRMEE: 'bg-emerald-100 text-emerald-800',
  EN_ATTENTE: 'bg-amber-100 text-amber-800',
  ANNULEE: 'bg-red-100 text-red-700',
};

export const TYPE_LABEL: Record<VisitType, string> = {
  PRESENTIEL: 'Présentiel',
  VIRTUELLE: 'Virtuelle',
};

export const TYPE_BADGE_CLASS: Record<VisitType, string> = {
  PRESENTIEL: 'bg-brand/10 text-brand',
  VIRTUELLE: 'bg-purple-100 text-purple-700',
};

export const DATE_BLOCK_STYLE: Record<VisitStatus, { bg: string; text: string }> = {
  CONFIRMEE: { bg: 'bg-[#F0FDF4]', text: 'text-emerald-600' },
  EN_ATTENTE: { bg: 'bg-[#FEF9EE]', text: 'text-amber-600' },
  ANNULEE: { bg: 'bg-red-50', text: 'text-red-600' },
};

export function formatVisitTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h');
}

export function formatVisitDateTime(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return `${datePart} · ${formatVisitTime(iso)}`;
}

export function formatVisitDayMonth(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
  };
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Monday-start month grid. `month` is 1-12. `eventsByDate` keys are
 * `YYYY-MM-DD`. Always returns a multiple of 7 cells (5 or 6 full weeks),
 * padding with the trailing days of the previous/next month.
 */
export function buildCalendarGrid(
  year: number,
  month: number,
  eventsByDate: Record<string, CalendarDayEvent[]>,
): CalendarCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=Mon..6=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 2, day);
    cells.push({ day, dateStr: formatDateKey(d), otherMonth: true, events: [] });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dateStr = formatDateKey(d);
    cells.push({ day, dateStr, otherMonth: false, events: eventsByDate[dateStr] ?? [] });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailing = 7 - remainder;
    for (let day = 1; day <= trailing; day++) {
      const d = new Date(year, month, day);
      cells.push({ day, dateStr: formatDateKey(d), otherMonth: true, events: [] });
    }
  }
  return cells;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/lib/visits.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/visits.ts frontend/src/lib/visits.test.ts
git commit -m "feat(visits): add shared types, formatters and calendar-grid helper"
```

---

### Task 3: `GET /api/visits` + `POST /api/visits`

**Files:**
- Create: `frontend/src/lib/server/visits/select.ts`
- Create: `frontend/src/app/api/visits/route.ts`
- Test: `frontend/src/app/api/visits/route.test.ts`

**Interfaces:**
- Consumes: `requireAuth` (`@/lib/server/middleware`), `verifyCsrf` (`@/lib/server/auth`), `prisma` (`@/lib/server/prisma`), `clampLimit/cursorWhere/decodeCursor/buildPage` (`@/lib/server/pagination/paginate`), `makeRequestContext/withRequestContext` (`@/lib/server/observability/request-context`), `zCuid` (`@/lib/server/zod-helpers`).
- Produces: `VISIT_STATUSES`, `VISIT_TYPES`, `VISIT_SELECT` from `@/lib/server/visits/select` (consumed by Task 4's `[id]/route.ts`). `GET` response `{ items, nextCursor, stats: { total, confirmees, enAttente, annulees } }`. `POST` response `{ visit }` (status 201), error codes `VALIDATION_FAILED` (400), `INQUIRY_NOT_FOUND` (404), `VISIT_ALREADY_EXISTS` (409).

- [ ] **Step 1: Create the shared select/const module**

Create `frontend/src/lib/server/visits/select.ts`:

```ts
import 'server-only';

export const VISIT_STATUSES = ['CONFIRMEE', 'EN_ATTENTE', 'ANNULEE'] as const;
export const VISIT_TYPES = ['PRESENTIEL', 'VIRTUELLE'] as const;

export const VISIT_SELECT = {
  id: true,
  scheduledAt: true,
  type: true,
  status: true,
  notes: true,
  createdAt: true,
  inquiry: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      listing: {
        select: {
          id: true,
          title: true,
          city: true,
          country: true,
          propertyType: true,
          transactionType: true,
          price: true,
          currency: true,
        },
      },
    },
  },
} as const;
```

- [ ] **Step 2: Write the failing tests**

Create `frontend/src/app/api/visits/route.test.ts`:

```ts
// VISITS-01/02 — GET /api/visits, POST /api/visits tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

mockNextCookies();

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { GET, POST } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makeGet(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/visits${qs}`, { method: 'GET' });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://test/api/visits', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-csrf' },
    body: JSON.stringify(body),
  });
}

function makeVisit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    scheduledAt: new Date('2026-08-25T09:30:00Z'),
    type: 'PRESENTIEL',
    status: 'EN_ATTENTE',
    notes: null,
    createdAt: new Date('2026-08-20T09:14:00Z'),
    inquiry: {
      id: 'i1',
      name: 'Amavi Kodjovi',
      phone: '+228 90 34 12 78',
      email: 'amavi.k@gmail.com',
      listing: {
        id: 'l1',
        title: 'Villa F4',
        city: 'Lomé',
        country: 'Togo',
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 85_000_000,
        currency: 'XOF',
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.visit.count.mockResolvedValue(0 as never);
  prismaMock.visit.findMany.mockResolvedValue([] as never);
});

describe('GET /api/visits', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect(prismaMock.visit.findMany).not.toHaveBeenCalled();
  });

  it('scopes the query to the authenticated user via inquiry.listing', async () => {
    await GET(makeGet());
    const args = prismaMock.visit.findMany.mock.calls[0]?.[0];
    expect(args?.where?.inquiry).toMatchObject({ listing: { userId: 'user-1' } });
    for (const call of prismaMock.visit.count.mock.calls) {
      expect(call[0]?.where?.inquiry).toMatchObject({ listing: { userId: 'user-1' } });
    }
  });

  it('returns items with the joined inquiry/listing fields', async () => {
    prismaMock.visit.findMany.mockResolvedValue([makeVisit()] as never);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: 'v1',
      status: 'EN_ATTENTE',
      inquiry: { name: 'Amavi Kodjovi', listing: { title: 'Villa F4' } },
    });
  });

  it('emits a nextCursor when more rows exist than the limit', async () => {
    prismaMock.visit.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, i) => makeVisit({ id: `v${i}` })) as never,
    );
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items).toHaveLength(20);
    expect(body.nextCursor).toBeTruthy();
  });

  it('applies ?search= as a case-insensitive OR on inquiry.name / listing.title', async () => {
    await GET(makeGet('?search=villa'));
    const args = prismaMock.visit.findMany.mock.calls[0]?.[0];
    expect(args?.where?.OR).toEqual([
      { inquiry: { name: { contains: 'villa', mode: 'insensitive' } } },
      { inquiry: { listing: { title: { contains: 'villa', mode: 'insensitive' } } } },
    ]);
  });

  it('applies ?status= when it is a valid status', async () => {
    await GET(makeGet('?status=CONFIRMEE'));
    const args = prismaMock.visit.findMany.mock.calls[0]?.[0];
    expect(args?.where?.status).toBe('CONFIRMEE');
  });

  it('ignores an invalid ?status=', async () => {
    await GET(makeGet('?status=NOPE'));
    const args = prismaMock.visit.findMany.mock.calls[0]?.[0];
    expect(args?.where?.status).toBeUndefined();
  });

  it('computes monthly stats from count queries scoped to the same user', async () => {
    prismaMock.visit.count
      .mockResolvedValueOnce(24 as never) // total
      .mockResolvedValueOnce(17 as never) // confirmees
      .mockResolvedValueOnce(5 as never) // enAttente
      .mockResolvedValueOnce(2 as never); // annulees
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.stats).toEqual({ total: 24, confirmees: 17, enAttente: 5, annulees: 2 });
  });

  it('response includes x-request-id header', async () => {
    const res = await GET(makeGet());
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});

describe('POST /api/visits', () => {
  const eligibleInquiry = {
    id: 'i1',
    listing: { userId: 'user-1' },
    visit: null,
  };

  beforeEach(() => {
    prismaMock.listingInquiry.findUnique.mockResolvedValue(eligibleInquiry as never);
    prismaMock.$transaction.mockImplementation((async (cb: unknown) => {
      const tx = {
        visit: { create: vi.fn().mockResolvedValue(makeVisit()) },
        listingInquiry: { update: vi.fn().mockResolvedValue({}) },
      };
      return (cb as (t: typeof tx) => unknown)(tx);
    }) as never);
  });

  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await POST(
      makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z' }),
    );
    expect(res.status).toBe(401);
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const res = await POST(
      makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z' }),
    );
    expect(res.status).toBe(403);
  });

  it('400s on an invalid body', async () => {
    const res = await POST(makePost({ inquiryId: 'i1' }));
    expect(res.status).toBe(400);
  });

  it('404s when the inquiry does not exist', async () => {
    prismaMock.listingInquiry.findUnique.mockResolvedValueOnce(null as never);
    const res = await POST(
      makePost({ inquiryId: 'missing', scheduledAt: '2026-08-25T09:30:00.000Z' }),
    );
    expect(res.status).toBe(404);
  });

  it('404s when the inquiry belongs to another user (not 403)', async () => {
    prismaMock.listingInquiry.findUnique.mockResolvedValueOnce({
      id: 'i1',
      listing: { userId: 'someone-else' },
      visit: null,
    } as never);
    const res = await POST(
      makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z' }),
    );
    expect(res.status).toBe(404);
  });

  it('409s when the inquiry already has a visit', async () => {
    prismaMock.listingInquiry.findUnique.mockResolvedValueOnce({
      id: 'i1',
      listing: { userId: 'user-1' },
      visit: { id: 'v-existing' },
    } as never);
    const res = await POST(
      makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z' }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('VISIT_ALREADY_EXISTS');
  });

  it('creates the visit and flips the inquiry status to VISITE_PLANIFIEE in one transaction', async () => {
    let updateArgs: unknown;
    let createArgs: unknown;
    prismaMock.$transaction.mockImplementationOnce((async (cb: unknown) => {
      const tx = {
        visit: {
          create: vi.fn().mockImplementation((args: unknown) => {
            createArgs = args;
            return Promise.resolve(makeVisit());
          }),
        },
        listingInquiry: {
          update: vi.fn().mockImplementation((args: unknown) => {
            updateArgs = args;
            return Promise.resolve({});
          }),
        },
      };
      return (cb as (t: typeof tx) => unknown)(tx);
    }) as never);

    const res = await POST(
      makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z', type: 'VIRTUELLE' }),
    );
    expect(res.status).toBe(201);
    expect(createArgs).toMatchObject({ data: { inquiryId: 'i1', type: 'VIRTUELLE' } });
    expect(updateArgs).toMatchObject({ where: { id: 'i1' }, data: { status: 'VISITE_PLANIFIEE' } });
  });
});

describe('source invariants', () => {
  it("route source contains runtime='nodejs' and withRequestContext", () => {
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    expect(src).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
    expect(src).toContain('withRequestContext');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run src/app/api/visits/route.test.ts`
Expected: FAIL — `./route` module does not exist yet.

- [ ] **Step 4: Implement `frontend/src/app/api/visits/route.ts`**

```ts
// VISITS-01 — GET /api/visits
//
// Cursor-paginated list of the current agent's scheduled visits, scoped via
// the `inquiry.listing.userId` relation (same two-hop ownership pattern as
// GET /api/listings/inquiries's `listing.userId`). `stats` covers the
// current calendar month by `scheduledAt`, independent of `?search=`/
// `?status=` — mirrors the always-visible stats bar on /visites, which
// doesn't change when the table is filtered.
//
// VISITS-02 — POST /api/visits
//
// Converts an existing ListingInquiry into a scheduled Visit. Requires the
// inquiry to belong to one of the caller's own listings and to not already
// have a visit (Visit.inquiryId is unique). Flips
// ListingInquiry.status → VISITE_PLANIFIEE in the same transaction as the
// Visit insert.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { zCuid } from '@/lib/server/zod-helpers';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { VISIT_SELECT, VISIT_STATUSES, VISIT_TYPES } from '@/lib/server/visits/select';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));
    const scope = { inquiry: { listing: { userId: auth.user.sub } } } as const;

    const search = url.searchParams.get('search')?.trim();
    const searchFilter = search
      ? {
          OR: [
            { inquiry: { name: { contains: search, mode: 'insensitive' as const } } },
            { inquiry: { listing: { title: { contains: search, mode: 'insensitive' as const } } } },
          ],
        }
      : {};

    const statusParam = url.searchParams.get('status');
    const statusFilter =
      statusParam && (VISIT_STATUSES as readonly string[]).includes(statusParam)
        ? { status: statusParam }
        : {};

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthScope = { ...scope, scheduledAt: { gte: monthStart, lt: monthEnd } };

    const [rows, total, confirmees, enAttente, annulees] = await Promise.all([
      prisma.visit.findMany({
        where: { ...scope, ...searchFilter, ...statusFilter, ...cursorWhere(cursor) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: VISIT_SELECT,
      }),
      prisma.visit.count({ where: monthScope }),
      prisma.visit.count({ where: { ...monthScope, status: 'CONFIRMEE' } }),
      prisma.visit.count({ where: { ...monthScope, status: 'EN_ATTENTE' } }),
      prisma.visit.count({ where: { ...monthScope, status: 'ANNULEE' } }),
    ]);

    return NextResponse.json(
      { ...buildPage(rows, limit), stats: { total, confirmees, enAttente, annulees } },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const CreateBody = z.object({
  inquiryId: zCuid,
  scheduledAt: z.coerce.date(),
  type: z.enum(VISIT_TYPES).default('PRESENTIEL'),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const inquiry = await prisma.listingInquiry.findUnique({
      where: { id: parsed.data.inquiryId },
      select: { id: true, listing: { select: { userId: true } }, visit: { select: { id: true } } },
    });
    if (!inquiry || inquiry.listing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'INQUIRY_NOT_FOUND', message: 'Contact not found' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    if (inquiry.visit) {
      return NextResponse.json(
        { error: 'VISIT_ALREADY_EXISTS', message: 'This contact already has a scheduled visit' },
        { status: 409, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const visit = await prisma.$transaction(async (tx) => {
      const created = await tx.visit.create({
        data: {
          inquiryId: parsed.data.inquiryId,
          scheduledAt: parsed.data.scheduledAt,
          type: parsed.data.type,
          notes: parsed.data.notes,
        },
        select: VISIT_SELECT,
      });
      await tx.listingInquiry.update({
        where: { id: parsed.data.inquiryId },
        data: { status: 'VISITE_PLANIFIEE' },
      });
      return created;
    });

    return NextResponse.json(
      { visit },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run src/app/api/visits/route.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/server/visits/select.ts frontend/src/app/api/visits/route.ts frontend/src/app/api/visits/route.test.ts
git commit -m "feat(api): add GET/POST /api/visits"
```

---

### Task 4: `PATCH /api/visits/[id]`

**Files:**
- Create: `frontend/src/app/api/visits/[id]/route.ts`
- Test: `frontend/src/app/api/visits/[id]/route.test.ts`

**Interfaces:**
- Consumes: `VISIT_SELECT`, `VISIT_STATUSES`, `VISIT_TYPES` from `@/lib/server/visits/select` (Task 3).
- Produces: `PATCH` response `{ visit }` (200), same `Visit` shape as Task 3. Error codes `VALIDATION_FAILED` (400), `VISIT_NOT_FOUND` (404). Consumed by the page's edit/cancel actions (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/api/visits/[id]/route.test.ts`:

```ts
// VISITS-03 — PATCH /api/visits/[id] tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { PATCH } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makePatch(
  id: string,
  body: unknown,
): { req: NextRequest; ctx: { params: Promise<{ id: string }> } } {
  return {
    req: new NextRequest(`http://test/api/visits/${id}`, {
      method: 'PATCH',
      headers: { 'x-csrf-token': 'test-csrf' },
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.visit.findUnique.mockResolvedValue({
    id: 'v1',
    inquiry: { listing: { userId: 'user-1' } },
  } as never);
  prismaMock.visit.update.mockResolvedValue({
    id: 'v1',
    status: 'ANNULEE',
    notes: null,
  } as never);
});

describe('PATCH /api/visits/[id]', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(403);
  });

  it('404s when the visit does not exist', async () => {
    prismaMock.visit.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePatch('missing', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it('404s when the visit belongs to another user (not 403)', async () => {
    prismaMock.visit.findUnique.mockResolvedValueOnce({
      id: 'v1',
      inquiry: { listing: { userId: 'someone-else' } },
    } as never);
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
    expect(prismaMock.visit.update).not.toHaveBeenCalled();
  });

  it('400s on an invalid status', async () => {
    const { req, ctx } = makePatch('v1', { status: 'NOPE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('400s when no field is provided', async () => {
    const { req, ctx } = makePatch('v1', {});
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('updates only status when only status is provided (cancel action)', async () => {
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.visit.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'v1' }, data: { status: 'ANNULEE' } }),
    );
  });

  it('updates scheduledAt and type together (edit action)', async () => {
    const { req, ctx } = makePatch('v1', {
      scheduledAt: '2026-09-01T10:00:00.000Z',
      type: 'VIRTUELLE',
    });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const args = prismaMock.visit.update.mock.calls[0]?.[0];
    expect(args?.data).toMatchObject({ type: 'VIRTUELLE' });
    expect(args?.data?.scheduledAt).toBeInstanceOf(Date);
  });

  it('response includes x-request-id header', async () => {
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run "src/app/api/visits/[id]/route.test.ts"`
Expected: FAIL — `./route` module does not exist yet.

- [ ] **Step 3: Implement `frontend/src/app/api/visits/[id]/route.ts`**

```ts
// VISITS-03 — PATCH /api/visits/[id]
//
// Edits a scheduled visit (date/time, type, notes) or cancels it
// (`status: 'ANNULEE'`) — there is no DELETE route, cancellation is a soft
// status change. Ownership is checked through the `inquiry.listing.userId`
// relation, 404 (not 403) on mismatch, same convention as
// PATCH /api/listings/inquiries/[id].
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { VISIT_SELECT, VISIT_STATUSES, VISIT_TYPES } from '@/lib/server/visits/select';

const PatchBody = z
  .object({
    status: z.enum(VISIT_STATUSES).optional(),
    notes: z.string().trim().max(2000).optional(),
    scheduledAt: z.coerce.date().optional(),
    type: z.enum(VISIT_TYPES).optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.notes !== undefined ||
      d.scheduledAt !== undefined ||
      d.type !== undefined,
    { message: 'At least one field required' },
  );

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await ctx.params;
    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const existing = await prisma.visit.findUnique({
      where: { id },
      select: { id: true, inquiry: { select: { listing: { select: { userId: true } } } } },
    });
    if (!existing || existing.inquiry.listing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'VISIT_NOT_FOUND', message: 'Visit not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const data: {
      status?: (typeof VISIT_STATUSES)[number];
      notes?: string;
      scheduledAt?: Date;
      type?: (typeof VISIT_TYPES)[number];
    } = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.scheduledAt !== undefined) data.scheduledAt = parsed.data.scheduledAt;
    if (parsed.data.type !== undefined) data.type = parsed.data.type;

    const visit = await prisma.visit.update({
      where: { id },
      data,
      select: VISIT_SELECT,
    });

    return NextResponse.json(
      { visit },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/api/visits/[id]/route.test.ts"`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/api/visits/[id]/route.ts" "frontend/src/app/api/visits/[id]/route.test.ts"
git commit -m "feat(api): add PATCH /api/visits/[id]"
```

---

### Task 5: `GET /api/visits/calendar`

**Files:**
- Create: `frontend/src/app/api/visits/calendar/route.ts`
- Test: `frontend/src/app/api/visits/calendar/route.test.ts`

**Interfaces:**
- Consumes: `PROPERTY_TYPE_LABEL` from `@/lib/listings` (plain module, safe to import server-side).
- Produces: response shape matching `VisitsCalendarResponse` from `@/lib/visits` (Task 2): `{ days: { date, events }[], today: AgendaVisit[], upcoming: AgendaVisit[] }`. Consumed by the page's calendar view (Task 8).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/api/visits/calendar/route.test.ts`:

```ts
// VISITS-04 — GET /api/visits/calendar tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from '@/lib/server/middleware';
import { GET } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makeGet(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/visits/calendar${qs}`, { method: 'GET' });
}

function monthVisit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    scheduledAt: new Date('2026-08-15T09:30:00Z'),
    status: 'CONFIRMEE',
    inquiry: { listing: { city: 'Lomé', propertyType: 'VILLA' } },
    ...overrides,
  };
}

function agendaVisit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v2',
    scheduledAt: new Date('2026-08-20T14:00:00Z'),
    status: 'EN_ATTENTE',
    inquiry: { name: 'Moussa Diallo', listing: { title: 'Appartement Plateau' } },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.visit.findMany.mockResolvedValue([] as never);
});

describe('GET /api/visits/calendar', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await GET(makeGet('?year=2026&month=8'));
    expect(res.status).toBe(401);
  });

  it('defaults to the current year/month when absent or invalid', async () => {
    await GET(makeGet());
    // Three findMany calls: month grid, today, upcoming — all scoped to the caller.
    for (const call of prismaMock.visit.findMany.mock.calls) {
      expect(call[0]?.where?.inquiry).toMatchObject({ listing: { userId: 'user-1' } });
    }
  });

  it('groups month visits into days keyed by YYYY-MM-DD with a short label', async () => {
    prismaMock.visit.findMany.mockResolvedValueOnce([monthVisit()] as never); // month grid call
    const res = await GET(makeGet('?year=2026&month=8'));
    const body = await res.json();
    expect(body.days).toEqual([
      { date: '2026-08-15', events: [{ id: 'v1', label: 'Villa, Lomé', status: 'CONFIRMEE' }] },
    ]);
  });

  it('excludes ANNULEE visits from today/upcoming but not from the month grid', async () => {
    prismaMock.visit.findMany
      .mockResolvedValueOnce([monthVisit({ status: 'ANNULEE' })] as never) // month grid
      .mockResolvedValueOnce([] as never) // today
      .mockResolvedValueOnce([] as never); // upcoming
    const res = await GET(makeGet('?year=2026&month=8'));
    const body = await res.json();
    expect(body.days[0].events[0].status).toBe('ANNULEE');
    const todayCall = prismaMock.visit.findMany.mock.calls[1]?.[0];
    expect(todayCall?.where?.status).toEqual({ not: 'ANNULEE' });
  });

  it('maps today/upcoming rows to AgendaVisit shape', async () => {
    prismaMock.visit.findMany
      .mockResolvedValueOnce([] as never) // month grid
      .mockResolvedValueOnce([agendaVisit()] as never) // today
      .mockResolvedValueOnce([] as never); // upcoming
    const res = await GET(makeGet('?year=2026&month=8'));
    const body = await res.json();
    expect(body.today).toEqual([
      {
        id: 'v2',
        listingTitle: 'Appartement Plateau',
        scheduledAt: '2026-08-20T14:00:00.000Z',
        clientName: 'Moussa Diallo',
        status: 'EN_ATTENTE',
      },
    ]);
  });

  it('response includes x-request-id header', async () => {
    const res = await GET(makeGet('?year=2026&month=8'));
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});

describe('source invariants', () => {
  it("route source contains runtime='nodejs' and withRequestContext", () => {
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    expect(src).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
    expect(src).toContain('withRequestContext');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run src/app/api/visits/calendar/route.test.ts`
Expected: FAIL — `./route` module does not exist yet.

- [ ] **Step 3: Implement `frontend/src/app/api/visits/calendar/route.ts`**

```ts
// VISITS-04 — GET /api/visits/calendar
//
// Feeds the /visites "Calendrier" tab: the month grid (`days`, keyed by
// `?year`/`?month`, defaulting to the current month) plus `today` and
// `upcoming` agendas. `today`/`upcoming` are always computed against the
// real current date regardless of which month is displayed — navigating
// the grid must not move the side panel. Cancelled visits (`ANNULEE`) are
// excluded from `today`/`upcoming` (they're not something to act on today)
// but still shown in the month grid (still useful history there).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { PROPERTY_TYPE_LABEL } from '@/lib/listings';

function parseYearMonth(url: URL): { year: number; month: number } {
  const now = new Date();
  const yearParam = Number.parseInt(url.searchParams.get('year') ?? '', 10);
  const monthParam = Number.parseInt(url.searchParams.get('month') ?? '', 10);
  const year = Number.isInteger(yearParam) && yearParam > 0 ? yearParam : now.getFullYear();
  const month =
    Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : now.getMonth() + 1;
  return { year, month };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { year, month } = parseYearMonth(req.nextUrl);
    const scope = { inquiry: { listing: { userId: auth.user.sub } } } as const;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const agendaSelect = {
      id: true,
      scheduledAt: true,
      status: true,
      inquiry: { select: { name: true, listing: { select: { title: true } } } },
    } as const;

    const [monthVisits, todayVisits, upcomingVisits] = await Promise.all([
      prisma.visit.findMany({
        where: { ...scope, scheduledAt: { gte: monthStart, lt: monthEnd } },
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          inquiry: { select: { listing: { select: { city: true, propertyType: true } } } },
        },
      }),
      prisma.visit.findMany({
        where: { ...scope, status: { not: 'ANNULEE' }, scheduledAt: { gte: todayStart, lt: todayEnd } },
        orderBy: { scheduledAt: 'asc' },
        select: agendaSelect,
      }),
      prisma.visit.findMany({
        where: { ...scope, status: { not: 'ANNULEE' }, scheduledAt: { gt: now } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: agendaSelect,
      }),
    ]);

    const dayMap = new Map<string, { id: string; label: string; status: string }[]>();
    for (const v of monthVisits) {
      const key = dateKey(v.scheduledAt);
      const propertyType = v.inquiry.listing.propertyType;
      const label = `${PROPERTY_TYPE_LABEL[propertyType] ?? propertyType}, ${v.inquiry.listing.city}`;
      const events = dayMap.get(key) ?? [];
      events.push({ id: v.id, label, status: v.status });
      dayMap.set(key, events);
    }
    const days = Array.from(dayMap.entries()).map(([date, events]) => ({ date, events }));

    const toAgenda = (rows: typeof todayVisits) =>
      rows.map((v) => ({
        id: v.id,
        listingTitle: v.inquiry.listing.title,
        scheduledAt: v.scheduledAt.toISOString(),
        clientName: v.inquiry.name,
        status: v.status,
      }));

    return NextResponse.json(
      { days, today: toAgenda(todayVisits), upcoming: toAgenda(upcomingVisits) },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run src/app/api/visits/calendar/route.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/visits/calendar
git commit -m "feat(api): add GET /api/visits/calendar"
```

---

### Task 6: `?eligibleForVisit=true` on `GET /api/listings/inquiries`

**Files:**
- Modify: `frontend/src/app/api/listings/inquiries/route.ts`
- Modify: `frontend/src/app/api/listings/inquiries/route.test.ts`

**Interfaces:**
- Produces: `GET /api/listings/inquiries?eligibleForVisit=true` returns only inquiries with `status != 'VISITE_PLANIFIEE'` and no linked `Visit`. Consumed by the page's "Planifier une visite" picker (Task 9).

- [ ] **Step 1: Write the failing test**

In `frontend/src/app/api/listings/inquiries/route.test.ts`, add this test inside the existing `describe('GET /api/listings/inquiries', ...)` block (after the `'clamps ?limit='` test):

```ts
  it('applies the eligibleForVisit filter (status != VISITE_PLANIFIEE and no linked visit)', async () => {
    await GET(makeGet('?eligibleForVisit=true'));
    const args = prismaMock.listingInquiry.findMany.mock.calls[0]?.[0];
    expect(args?.where?.status).toEqual({ not: 'VISITE_PLANIFIEE' });
    expect(args?.where?.visit).toBeNull();
  });

  it('does not apply the eligibleForVisit filter by default', async () => {
    await GET(makeGet());
    const args = prismaMock.listingInquiry.findMany.mock.calls[0]?.[0];
    expect(args?.where?.status).toBeUndefined();
    expect(args?.where?.visit).toBeUndefined();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/api/listings/inquiries/route.test.ts`
Expected: FAIL on the two new tests — `args?.where?.status` is `undefined` for the first, filter not applied.

- [ ] **Step 3: Add the filter to `frontend/src/app/api/listings/inquiries/route.ts`**

Find this block:

```ts
    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));
    const scope = { listing: { userId: auth.user.sub } } as const;
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
```

Change it to:

```ts
    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));
    const scope = { listing: { userId: auth.user.sub } } as const;
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    // Used by the "Planifier une visite" picker on /visites — an inquiry
    // that already has a linked Visit, or is already marked
    // VISITE_PLANIFIEE, can't be converted a second time (Visit.inquiryId
    // is unique).
    const eligibleForVisit = url.searchParams.get('eligibleForVisit') === 'true';
    const eligibleFilter = eligibleForVisit
      ? { status: { not: 'VISITE_PLANIFIEE' as const }, visit: null }
      : {};
```

Then find the `findMany` call's `where`:

```ts
      prisma.listingInquiry.findMany({
        where: { ...scope, ...cursorWhere(cursor) },
```

Change it to:

```ts
      prisma.listingInquiry.findMany({
        where: { ...scope, ...eligibleFilter, ...cursorWhere(cursor) },
```

(The `stats` count queries below stay scoped to `scope` only — `eligibleForVisit` is a picker-only view, the stats bar it's called from doesn't use the `stats` field in the response.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/api/listings/inquiries/route.test.ts`
Expected: PASS (all cases, including the two new ones).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/listings/inquiries/route.ts frontend/src/app/api/listings/inquiries/route.test.ts
git commit -m "feat(api): add ?eligibleForVisit filter to GET /api/listings/inquiries"
```

---

### Task 7: Wire the table + stats bar to real data

**Files:**
- Modify: `frontend/src/app/visites/page.tsx` (full rewrite of the data layer; calendar/create-modal come in Tasks 8-9)

**Interfaces:**
- Consumes: `Visit`, `VisitStats`, `STATUS_LABEL`, `STATUS_BADGE_CLASS`, `TYPE_LABEL`, `TYPE_BADGE_CLASS`, `formatVisitDateTime` from `@/lib/visits` (Task 2); `api`, `ApiError` from `@/lib/api`; `useToast` from `@/contexts/ToastContext`. `GET /api/visits` and `PATCH /api/visits/[id]` from Tasks 3-4.
- Produces: the page keeps its default export `VisitesPage`. Task 8 extends the same file to add calendar state; Task 9 extends it further to add the create modal. Both build on the `refetchTable()` function and `items`/`stats` state defined here.

This task replaces the whole file. There is no unit-test harness for pages in this repo (same as `/contacts`, `/demandes` — confirmed in the spec's "Hors scope"), so verification is `pnpm typecheck && pnpm lint` plus a manual dev-server check at the end of Task 9.

- [ ] **Step 1: Replace `frontend/src/app/visites/page.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Plus,
  CalendarCheck,
  CheckCircle,
  Clock,
  XCircle,
  Table2,
  CalendarDays,
  Search,
  SlidersHorizontal,
  Calendar,
  Eye,
  Pencil,
  X,
  Loader2,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import {
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  TYPE_LABEL,
  TYPE_BADGE_CLASS,
  formatVisitDateTime,
  type Visit,
  type VisitStats,
  type VisitStatus,
} from '@/lib/visits';

type View = 'CALENDRIER' | 'LISTE';

const EMPTY_STATS: VisitStats = { total: 0, confirmees: 0, enAttente: 0, annulees: 0 };

export default function VisitesPage() {
  const user = useUser();
  const { toast } = useToast();

  const [view, setView] = useState<View>('CALENDRIER');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Visit[]>([]);
  const [stats, setStats] = useState<VisitStats>(EMPTY_STATS);
  const [loadingTable, setLoadingTable] = useState(true);

  const [viewingVisit, setViewingVisit] = useState<Visit | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState<'PRESENTIEL' | 'VIRTUELLE'>('PRESENTIEL');
  const [editStatus, setEditStatus] = useState<VisitStatus>('EN_ATTENTE');
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function refetchTable(currentSearch: string) {
    setLoadingTable(true);
    try {
      const qs = new URLSearchParams({ limit: '50' });
      if (currentSearch.trim()) qs.set('search', currentSearch.trim());
      const res = await api<{ items: Visit[]; stats: VisitStats }>(`/api/visits?${qs.toString()}`);
      setItems(res.items);
      setStats(res.stats);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Impossible de charger les visites.', 'error');
    } finally {
      setLoadingTable(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    const handle = setTimeout(() => {
      refetchTable(search);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search]);

  useEffect(() => {
    setEditDate('');
    setEditTime('');
    if (!editingVisit) return;
    const d = new Date(editingVisit.scheduledAt);
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(d.toISOString().slice(11, 16));
    setEditType(editingVisit.type);
    setEditStatus(editingVisit.status);
  }, [editingVisit]);

  async function handleSaveEdit() {
    if (!editingVisit) return;
    setSaving(true);
    try {
      await api(`/api/visits/${editingVisit.id}`, {
        method: 'PATCH',
        body: {
          status: editStatus,
          type: editType,
          scheduledAt: new Date(`${editDate}T${editTime}:00`).toISOString(),
        },
      });
      toast('Visite mise à jour.', 'success');
      setEditingVisit(null);
      await refetchTable(search);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Impossible de mettre à jour la visite.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(visit: Visit) {
    if (!window.confirm('Annuler cette visite ?')) return;
    setCancelingId(visit.id);
    try {
      await api(`/api/visits/${visit.id}`, { method: 'PATCH', body: { status: 'ANNULEE' } });
      toast('Visite annulée.', 'success');
      await refetchTable(search);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Impossible d'annuler la visite.", 'error');
    } finally {
      setCancelingId(null);
    }
  }

  if (!user) return null;

  return (
    <DashboardShell active="visits" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Visites programmées
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Gérez et suivez toutes vos visites de biens immobiliers.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-gray-400"
          >
            <Download className="h-[14px] w-[14px]" aria-hidden />
            <span className="hidden lg:inline">Exporter</span>
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('visits:open-create'))}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Planifier</span>
            <span className="hidden lg:inline">Planifier une visite</span>
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: CalendarCheck,
            iconBg: 'bg-brand/10',
            iconColor: 'text-brand',
            value: stats.total,
            label: 'Visites ce mois',
          },
          {
            icon: CheckCircle,
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-700',
            value: stats.confirmees,
            label: 'Confirmées',
          },
          {
            icon: Clock,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-700',
            value: stats.enAttente,
            label: 'En attente',
          },
          {
            icon: XCircle,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            value: stats.annulees,
            label: 'Annulées',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.iconBg)}>
                <s.icon className={cn('h-[18px] w-[18px]', s.iconColor)} aria-hidden />
              </span>
            </div>
            <p className="font-sora mb-0.5 text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="text-[12.5px] font-medium text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* VIEW TABS */}
      <div className="flex w-fit items-center gap-1 rounded-2xl border border-black/[0.08] bg-white p-1.5">
        <button
          type="button"
          onClick={() => setView('LISTE')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium',
            view === 'LISTE' ? 'bg-brand font-semibold text-white' : 'text-gray-400',
          )}
        >
          <Table2 className="h-[14px] w-[14px]" aria-hidden />
          Liste
        </button>
        <button
          type="button"
          onClick={() => setView('CALENDRIER')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium',
            view === 'CALENDRIER' ? 'bg-brand font-semibold text-white' : 'text-gray-400',
          )}
        >
          <CalendarDays className="h-[14px] w-[14px]" aria-hidden />
          Calendrier
        </button>
      </div>

      {/* VISITS TABLE */}
      <div className="rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] p-5">
          <p className="font-sora text-[15px] font-semibold text-neutral-900">Toutes les visites</p>
          <div className="flex items-center gap-2.5">
            <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-1.5">
              <Search className="h-[13px] w-[13px] flex-shrink-0 text-gray-400" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full bg-transparent text-[12.5px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-gray-400"
            >
              <SlidersHorizontal className="h-[13px] w-[13px]" aria-hidden />
              Filtrer
            </button>
          </div>
        </div>

        {loadingTable ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
            <p className="text-sm text-gray-400">Chargement des visites…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <CalendarCheck className="mb-1 h-8 w-8 text-gray-300" aria-hidden />
            <p className="text-sm font-medium text-neutral-700">
              {search.trim() ? 'Aucune visite pour cette recherche' : 'Aucune visite programmée'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { label: '#', mobileHidden: true },
                    { label: 'Bien immobilier', mobileHidden: false },
                    { label: 'Client', mobileHidden: false },
                    { label: 'Date & heure', mobileHidden: false },
                    { label: 'Localisation', mobileHidden: true },
                    { label: 'Type', mobileHidden: true },
                    { label: 'Statut', mobileHidden: false },
                    { label: 'Actions', mobileHidden: false },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={cn(
                        'font-sora px-4 py-3 text-left text-[11.5px] font-semibold whitespace-nowrap text-gray-400 uppercase',
                        h.label === 'Actions' && 'text-center',
                        h.mobileHidden && 'hidden lg:table-cell',
                      )}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((v) => {
                  const status = STATUS_LABEL[v.status];
                  const statusClass = STATUS_BADGE_CLASS[v.status];
                  const type = TYPE_LABEL[v.type];
                  const typeClass = TYPE_BADGE_CLASS[v.type];
                  return (
                    <tr key={v.id} className="border-b border-black/[0.06] last:border-0">
                      <td className="hidden px-4 py-3.5 font-mono text-[11px] whitespace-nowrap text-gray-400 uppercase lg:table-cell">
                        {v.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] font-semibold whitespace-nowrap text-neutral-900">
                          {v.inquiry.listing.title}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] font-medium whitespace-nowrap text-neutral-900">
                          {v.inquiry.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-neutral-700">
                          <Calendar className="h-3 w-3 text-gray-400" aria-hidden />
                          {formatVisitDateTime(v.scheduledAt)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3.5 text-xs whitespace-nowrap text-gray-400 lg:table-cell">
                        {v.inquiry.listing.city}, {v.inquiry.listing.country}
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            typeClass,
                          )}
                        >
                          {type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            statusClass,
                          )}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingVisit(v)}
                            title="Voir"
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-gray-400 hover:text-neutral-700"
                          >
                            <Eye className="h-[13px] w-[13px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingVisit(v)}
                            title="Modifier"
                            disabled={v.status === 'ANNULEE'}
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-gray-400 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil className="h-[13px] w-[13px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(v)}
                            title="Annuler"
                            disabled={v.status === 'ANNULEE' || cancelingId === v.id}
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {cancelingId === v.id ? (
                              <Loader2 className="h-[13px] w-[13px] animate-spin" aria-hidden />
                            ) : (
                              <X className="h-[13px] w-[13px]" aria-hidden />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {viewingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-sora text-[15px] font-semibold text-neutral-900">
                Détail de la visite
              </p>
              <button type="button" onClick={() => setViewingVisit(null)} className="text-gray-400">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <p>
                <span className="text-gray-400">Bien : </span>
                <span className="font-medium text-neutral-900">
                  {viewingVisit.inquiry.listing.title}
                </span>
              </p>
              <p>
                <span className="text-gray-400">Client : </span>
                <span className="font-medium text-neutral-900">{viewingVisit.inquiry.name}</span>
              </p>
              <p>
                <span className="text-gray-400">Téléphone : </span>
                <span className="font-medium text-neutral-900">{viewingVisit.inquiry.phone}</span>
              </p>
              <p>
                <span className="text-gray-400">Date : </span>
                <span className="font-medium text-neutral-900">
                  {formatVisitDateTime(viewingVisit.scheduledAt)}
                </span>
              </p>
              <p>
                <span className="text-gray-400">Type : </span>
                <span className="font-medium text-neutral-900">{TYPE_LABEL[viewingVisit.type]}</span>
              </p>
              <p>
                <span className="text-gray-400">Statut : </span>
                <span className="font-medium text-neutral-900">
                  {STATUS_LABEL[viewingVisit.status]}
                </span>
              </p>
              {viewingVisit.notes && (
                <p>
                  <span className="text-gray-400">Notes : </span>
                  <span className="font-medium text-neutral-900">{viewingVisit.notes}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-sora text-[15px] font-semibold text-neutral-900">
                Modifier la visite
              </p>
              <button type="button" onClick={() => setEditingVisit(null)} className="text-gray-400">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[12.5px] font-medium text-gray-400">
                Date
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                />
              </label>
              <label className="text-[12.5px] font-medium text-gray-400">
                Heure
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                />
              </label>
              <label className="text-[12.5px] font-medium text-gray-400">
                Type
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'PRESENTIEL' | 'VIRTUELLE')}
                  className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                >
                  <option value="PRESENTIEL">Présentiel</option>
                  <option value="VIRTUELLE">Virtuelle</option>
                </select>
              </label>
              <label className="text-[12.5px] font-medium text-gray-400">
                Statut
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as VisitStatus)}
                  className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                >
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="CONFIRMEE">Confirmée</option>
                  <option value="ANNULEE">Annulée</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving || !editDate || !editTime}
                className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-brand/40"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
```

Note: the header's "Planifier une visite" button dispatches a `visits:open-create` `CustomEvent` rather than owning the create-modal state directly — Task 9 adds a listener for it. This keeps this task's diff self-contained (button is real, not `disabled`, even before the modal exists) and avoids a mid-task placeholder state variable with no consumer yet. The calendar view (`view === 'CALENDRIER'`) is intentionally not rendered by this task — Task 8 adds it; until then the page always shows the table regardless of `view` state (the tab buttons are real but only "Liste" has content — acceptable since Task 8 lands immediately after in the same rollout).

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass. Fix any type errors (e.g. `Visit.type`/`Visit.status` literal narrowing) before moving on.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all existing tests plus the new `visits` tests pass (this task doesn't add page tests — see task preamble).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/visites/page.tsx
git commit -m "feat(visites): wire stats bar and table to real Visit data"
```

---

### Task 8: Wire the calendar view

**Files:**
- Modify: `frontend/src/app/visites/page.tsx`

**Interfaces:**
- Consumes: `buildCalendarGrid`, `formatDateKey`, `formatVisitTime`, `formatVisitDayMonth`, `DATE_BLOCK_STYLE`, `VisitsCalendarResponse`, `AgendaVisit` from `@/lib/visits` (Task 2); `GET /api/visits/calendar` (Task 5).
- Produces: adds calendar state (`calendarYear`, `calendarMonth`, `calendarData`, `todayFilter`) and the `view === 'CALENDRIER'` branch to the same component from Task 7. Task 9 doesn't depend on anything new here.

- [ ] **Step 1: Add calendar state and the fetch effect**

In `frontend/src/app/visites/page.tsx`, extend the imports:

```tsx
import {
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  TYPE_LABEL,
  TYPE_BADGE_CLASS,
  DATE_BLOCK_STYLE,
  formatVisitDateTime,
  formatVisitTime,
  formatVisitDayMonth,
  formatDateKey,
  buildCalendarGrid,
  type Visit,
  type VisitStats,
  type VisitStatus,
  type VisitsCalendarResponse,
} from '@/lib/visits';
```

Add `ChevronLeft, ChevronRight` to the `lucide-react` import list.

Add this state right after the `loadingTable` state:

```tsx
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState<VisitsCalendarResponse | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [todayFilter, setTodayFilter] = useState<'TOUTES' | 'CONFIRMEE' | 'EN_ATTENTE'>('TOUTES');
```

Add this effect after the table-fetch effect:

```tsx
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadingCalendar(true);
    api<VisitsCalendarResponse>(`/api/visits/calendar?year=${calendarYear}&month=${calendarMonth}`)
      .then((res) => {
        if (!cancelled) setCalendarData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          toast(e instanceof ApiError ? e.message : 'Impossible de charger le calendrier.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCalendar(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, calendarYear, calendarMonth]);
```

Add these two derived values right before the `if (!user) return null;` line:

```tsx
  const eventsByDate = useMemo(() => {
    const map: Record<string, VisitsCalendarResponse['days'][number]['events']> = {};
    for (const d of calendarData?.days ?? []) map[d.date] = d.events;
    return map;
  }, [calendarData]);

  const calendarCells = useMemo(
    () => buildCalendarGrid(calendarYear, calendarMonth, eventsByDate),
    [calendarYear, calendarMonth, eventsByDate],
  );

  const todayStr = formatDateKey(new Date());

  const filteredToday = useMemo(() => {
    const rows = calendarData?.today ?? [];
    return todayFilter === 'TOUTES' ? rows : rows.filter((v) => v.status === todayFilter);
  }, [calendarData, todayFilter]);

  function goToMonth(delta: number) {
    let year = calendarYear;
    let month = calendarMonth + delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    setCalendarYear(year);
    setCalendarMonth(month);
  }

  const MONTH_LABEL = new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
```

- [ ] **Step 2: Render the calendar section**

In the JSX, insert the calendar block right after the "VIEW TABS" `<div>` and before the "VISITS TABLE" `<div>` — wrapped in `{view === 'CALENDRIER' && (...)}`:

```tsx
      {view === 'CALENDRIER' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* CALENDAR */}
          <div className="rounded-2xl bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] p-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => goToMonth(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-neutral-700"
                >
                  <ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
                </button>
                <span className="font-sora min-w-[140px] text-center text-base font-semibold text-neutral-900 capitalize">
                  {MONTH_LABEL}
                </span>
                <button
                  type="button"
                  onClick={() => goToMonth(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-neutral-700"
                >
                  <ChevronRight className="h-[15px] w-[15px]" aria-hidden />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-1.5 grid grid-cols-7">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((w) => (
                  <div
                    key={w}
                    className="py-1.5 text-center text-[11.5px] font-semibold tracking-wide text-gray-400 uppercase"
                  >
                    {w}
                  </div>
                ))}
              </div>
              {loadingCalendar ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((cell) => (
                    <div
                      key={cell.dateStr}
                      className={cn(
                        'min-h-14 rounded-lg p-1.5 lg:min-h-20 lg:p-2',
                        cell.otherMonth && 'opacity-35',
                        cell.dateStr === todayStr && 'bg-[#EEF3FF]',
                      )}
                    >
                      <div
                        className={cn(
                          'mb-1 text-[13px] font-medium text-neutral-900',
                          cell.dateStr === todayStr &&
                            'flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white',
                        )}
                      >
                        {cell.day}
                      </div>
                      {cell.events.slice(0, 2).map((e) => (
                        <div
                          key={e.id}
                          className={cn(
                            'mb-0.5 truncate rounded-sm px-1.5 py-0.5 text-[10px] font-medium lg:text-[10.5px]',
                            STATUS_BADGE_CLASS[e.status],
                          )}
                        >
                          {e.label}
                        </div>
                      ))}
                      {cell.events.length > 2 && (
                        <div className="text-[10px] text-gray-400">+{cell.events.length - 2} autre</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="flex flex-col gap-5">
            {/* Today's visits */}
            <div className="rounded-2xl bg-white">
              <div className="border-b border-black/[0.06] p-4">
                <p className="font-sora text-sm font-semibold text-neutral-900">Visites du jour</p>
              </div>
              <div className="flex items-center gap-1.5 border-b border-black/[0.06] px-4 py-3">
                {(
                  [
                    { key: 'TOUTES', label: 'Toutes' },
                    { key: 'CONFIRMEE', label: 'Confirmées' },
                    { key: 'EN_ATTENTE', label: 'En attente' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTodayFilter(f.key)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                      todayFilter === f.key ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {filteredToday.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">
                  Aucune visite pour ce filtre.
                </p>
              ) : (
                filteredToday.map((v, i) => {
                  const { day, month } = formatVisitDayMonth(v.scheduledAt);
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        'flex gap-3 p-4',
                        i < filteredToday.length - 1 && 'border-b border-black/[0.06]',
                      )}
                    >
                      <div className="flex h-[46px] w-[42px] flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[#EEF3FF]">
                        <span className="font-sora text-[17px] leading-none font-semibold text-brand">
                          {day}
                        </span>
                        <span className="text-[9.5px] font-semibold tracking-wide text-brand uppercase">
                          {month}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 truncate text-[13px] font-semibold text-neutral-900">
                          {v.listingTitle}
                        </p>
                        <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-gray-400">
                          <Clock className="h-[11px] w-[11px]" aria-hidden />
                          {formatVisitTime(v.scheduledAt)} · {v.clientName}
                        </p>
                        <span
                          className={cn(
                            'mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                            STATUS_BADGE_CLASS[v.status],
                          )}
                        >
                          {STATUS_LABEL[v.status]}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Upcoming */}
            <div className="rounded-2xl bg-white">
              <div className="border-b border-black/[0.06] p-4">
                <p className="font-sora text-sm font-semibold text-neutral-900">Prochaines visites</p>
              </div>
              {(calendarData?.upcoming ?? []).length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">
                  Aucune visite à venir.
                </p>
              ) : (
                (calendarData?.upcoming ?? []).map((v, i, arr) => {
                  const { day, month } = formatVisitDayMonth(v.scheduledAt);
                  const block = DATE_BLOCK_STYLE[v.status];
                  return (
                    <div
                      key={v.id}
                      className={cn('flex gap-3 p-4', i < arr.length - 1 && 'border-b border-black/[0.06]')}
                    >
                      <div
                        className={cn(
                          'flex h-[46px] w-[42px] flex-shrink-0 flex-col items-center justify-center rounded-lg',
                          block.bg,
                        )}
                      >
                        <span className={cn('font-sora text-[17px] leading-none font-semibold', block.text)}>
                          {day}
                        </span>
                        <span className={cn('text-[9.5px] font-semibold tracking-wide uppercase', block.text)}>
                          {month}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 truncate text-[13px] font-semibold text-neutral-900">
                          {v.listingTitle}
                        </p>
                        <p className="flex items-center gap-1.5 text-[11.5px] text-gray-400">
                          <Clock className="h-[11px] w-[11px]" aria-hidden />
                          {formatVisitTime(v.scheduledAt)} · {v.clientName}
                        </p>
                        <span
                          className={cn(
                            'mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                            STATUS_BADGE_CLASS[v.status],
                          )}
                        >
                          {STATUS_LABEL[v.status]}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: all pass (no page tests added, per Task 7's note).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/visites/page.tsx
git commit -m "feat(visites): wire the calendar view to real Visit data"
```

---

### Task 9: "Planifier une visite" creation modal

**Files:**
- Modify: `frontend/src/app/visites/page.tsx`

**Interfaces:**
- Consumes: `EligibleInquiry` from `@/lib/visits`; `GET /api/listings/inquiries?eligibleForVisit=true` (Task 6); `POST /api/visits` (Task 3).
- Produces: completes the page — no further tasks depend on this one.

- [ ] **Step 1: Add create-modal state and the event listener**

Add `type EligibleInquiry` to the `@/lib/visits` import list.

Add this state after the `cancelingId` state:

```tsx
  const [createOpen, setCreateOpen] = useState(false);
  const [eligibleInquiries, setEligibleInquiries] = useState<EligibleInquiry[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [createInquiryId, setCreateInquiryId] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createTime, setCreateTime] = useState('');
  const [createType, setCreateType] = useState<'PRESENTIEL' | 'VIRTUELLE'>('PRESENTIEL');
  const [creating, setCreating] = useState(false);
```

Add this effect (replaces the Task 7 placeholder — the header button now dispatches `visits:open-create`, this listens for it):

```tsx
  useEffect(() => {
    function open() {
      setCreateOpen(true);
      setCreateInquiryId('');
      setCreateDate('');
      setCreateTime('');
      setCreateType('PRESENTIEL');
      setLoadingEligible(true);
      api<{ items: EligibleInquiry[] }>('/api/listings/inquiries?eligibleForVisit=true&limit=50')
        .then((res) => setEligibleInquiries(res.items))
        .catch((e) => {
          toast(
            e instanceof ApiError ? e.message : 'Impossible de charger les contacts disponibles.',
            'error',
          );
        })
        .finally(() => setLoadingEligible(false));
    }
    window.addEventListener('visits:open-create', open);
    return () => window.removeEventListener('visits:open-create', open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!createInquiryId || !createDate || !createTime) return;
    setCreating(true);
    try {
      await api('/api/visits', {
        method: 'POST',
        body: {
          inquiryId: createInquiryId,
          scheduledAt: new Date(`${createDate}T${createTime}:00`).toISOString(),
          type: createType,
        },
      });
      toast('Visite planifiée.', 'success');
      setCreateOpen(false);
      await refetchTable(search);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Impossible de planifier la visite.', 'error');
    } finally {
      setCreating(false);
    }
  }
```

- [ ] **Step 2: Render the create modal**

Add this block right after the "EDIT MODAL" block, still inside `<DashboardShell>`:

```tsx
      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-sora text-[15px] font-semibold text-neutral-900">
                Planifier une visite
              </p>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-gray-400">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {loadingEligible ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
              </div>
            ) : eligibleInquiries.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-gray-400">
                Aucun contact disponible à convertir en visite pour l&apos;instant.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="text-[12.5px] font-medium text-gray-400">
                  Contact
                  <select
                    value={createInquiryId}
                    onChange={(e) => setCreateInquiryId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                  >
                    <option value="">Sélectionner un contact…</option>
                    {eligibleInquiries.map((inq) => (
                      <option key={inq.id} value={inq.id}>
                        {inq.name} — {inq.listing.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[12.5px] font-medium text-gray-400">
                  Date
                  <input
                    type="date"
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                  />
                </label>
                <label className="text-[12.5px] font-medium text-gray-400">
                  Heure
                  <input
                    type="time"
                    value={createTime}
                    onChange={(e) => setCreateTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                  />
                </label>
                <label className="text-[12.5px] font-medium text-gray-400">
                  Type
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value as 'PRESENTIEL' | 'VIRTUELLE')}
                    className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                  >
                    <option value="PRESENTIEL">Présentiel</option>
                    <option value="VIRTUELLE">Virtuelle</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !createInquiryId || !createDate || !createTime}
                  className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-brand/40"
                >
                  {creating ? 'Planification…' : 'Planifier'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
```

Also update the Task 9 create-success flow to refresh the calendar too, since a new visit may land on the currently displayed month. In `handleCreate`'s try block, after `await refetchTable(search);`, add:

```tsx
      setCalendarData(null);
      setCalendarYear((y) => y); // no-op state touch not needed — see below
```

Replace that with a direct refetch instead of the no-op: add a small `refetchCalendar` helper mirroring the Task 8 effect body, and call both on success. Concretely, in Task 8's calendar effect, factor the body into a named function so Task 9 can reuse it:

```tsx
  async function refetchCalendar() {
    setLoadingCalendar(true);
    try {
      const res = await api<VisitsCalendarResponse>(
        `/api/visits/calendar?year=${calendarYear}&month=${calendarMonth}`,
      );
      setCalendarData(res);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Impossible de charger le calendrier.', 'error');
    } finally {
      setLoadingCalendar(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    refetchCalendar().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, calendarYear, calendarMonth]);
```

(This replaces the inline-`.then()` effect body written in Task 8 Step 1 — if executing Task 8 and Task 9 in the same sitting, write `refetchCalendar` directly in Task 8 instead of the inline version to avoid the churn.)

Then in `handleCreate`'s try block:

```tsx
      toast('Visite planifiée.', 'success');
      setCreateOpen(false);
      await Promise.all([refetchTable(search), refetchCalendar()]);
```

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: Manual verification in the browser**

Run: `pnpm dev` (from repo root), then open `http://localhost:3000/visites` while logged in as a user with at least one existing `ListingInquiry` on one of their listings (seed one via Prisma Studio or the "Contacts reçus" page if none exist).

Checklist:
- Stats bar shows real counts (0s are fine on a fresh account).
- "Toutes les visites" table is empty until a visit is created, then shows the new row.
- Click "Planifier une visite" → pick the seeded contact, a date, a time → submit → row appears in the table and toast confirms.
- Switch to "Calendrier" → the scheduled visit's day shows the event chip; today/upcoming panels reflect it if applicable.
- Click the pencil icon → change the time → save → table row and calendar update.
- Click the X icon → confirm → status becomes "Annulée", pencil/X disable on that row.
- Click the eye icon → detail modal shows the right data.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/visites/page.tsx
git commit -m "feat(visites): add the Planifier une visite creation flow"
```

---

## Self-Review Notes

- **Spec coverage:** `Visit` model (Task 1) · GET/POST /api/visits (Task 3) · GET /api/visits/calendar (Task 5) · PATCH /api/visits/[id] (Task 4) · `?eligibleForVisit=true` extension (Task 6) · frontend wiring for table/stats/calendar/create/edit/cancel/view (Tasks 7-9) · Vitest coverage matching the `listings/inquiries` convention (Tasks 3-6) · pure-function test for the calendar grid (Task 2). "Hors scope" items (Exporter, Filtrer, Semaine toggle) are explicitly left `disabled` in Task 7/kept as-is.
- **Type consistency:** `Visit`, `VisitStats`, `VisitStatus`, `VisitType`, `EligibleInquiry`, `VisitsCalendarResponse`, `AgendaVisit`, `CalendarCell` are defined once in Task 2 and imported (never redefined) by every later task. `VISIT_SELECT`/`VISIT_STATUSES`/`VISIT_TYPES` are defined once in Task 3 and imported by Task 4.
- **Task 9 churn note:** Task 9 Step 2 asks to factor Task 8's inline calendar-fetch effect into a named `refetchCalendar` function. If executing sequentially task-by-task, this shows up as a small refactor within Task 9's diff — expected and called out explicitly, not a hidden inconsistency.
