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
  prismaMock.listingView.create.mockResolvedValue({} as never);
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

  it('records a ListingView with a classified source', async () => {
    const req = new NextRequest('http://test/api/public/listings/listing-1', {
      headers: { referer: 'https://www.google.com/search?q=villa' },
    });
    await GET(req, { params: Promise.resolve({ id: 'listing-1' }) });
    expect(prismaMock.listingView.create).toHaveBeenCalledWith({
      data: { listingId: 'listing-1', source: 'ORGANIC' },
    });
  });

  it('does not fail the request when the ListingView write throws', async () => {
    prismaMock.listingView.create.mockRejectedValueOnce(new Error('db down'));
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
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
