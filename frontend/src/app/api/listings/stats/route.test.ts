// LISTINGS-STATS-01 — GET /api/listings/stats tests.
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

function makeGet(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/listings/stats${qs}`, { method: 'GET' });
}

beforeEach(() => {
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.listingView.count.mockResolvedValue(0 as never);
  prismaMock.listingInquiry.count.mockResolvedValue(0 as never);
  prismaMock.visit.count.mockResolvedValue(0 as never);
  prismaMock.listing.count.mockResolvedValue(0 as never);
  prismaMock.listingDocument.count.mockResolvedValue(0 as never);
  prismaMock.listing.findMany.mockResolvedValue([] as never);
  prismaMock.listingView.findMany.mockResolvedValue([] as never);
  prismaMock.listingInquiry.findMany.mockResolvedValue([] as never);
});

describe('GET /api/listings/stats', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect(prismaMock.listingView.count).not.toHaveBeenCalled();
  });

  it('scopes every aggregation to the authenticated user', async () => {
    await GET(makeGet());
    expect(prismaMock.listingView.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ listing: { userId: 'user-1' } }),
      }),
    );
    expect(prismaMock.listing.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('defaults to a 30-day period', async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.period).toBe('30j');
    expect(body.viewsTimeseries).toHaveLength(30);
  });

  it('computes a 100% trend when the previous period had zero activity', async () => {
    prismaMock.listingView.count.mockResolvedValueOnce(20 as never); // current
    prismaMock.listingView.count.mockResolvedValueOnce(0 as never); // previous
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.kpis.views.value).toBe(20);
    expect(body.kpis.views.trendPct).toBe(100);
    expect(body.kpis.views.up).toBe(true);
  });

  it('computes conversion rate as contacts / views * 100', async () => {
    prismaMock.listingView.count.mockResolvedValueOnce(200 as never); // views current
    prismaMock.listingView.count.mockResolvedValueOnce(0 as never); // views previous
    prismaMock.listingInquiry.count.mockResolvedValueOnce(10 as never); // contacts current
    prismaMock.listingInquiry.count.mockResolvedValueOnce(0 as never); // contacts previous
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.kpis.conversionRate.value).toBe(5);
  });

  it('ranks top listings by contacts received within the period, descending', async () => {
    prismaMock.listing.findMany.mockResolvedValueOnce([] as never); // listingsWithDocs
    prismaMock.listing.findMany.mockResolvedValueOnce([
      {
        id: 'l1',
        title: 'A',
        city: 'Lomé',
        country: 'Togo',
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 1,
        currency: 'XOF',
        _count: { inquiries: 3 },
      },
      {
        id: 'l2',
        title: 'B',
        city: 'Lomé',
        country: 'Togo',
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 1,
        currency: 'XOF',
        _count: { inquiries: 9 },
      },
    ] as never); // topListingsRaw
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.topListings.map((l: { id: string }) => l.id)).toEqual(['l2', 'l1']);
  });

  it('buckets ListingView rows into traffic-source percentages', async () => {
    const day = new Date();
    prismaMock.listingView.findMany.mockResolvedValueOnce([
      { createdAt: day, source: 'ORGANIC' },
      { createdAt: day, source: 'ORGANIC' },
      { createdAt: day, source: 'SOCIAL' },
      { createdAt: day, source: 'DIRECT' },
    ] as never);
    const res = await GET(makeGet());
    const body = await res.json();
    const organic = body.trafficSources.find((s: { source: string }) => s.source === 'ORGANIC');
    expect(organic.pct).toBe(50);
  });

  it('returns totalListingsCount, newListingsInPeriod, and upcomingVisitsCount', async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        totalListingsCount: 0,
        newListingsInPeriod: 0,
        upcomingVisitsCount: 0,
      }),
    );
  });

  it('scopes upcomingVisitsCount to EN_ATTENTE/CONFIRMEE visits scheduled in the future', async () => {
    await GET(makeGet());
    expect(prismaMock.visit.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inquiry: { listing: { userId: 'user-1' } },
          status: { in: ['EN_ATTENTE', 'CONFIRMEE'] },
          scheduledAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
  });
});
