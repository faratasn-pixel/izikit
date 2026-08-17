# Alert Matches Real Data + View Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded mock "Correspondances récentes" section and fake stats on `/alertes` with real data from the alert-matching engine, add a "viewed" tracker on `AlertMatch` so "Demandes consultées" is a real number, and wire the same real "viewed" count into `/alertes/[id]`.

**Architecture:** Add a nullable `AlertMatch.viewedAt` timestamp (migration, no backfill). Two new/changed API surfaces: `PATCH /api/alerts/[id]/matches/[matchId]` marks a match viewed (idempotent), and `GET /api/alerts/matches/recent` aggregates the current user's most recent matches across all their alerts plus two counts (`monthlyCount`, `viewedCount`). Both `/alertes` (list) and `/alertes/[id]` (detail) consume these instead of hardcoded/mock values; a shared `markMatchViewed` fire-and-forget helper fires on the "Voir la demande" click.

**Tech Stack:** Next.js 16 App Router, Prisma 5 (PostgreSQL/Neon), Zod, Vitest, vitest-mock-extended, Tailwind.

**Spec:** [docs/superpowers/specs/2026-08-17-alert-matches-real-data-design.md](../specs/2026-08-17-alert-matches-real-data-design.md)

## Global Constraints

- Every Route Handler already has `export const runtime = 'nodejs'` — do not remove it.
- `pnpm format && pnpm lint && pnpm typecheck && pnpm test` must all pass before any commit that isn't itself a WIP checkpoint inside a task.
- `viewedAt` is set-once (idempotent) — a second `PATCH` with `{ viewed: true }` never overwrites an existing `viewedAt`.
- "Correspondance" = a matched `PropertyRequest` (demande), never a `Listing` (annonce) — do not introduce Listing-matching in this plan.
- "Correspondances ce mois" uses the calendar month (1st of current month, UTC, through now), not a rolling 30-day window.

---

### Task 1: Prisma schema — `AlertMatch.viewedAt`

**Files:**
- Modify: `frontend/prisma/schema.prisma` (the `model AlertMatch` block, ~line 586)
- Create: `frontend/prisma/migrations/<timestamp>_alert_match_viewed_at/migration.sql`

**Interfaces:**
- Produces: `AlertMatch.viewedAt: DateTime | null` — every later task reads/writes this field by this exact name.

- [ ] **Step 1: Edit the schema field**

In `frontend/prisma/schema.prisma`, inside `model AlertMatch`:

```prisma
model AlertMatch {
  id                String          @id @default(cuid())
  alertId           String
  alert             Alert           @relation(fields: [alertId], references: [id], onDelete: Cascade)
  propertyRequestId String
  propertyRequest   PropertyRequest @relation(fields: [propertyRequestId], references: [id], onDelete: Cascade)

  createdAt DateTime  @default(now())
  viewedAt  DateTime?

  @@unique([alertId, propertyRequestId])
  @@index([alertId, createdAt])
}
```

(Only the `createdAt`/`viewedAt` two-line block changes — add `viewedAt DateTime?` under `createdAt`.)

- [ ] **Step 2: Create the migration directory and SQL by hand**

`prisma migrate dev` requires an interactive TTY this environment doesn't have, so create the migration directly (same approach used for the `alert_multi_cities` migration earlier on this branch).

Get a timestamp: `date -u +%Y%m%d%H%M%S`. Create
`frontend/prisma/migrations/<timestamp>_alert_match_viewed_at/migration.sql`:

```sql
-- AlterTable: nullable, additive-only, no backfill needed (existing rows
-- become "never viewed" by default, which is correct).
ALTER TABLE "AlertMatch" ADD COLUMN "viewedAt" TIMESTAMP(3);
```

- [ ] **Step 3: Apply the migration**

Run:
```bash
pnpm --filter frontend exec prisma migrate deploy
```

Expected: `<timestamp>_alert_match_viewed_at` applied cleanly.

- [ ] **Step 4: Regenerate the Prisma client**

Run:
```bash
pnpm --filter frontend exec prisma generate
```

If this fails with `EPERM ... query_engine-windows.dll.node`, a running `pnpm dev` process is holding the file lock — stop it first, then retry.

- [ ] **Step 5: Verify migration status**

Run: `pnpm db:migrate:status`
Expected: no pending migrations.

- [ ] **Step 6: Commit**

```bash
git add frontend/prisma/schema.prisma frontend/prisma/migrations/
git commit -m "feat(db): add AlertMatch.viewedAt for view tracking"
```

---

### Task 2: API — `PATCH /api/alerts/[id]/matches/[matchId]`

**Files:**
- Create: `frontend/src/app/api/alerts/[id]/matches/[matchId]/route.ts`
- Create: `frontend/src/app/api/alerts/[id]/matches/[matchId]/route.test.ts`

**Interfaces:**
- Consumes: `AlertMatch.viewedAt` from Task 1.
- Produces: `PATCH /api/alerts/[id]/matches/[matchId]` — body `{ viewed: true }` → `200 { match: { id: string, viewedAt: string } }`; `404 { error: 'MATCH_NOT_FOUND' }` when the match doesn't exist or doesn't belong to a alert owned by the caller. Task 5/6's `markMatchViewed` helper calls this exact URL shape.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/api/alerts/[id]/matches/[matchId]/route.test.ts`:

```typescript
// ALERTS-06 — PATCH /api/alerts/[id]/matches/[matchId] tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

mockNextCookies();

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

import { requireAuth } from '@/lib/server/middleware';
import { PATCH } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makeMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    alertId: 'alert-1',
    propertyRequestId: 'req-1',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    viewedAt: null,
    alert: { userId: 'user-1' },
    ...overrides,
  };
}

function makePatch(
  alertId: string,
  matchId: string,
  body: unknown,
): { req: NextRequest; ctx: { params: Promise<{ id: string; matchId: string }> } } {
  const req = new NextRequest(`http://test/api/alerts/${alertId}/matches/${matchId}`, {
    method: 'PATCH',
    headers: { 'x-csrf-token': 'test-csrf', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { req, ctx: { params: Promise.resolve({ id: alertId, matchId }) } };
}

beforeEach(() => {
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.alertMatch.findUnique.mockResolvedValue(makeMatch() as never);
  prismaMock.alertMatch.update.mockResolvedValue(
    makeMatch({ viewedAt: new Date('2026-08-17T12:00:00Z') }) as never,
  );
});

describe('PATCH /api/alerts/[id]/matches/[matchId]', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const { req, ctx } = makePatch('alert-1', 'match-1', { viewed: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
  });

  it('invalid body returns 400 VALIDATION_FAILED', async () => {
    const { req, ctx } = makePatch('alert-1', 'match-1', { viewed: false });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('missing match returns 404 MATCH_NOT_FOUND', async () => {
    prismaMock.alertMatch.findUnique.mockResolvedValueOnce(null);
    const { req, ctx } = makePatch('alert-1', 'match-1', { viewed: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('MATCH_NOT_FOUND');
  });

  it('match belonging to another user returns 404', async () => {
    prismaMock.alertMatch.findUnique.mockResolvedValueOnce(
      makeMatch({ alert: { userId: 'someone-else' } }) as never,
    );
    const { req, ctx } = makePatch('alert-1', 'match-1', { viewed: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it('match under a different alertId in the URL returns 404', async () => {
    prismaMock.alertMatch.findUnique.mockResolvedValueOnce(
      makeMatch({ alertId: 'other-alert' }) as never,
    );
    const { req, ctx } = makePatch('alert-1', 'match-1', { viewed: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it('marks an unviewed match as viewed', async () => {
    const { req, ctx } = makePatch('alert-1', 'match-1', { viewed: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.match.viewedAt).toBe('2026-08-17T12:00:00.000Z');
    expect(prismaMock.alertMatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'match-1' } }),
    );
  });

  it('does not re-update an already-viewed match (idempotent)', async () => {
    const already = new Date('2026-08-10T09:00:00Z');
    prismaMock.alertMatch.findUnique.mockResolvedValueOnce(
      makeMatch({ viewedAt: already }) as never,
    );
    const { req, ctx } = makePatch('alert-1', 'match-1', { viewed: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.match.viewedAt).toBe('2026-08-10T09:00:00.000Z');
    expect(prismaMock.alertMatch.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run "src/app/api/alerts/[id]/matches/[matchId]/route.test.ts"`
Expected: FAIL — `./route` does not exist yet.

- [ ] **Step 3: Implement the route**

Create `frontend/src/app/api/alerts/[id]/matches/[matchId]/route.ts`:

```typescript
// ALERTS-06 — PATCH /api/alerts/[id]/matches/[matchId]
//
// Marks a single AlertMatch as viewed by the owning user (fired when they
// click "Voir la demande" from /alertes or /alertes/[id]). Idempotent —
// never overwrites an existing viewedAt, so it always reflects the FIRST
// time the user opened that match's underlying PropertyRequest.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const PatchBody = z.object({
  viewed: z.literal(true),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; matchId: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id, matchId } = await ctx.params;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const match = await prisma.alertMatch.findUnique({
      where: { id: matchId },
      select: { id: true, alertId: true, viewedAt: true, alert: { select: { userId: true } } },
    });
    if (!match || match.alertId !== id || match.alert.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'MATCH_NOT_FOUND', message: 'Match not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const viewedAt =
      match.viewedAt ??
      (
        await prisma.alertMatch.update({
          where: { id: matchId },
          data: { viewedAt: new Date() },
          select: { viewedAt: true },
        })
      ).viewedAt;

    return NextResponse.json(
      { match: { id: match.id, viewedAt } },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/api/alerts/[id]/matches/[matchId]/route.test.ts"`
Expected: PASS, all 7 cases green.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/api/alerts/[id]/matches/[matchId]/"
git commit -m "feat(api): mark an alert match as viewed (idempotent)"
```

---

### Task 3: API — `GET /api/alerts/matches/recent`

**Files:**
- Create: `frontend/src/app/api/alerts/matches/recent/route.ts`
- Create: `frontend/src/app/api/alerts/matches/recent/route.test.ts`

**Interfaces:**
- Consumes: `AlertMatch.viewedAt` from Task 1.
- Produces: `GET /api/alerts/matches/recent?limit=N` → `200 { items: RecentMatchDto[], monthlyCount: number, viewedCount: number }` where `RecentMatchDto = { id, alertId, alertName, createdAt, viewedAt, propertyRequest: { id, transactionType, propertyType, country, city, budgetMin, budgetMax, clientName, createdAt } }`. Task 6's `/alertes` list page consumes this exact shape.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/api/alerts/matches/recent/route.test.ts`:

```typescript
// ALERTS-07 — GET /api/alerts/matches/recent tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

mockNextCookies();

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from '@/lib/server/middleware';
import { GET } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    alertId: 'alert-1',
    alert: { name: 'Villas Cotonou' },
    createdAt: new Date('2026-08-15T00:00:00Z'),
    viewedAt: null,
    propertyRequest: {
      id: 'req-1',
      transactionType: 'VENTE',
      propertyType: 'VILLA',
      country: 'Bénin',
      city: 'Cotonou',
      budgetMin: null,
      budgetMax: null,
      clientName: 'Awa',
      createdAt: new Date('2026-08-15T00:00:00Z'),
    },
    ...overrides,
  };
}

function makeGet(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/alerts/matches/recent${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.alertMatch.findMany.mockResolvedValue([makeRow()] as never);
  prismaMock.alertMatch.count.mockResolvedValue(0 as never);
});

describe('GET /api/alerts/matches/recent', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it('defaults to limit=5 and maps rows to the flat DTO shape', async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(prismaMock.alertMatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
    expect(body.items).toEqual([
      expect.objectContaining({
        id: 'match-1',
        alertId: 'alert-1',
        alertName: 'Villas Cotonou',
        propertyRequest: expect.objectContaining({ clientName: 'Awa' }),
      }),
    ]);
  });

  it('clamps limit to [1, 20]', async () => {
    await GET(makeGet('?limit=999'));
    expect(prismaMock.alertMatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );

    await GET(makeGet('?limit=0'));
    expect(prismaMock.alertMatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 }),
    );
  });

  it('scopes every query to the authenticated user', async () => {
    await GET(makeGet());
    expect(prismaMock.alertMatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ alert: { userId: 'user-1' } }),
      }),
    );
  });

  it('returns monthlyCount and viewedCount from the count queries', async () => {
    prismaMock.alertMatch.count.mockResolvedValueOnce(3).mockResolvedValueOnce(7);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.monthlyCount).toBe(3);
    expect(body.viewedCount).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run "src/app/api/alerts/matches/recent/route.test.ts"`
Expected: FAIL — `./route` does not exist yet.

- [ ] **Step 3: Implement the route**

Create `frontend/src/app/api/alerts/matches/recent/route.ts`:

```typescript
// ALERTS-07 — GET /api/alerts/matches/recent
//
// Aggregates the current user's most recent AlertMatch rows across ALL of
// their alerts (not scoped to one alert — that's GET /api/alerts/[id]).
// Powers the "Correspondances récentes" section + the "Correspondances ce
// mois" / "Demandes consultées" stats on /alertes.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

function clampLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(20, Math.max(1, parsed));
}

function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const MATCH_SELECT = {
  id: true,
  alertId: true,
  alert: { select: { name: true } },
  createdAt: true,
  viewedAt: true,
  propertyRequest: {
    select: {
      id: true,
      transactionType: true,
      propertyType: true,
      country: true,
      city: true,
      budgetMin: true,
      budgetMax: true,
      clientName: true,
      createdAt: true,
    },
  },
} as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const limit = clampLimit(req.nextUrl.searchParams.get('limit'));
    const userScope = { alert: { userId: auth.user.sub } };

    const [rows, monthlyCount, viewedCount] = await Promise.all([
      prisma.alertMatch.findMany({
        where: userScope,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        select: MATCH_SELECT,
      }),
      prisma.alertMatch.count({
        where: { ...userScope, createdAt: { gte: startOfCurrentMonthUtc() } },
      }),
      prisma.alertMatch.count({
        where: { ...userScope, viewedAt: { not: null } },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      alertId: r.alertId,
      alertName: r.alert.name,
      createdAt: r.createdAt,
      viewedAt: r.viewedAt,
      propertyRequest: r.propertyRequest,
    }));

    return NextResponse.json(
      { items, monthlyCount, viewedCount },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/api/alerts/matches/recent/route.test.ts"`
Expected: PASS, all 5 cases green.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors from either new route file.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/api/alerts/matches/
git commit -m "feat(api): aggregate recent alert matches across all of a user's alerts"
```

---

### Task 4: Frontend types — `frontend/src/lib/alerts.ts`

**Files:**
- Modify: `frontend/src/lib/alerts.ts`

**Interfaces:**
- Consumes: `GET /api/alerts/[id]` (`AlertMatchItem` now includes `viewedAt`) and `GET /api/alerts/matches/recent` (new `RecentAlertMatch`) response shapes from Tasks 2-3.
- Produces: `AlertMatchItem.viewedAt: string | null`, `RecentAlertMatch` type, `isMatchToday(iso: string): boolean` helper — Tasks 5 and 6 both import `isMatchToday` from here instead of each defining their own local copy (deduplicates the `isToday` function that currently only lives in `/alertes/[id]/page.tsx`).

- [ ] **Step 1: Update types and add the shared helper**

In `frontend/src/lib/alerts.ts`, replace `AlertMatchItem` (lines 43-47):

```typescript
export interface AlertMatchItem {
  id: string;
  createdAt: string;
  viewedAt: string | null;
  propertyRequest: AlertMatchRequest;
}

export interface RecentAlertMatch extends AlertMatchItem {
  alertId: string;
  alertName: string;
}
```

Add near `formatDate` (after it, end of file):

```typescript
export function isMatchToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: errors will surface in `/alertes/[id]/page.tsx` (its local `isToday` is now redundant but harmless — Task 5 removes it) — that's expected at this checkpoint.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/alerts.ts
git commit -m "feat(alerts): add viewedAt to AlertMatchItem, RecentAlertMatch type, isMatchToday helper"
```

---

### Task 5: UI `/alertes/[id]` — real "Demandes consultées" stat + view tracking

**Files:**
- Modify: `frontend/src/app/alertes/[id]/page.tsx`

**Interfaces:**
- Consumes: `isMatchToday` from Task 4; `PATCH /api/alerts/[id]/matches/[matchId]` from Task 2.
- Produces: `markMatchViewed(alertId: string, matchId: string): void` (fire-and-forget, not awaited by callers) — Task 6 defines its own copy inline in `/alertes/page.tsx` (small enough not to warrant a shared module per the spec; each page owns its click handler).

- [ ] **Step 1: Replace the local `isToday` with the shared helper**

In `frontend/src/app/alertes/[id]/page.tsx`, remove the local function (lines 55-63):

```typescript
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
```

Update the import from `@/lib/alerts` to include `isMatchToday`:

```typescript
import {
  COUNTRY_FLAG,
  FREQUENCY_LABEL,
  formatBudget,
  formatDate,
  isMatchToday,
  type AlertDetail,
  type AlertMatchItem,
  type Frequency,
} from '@/lib/alerts';
```

Replace both call sites of `isToday(` with `isMatchToday(` (line ~156 in the `stats.newToday` computation, and line ~504 in the match row `isToday(m.createdAt)`).

- [ ] **Step 2: Wire the real "viewed" stat**

Replace the `stats` object inside the `apiAlert` branch of `display` (around line 155-160):

```typescript
          stats: {
            newToday: apiAlert.matches.filter((m) => isMatchToday(m.createdAt)).length,
            totalMatches: apiAlert.matches.length,
            viewed: apiAlert.matches.filter((m) => m.viewedAt !== null).length,
            saved: 0,
          },
```

- [ ] **Step 3: Rename the mini-stat label**

Replace `label: 'Annonces consultées',` (around line 366) with:

```typescript
            label: 'Demandes consultées',
```

- [ ] **Step 4: Add the view-tracking helper and wire it to the "Voir la demande" link**

Add near the top of the component body (after the `handleDelete` function, before `const shownMockMatches = ...`):

```typescript
  function markMatchViewed(matchId: string) {
    if (!alert!.isReal) return;
    void api(`/api/alerts/${id}/matches/${matchId}`, {
      method: 'PATCH',
      body: { viewed: true },
    }).catch(() => {
      // best-effort — never blocks navigation to the request detail page
    });
  }
```

Update the "Voir la demande" `<Link>` (around lines 520-526) to fire the tracker on click:

```tsx
                    <Link
                      href={`/demandes/${r.id}`}
                      title="Voir la demande"
                      onClick={() => markMatchViewed(m.id)}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-neutral-700"
                    >
                      <Eye className="h-[13px] w-[13px]" aria-hidden />
                    </Link>
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors in `frontend/src/app/alertes/[id]/page.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/alertes/[id]/page.tsx
git commit -m "feat(alerts): wire real viewed-match count and mark-as-viewed on the alert detail page"
```

---

### Task 6: UI `/alertes` (list) — real recent matches + real stats

**Files:**
- Modify: `frontend/src/app/alertes/page.tsx`

**Interfaces:**
- Consumes: `RecentAlertMatch`, `isMatchToday` from Task 4; `GET /api/alerts/matches/recent` from Task 3; `PATCH /api/alerts/[id]/matches/[matchId]` from Task 2.

- [ ] **Step 1: Remove the mock data and its import**

Delete the `MOCK_MATCHES` array (lines 53-124) and the `RecentMatch` interface (lines 39-51). Remove the now-unused import `TRANSACTION_BADGE, type Transaction` from `@/lib/alerts-data` if `TRANSACTION_BADGE` is still used elsewhere in this file — check first: it's still used to render each match's transaction badge, so keep `TRANSACTION_BADGE` but the `type Transaction` import may become unused if nothing else references it; keep it only if still referenced after this task's edits (the new match rows use `AlertMatchRequest.transactionType: string` from the API, not the mock `Transaction` union — TRANSACTION_BADGE is keyed by that same string union so lookups still need `as Transaction` casts, e.g. `TRANSACTION_BADGE[item.propertyRequest.transactionType as Transaction]`).

- [ ] **Step 2: Add the recent-matches fetch**

Update imports to add `MapPin, FileSearch` (replacing `Maximize2` if no longer used — check: `Maximize2` was only used for the mock `m.size` field, which real requests don't have, so remove it) and pull in the new types/helper:

```typescript
import {
  COUNTRY_FLAG,
  FREQUENCY_LABEL,
  formatBudget,
  formatDate,
  isMatchToday,
  type AlertListItem,
  type Frequency,
  type RecentAlertMatch,
} from '@/lib/alerts';
```

Add a second piece of state and fetch alongside the existing `items`/`counts` effect:

```typescript
  const [recentItems, setRecentItems] = useState<RecentAlertMatch[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<{ items: RecentAlertMatch[]; monthlyCount: number; viewedCount: number }>(
      '/api/alerts/matches/recent?limit=5',
    )
      .then((res) => {
        if (cancelled) return;
        setRecentItems(res.items);
        setMonthlyCount(res.monthlyCount);
        setViewedCount(res.viewedCount);
      })
      .catch(() => {
        // best-effort — the rest of the page still works without this section
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function markMatchViewed(alertId: string, matchId: string) {
    void api(`/api/alerts/${alertId}/matches/${matchId}`, {
      method: 'PATCH',
      body: { viewed: true },
    }).catch(() => {
      // best-effort — never blocks navigation to the request detail page
    });
  }
```

- [ ] **Step 3: Replace the hardcoded stat constants**

Replace (lines 162-163):

```typescript
  const monthlyMatches = 14;
  const viewedListings = 38;
```

with direct use of `monthlyCount` / `viewedCount` state — delete these two lines entirely and update the two stat-card definitions further down (in the `[...].map((s) => ...)` array) to reference `monthlyCount` and `viewedCount` instead of `monthlyMatches` / `viewedListings`. Also rename the label:

```typescript
          {
            label: 'Correspondances ce mois',
            value: monthlyCount,
            dot: '#F59E0B',
            sub: (
              <span className="flex items-center gap-1 text-brand">
                <Sparkles className="h-3 w-3" aria-hidden />
                Nouvelles
              </span>
            ),
          },
          {
            label: 'Demandes consultées',
            value: viewedCount,
            dot: '#10B981',
            sub: (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden />
                Total
              </span>
            ),
          },
```

(The old static `+5 ce mois` sub-label is replaced with `Total` since there's no real trend data — matches the "—" pattern already used for "Alertes désactivées" in this same array.)

- [ ] **Step 4: Replace the "Correspondances récentes" header count**

Replace (lines 413-416):

```typescript
            <span className="text-[12.5px] text-gray-400">
              {monthlyMatches} ce mois · {MOCK_MATCHES.filter((m) => m.isNew).length} nouvelles
              aujourd&apos;hui
            </span>
```

with:

```typescript
            <span className="text-[12.5px] text-gray-400">
              {monthlyCount} ce mois · {recentItems.filter((m) => isMatchToday(m.createdAt)).length}{' '}
              nouvelles aujourd&apos;hui
            </span>
```

- [ ] **Step 5: Replace the match row rendering**

Replace the `{MOCK_MATCHES.map((m, i) => ( ... ))}` block (lines 440-516) with a real-data version:

```tsx
          {recentItems.map((m, i) => {
            const r = m.propertyRequest;
            const transactionLabel = TRANSACTION_TYPE_LABEL[r.transactionType] ?? r.transactionType;
            const propertyLabel = PROPERTY_TYPE_LABEL[r.propertyType] ?? r.propertyType;
            const isNew = isMatchToday(m.createdAt);
            return (
              <div
                key={m.id}
                className={cn(
                  'flex flex-wrap items-center gap-3.5 border-t border-black/[0.06] px-5 py-3.5 lg:flex-nowrap',
                  i % 2 === 1 && 'bg-[#FAFBFD]',
                )}
              >
                <div className="flex h-12 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <FileSearch className="h-5 w-5 text-brand" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-neutral-900">
                    Demande de {r.clientName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <MapPin className="h-2.5 w-2.5" aria-hidden />
                      {r.city}
                    </span>
                    <span className="whitespace-nowrap">{propertyLabel}</span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Clock className="h-2.5 w-2.5" aria-hidden />
                      {formatDate(m.createdAt)}
                    </span>
                    {isNew && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-brand">
                        Nouvelle
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                  <span className="font-sora text-sm font-semibold whitespace-nowrap text-neutral-900">
                    {formatBudget(r.budgetMin, r.budgetMax)}
                  </span>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-brand">
                    {transactionLabel}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <Link
                    href={`/demandes/${r.id}`}
                    title="Voir la demande"
                    onClick={() => markMatchViewed(m.alertId, m.id)}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-neutral-700"
                  >
                    <Eye className="h-[13px] w-[13px]" aria-hidden />
                  </Link>
                </div>
              </div>
            );
          })}

          {recentItems.length === 0 && (
            <div className="px-5 py-10 text-center text-xs text-gray-400">
              Aucune correspondance pour le moment.
            </div>
          )}
```

Remove the now-unused `TRANSACTION_BADGE` usage/import and the disabled `Bookmark`/`MoreHorizontal` buttons from the old row markup (they were mock-only actions with no real counterpart — dropping them rather than leaving disabled buttons with no function). Remove `Bookmark` and `MoreHorizontal` from the lucide-react import if no longer referenced elsewhere in the file (double check — `Bookmark` is not used elsewhere in this file; `MoreHorizontal` is not used elsewhere either).

- [ ] **Step 6: Import `PROPERTY_TYPE_LABEL` and `TRANSACTION_TYPE_LABEL`, `Clock`**

These are used by the new row markup — `PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL` are already imported from `@/lib/listings` at the top of the file (confirm; they are, for the alert-card criteria rendering). Add `Clock` to the `lucide-react` import if not already present (it is not currently imported in this file), and add `MapPin` and `FileSearch` as noted in Step 2.

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: no errors in `frontend/src/app/alertes/page.tsx`. Fix any leftover unused-import errors surfaced by ESLint in the next step.

- [ ] **Step 8: Lint**

Run: `pnpm lint`
Expected: no unused-import or unused-variable warnings from this file.

- [ ] **Step 9: Manual verification in the browser**

Run: `pnpm dev`, navigate to `http://localhost:3000/alertes`. Verify:
- "Correspondances ce mois" and "Demandes consultées" show real numbers (not 14/38).
- "Correspondances récentes" lists real demandes (client name, city, budget) instead of the 5 mock listings with stock photos.
- Clicking "Voir" (Eye icon) on a recent match navigates to `/demandes/[id]` and, on revisiting `/alertes`, "Demandes consultées" has incremented by one (only on the FIRST click for a given match — clicking the same one again should not increment further).
- Same check on `/alertes/[id]`: "Demandes consultées" mini-stat matches reality.

- [ ] **Step 10: Full verification suite**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass (aside from any already-known, unrelated pre-existing failure outside this feature's files — confirm any failure is NOT in `alerts`-related files before treating it as pre-existing).

- [ ] **Step 11: Commit**

```bash
git add frontend/src/app/alertes/page.tsx
git commit -m "feat(alerts): replace mock recent-matches section with real data on the alert list page"
```
