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
    bedrooms: 5,
    bathrooms: 4,
    surfaceM2: 320,
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

const mockGroupBy = vi.mocked(prismaMock.listing.groupBy);

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.listing.findMany.mockResolvedValue([makeRow()] as never);
  prismaMock.listing.count.mockResolvedValue(1 as never);
  mockGroupBy.mockResolvedValue([] as never);
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
    await GET(
      makeGet(
        '?country=B%C3%A9nin&propertyType=VILLA&transactionType=VENTE&priceMin=1000&priceMax=2000',
      ),
    );
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

  it('applies a case-insensitive contains filter on city', async () => {
    await GET(makeGet('?city=cocody'));
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          city: { contains: 'cocody', mode: 'insensitive' },
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
    expect(prismaMock.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 24 }));
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
        bedrooms: 5,
        bathrooms: 4,
        surfaceM2: 320,
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
    mockGroupBy.mockResolvedValue([
      { country: 'Togo', _count: { _all: 2 }, _min: { price: 28_000_000 } },
      { country: 'Bénin', _count: { _all: 5 }, _min: { price: 18_000_000 } },
    ] as never);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.facets.countries).toEqual([
      { value: 'Bénin', count: 5, minPrice: 18_000_000 },
      { value: 'Togo', count: 2, minPrice: 28_000_000 },
    ]);
  });
});
