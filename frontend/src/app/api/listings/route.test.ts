// LISTINGS-01 — GET /api/listings tests.
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
  return new NextRequest(`http://test/api/listings${qs}`, { method: 'GET' });
}

function makePost(): NextRequest {
  return new NextRequest('http://test/api/listings', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-csrf' },
  });
}

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    title: 'Villa moderne avec piscine',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    propertyType: 'VILLA',
    transactionType: 'SALE',
    price: 185_000_000,
    currency: 'XOF',
    status: 'VERIFIED',
    createdAt: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.listing.count.mockResolvedValue(0 as never);
});

describe('GET /api/listings', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect(prismaMock.listing.findMany).not.toHaveBeenCalled();
  });

  it('scopes the query to the authenticated user (userId, not email)', async () => {
    prismaMock.listing.findMany.mockResolvedValue([] as never);
    await GET(makeGet());
    const args = prismaMock.listing.findMany.mock.calls[0]?.[0];
    expect(args?.where?.userId).toBe('user-1');
    expect(args?.where?.userId).not.toBe('me@example.com');
  });

  it('returns items + null nextCursor when there is no extra page', async () => {
    prismaMock.listing.findMany.mockResolvedValue([makeListing()] as never);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ id: 'l1', title: 'Villa moderne avec piscine' });
    expect(body.nextCursor).toBeNull();
  });

  it('emits a nextCursor when more rows exist than the limit', async () => {
    prismaMock.listing.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, i) => makeListing({ id: `l${i}` })) as never,
    );
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items).toHaveLength(20);
    expect(body.nextCursor).toBeTruthy();
  });

  it('clamps ?limit= via clampLimit (take = limit + 1)', async () => {
    prismaMock.listing.findMany.mockResolvedValue([] as never);
    await GET(makeGet('?limit=5'));
    const args = prismaMock.listing.findMany.mock.calls[0]?.[0];
    expect(args?.take).toBe(6);
  });

  it('response includes x-request-id header', async () => {
    prismaMock.listing.findMany.mockResolvedValue([] as never);
    const res = await GET(makeGet());
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('returns status counts scoped to the authenticated user, independent of pagination', async () => {
    prismaMock.listing.findMany.mockResolvedValue([makeListing()] as never);
    prismaMock.listing.count
      .mockResolvedValueOnce(24 as never) // total
      .mockResolvedValueOnce(16 as never) // verified
      .mockResolvedValueOnce(5 as never) // pending
      .mockResolvedValueOnce(3 as never); // sold
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.counts).toEqual({ total: 24, verified: 16, pending: 5, sold: 3 });
    for (const call of prismaMock.listing.count.mock.calls) {
      expect(call[0]?.where?.userId).toBe('user-1');
    }
  });

  it('includes transactionType in the selected fields', async () => {
    prismaMock.listing.findMany.mockResolvedValue([
      makeListing({ transactionType: 'RENT' }),
    ] as never);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items[0]).toMatchObject({ transactionType: 'RENT' });
    const args = prismaMock.listing.findMany.mock.calls[0]?.[0];
    expect(args?.select?.transactionType).toBe(true);
  });

  it('excludes DRAFT listings from both rows and counts', async () => {
    prismaMock.listing.findMany.mockResolvedValue([] as never);
    await GET(makeGet());
    const findManyArgs = prismaMock.listing.findMany.mock.calls[0]?.[0];
    expect(findManyArgs?.where?.status).toEqual({ not: 'DRAFT' });
    for (const call of prismaMock.listing.count.mock.calls) {
      expect(call[0]?.where?.userId).toBe('user-1');
    }
    expect(prismaMock.listing.count.mock.calls[0]?.[0]?.where?.status).toEqual({ not: 'DRAFT' });
  });
});

describe('POST /api/listings', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await POST(makePost());
    expect(res.status).toBe(401);
    expect(prismaMock.listing.create).not.toHaveBeenCalled();
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const res = await POST(makePost());
    expect(res.status).toBe(403);
    expect(prismaMock.listing.create).not.toHaveBeenCalled();
  });

  it('creates a bare DRAFT listing scoped to the authenticated user', async () => {
    prismaMock.listing.create.mockResolvedValue({
      id: 'new-listing-1',
      status: 'DRAFT',
      createdAt: new Date('2026-07-31T10:00:00Z'),
    } as never);
    const res = await POST(makePost());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.listing).toMatchObject({ id: 'new-listing-1', status: 'DRAFT' });
    const args = prismaMock.listing.create.mock.calls[0]?.[0];
    expect(args?.data?.userId).toBe('user-1');
    expect(args?.data?.status).toBe('DRAFT');
  });

  it('response includes x-request-id header', async () => {
    prismaMock.listing.create.mockResolvedValue({
      id: 'l1',
      status: 'DRAFT',
      createdAt: new Date(),
    } as never);
    const res = await POST(makePost());
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
