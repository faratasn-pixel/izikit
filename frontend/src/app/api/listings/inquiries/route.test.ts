// LISTINGS-INQUIRIES-01 — GET /api/listings/inquiries tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

mockNextCookies();

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from '@/lib/server/middleware';
import { GET } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makeGet(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/listings/inquiries${qs}`, { method: 'GET' });
}

function makeInquiry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    name: 'Amavi Kodjovi',
    phone: '+228 90 34 12 78',
    email: 'amavi.k@gmail.com',
    message: 'Je suis intéressé par cette annonce.',
    type: 'MESSAGE',
    status: 'EN_ATTENTE',
    notes: null,
    createdAt: new Date('2026-08-20T09:14:00Z'),
    listing: {
      id: 'l1',
      title: 'Villa F4',
      city: 'Lomé',
      country: 'Togo',
      transactionType: 'VENTE',
      price: 85_000_000,
      currency: 'XOF',
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.listingInquiry.count.mockResolvedValue(0 as never);
  prismaMock.listingInquiry.findMany.mockResolvedValue([] as never);
});

describe('GET /api/listings/inquiries', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect(prismaMock.listingInquiry.findMany).not.toHaveBeenCalled();
  });

  it('scopes the query to the authenticated user via the listing relation', async () => {
    await GET(makeGet());
    const args = prismaMock.listingInquiry.findMany.mock.calls[0]?.[0];
    expect(args?.where?.listing).toEqual({ userId: 'user-1' });
    for (const call of prismaMock.listingInquiry.count.mock.calls) {
      expect(call[0]?.where?.listing).toEqual({ userId: 'user-1' });
    }
  });

  it('returns items with the joined listing fields', async () => {
    prismaMock.listingInquiry.findMany.mockResolvedValue([makeInquiry()] as never);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: 'i1',
      status: 'EN_ATTENTE',
      listing: { title: 'Villa F4', transactionType: 'VENTE' },
    });
  });

  it('emits a nextCursor when more rows exist than the limit', async () => {
    prismaMock.listingInquiry.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, i) => makeInquiry({ id: `i${i}` })) as never,
    );
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items).toHaveLength(20);
    expect(body.nextCursor).toBeTruthy();
  });

  it('clamps ?limit= via clampLimit (take = limit + 1)', async () => {
    await GET(makeGet('?limit=5'));
    const args = prismaMock.listingInquiry.findMany.mock.calls[0]?.[0];
    expect(args?.take).toBe(6);
  });

  it('computes stats from count queries scoped to the same user', async () => {
    prismaMock.listingInquiry.count
      .mockResolvedValueOnce(40 as never) // total
      .mockResolvedValueOnce(6 as never) // nouveaux7j
      .mockResolvedValueOnce(9 as never) // enAttente
      .mockResolvedValueOnce(4 as never); // visitePlanifiee (for tauxConversion)
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.stats).toEqual({ total: 40, nouveaux7j: 6, enAttente: 9, tauxConversion: 10 });
  });

  it('returns tauxConversion 0 when there are no inquiries', async () => {
    prismaMock.listingInquiry.count.mockResolvedValue(0 as never);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.stats.tauxConversion).toBe(0);
  });

  it('response includes x-request-id header', async () => {
    const res = await GET(makeGet());
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
