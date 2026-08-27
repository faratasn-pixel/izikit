// PUBLIC-AGENT-DETAIL-01 — GET /api/public/agents/[id] tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agent-1',
    name: 'Kofi Atta',
    avatarUrl: null,
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    bio: 'Consultant immobilier',
    phone: '+225070000000',
    accountType: 'OWNER_AGENT',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeGet(id = 'agent-1'): {
  req: NextRequest;
  ctx: { params: Promise<{ id: string }> };
} {
  return {
    req: new NextRequest(`http://test/api/public/agents/${id}`),
    ctx: { params: Promise.resolve({ id }) },
  };
}

const mockFindUnique = vi.mocked(prismaMock.user.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue(makeAgent() as never);
  prismaMock.listing.findMany.mockResolvedValue([] as never);
  prismaMock.listing.count.mockResolvedValue(0 as never);
  prismaMock.legalDocument.count.mockResolvedValue(0 as never);
  vi.mocked(prismaMock.listing.groupBy).mockResolvedValue([] as never);
});

describe('GET /api/public/agents/[id]', () => {
  it('404s when the user does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const { req, ctx } = makeGet('missing');
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it('404s when the user is not an OWNER_AGENT (never leaks TENANT_BUYER existence)', async () => {
    mockFindUnique.mockResolvedValueOnce(makeAgent({ accountType: 'TENANT_BUYER' }) as never);
    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it('only counts VERIFIED listings as active and SOLD as sold', async () => {
    const { req, ctx } = makeGet();
    await GET(req, ctx);
    expect(prismaMock.listing.count).toHaveBeenCalledWith({
      where: { userId: 'agent-1', status: 'VERIFIED' },
    });
    expect(prismaMock.listing.count).toHaveBeenCalledWith({
      where: { userId: 'agent-1', status: 'SOLD' },
    });
  });

  it('returns the flat DTO shape with real stats, never leaking email', async () => {
    prismaMock.listing.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    prismaMock.legalDocument.count.mockResolvedValueOnce(6);
    prismaMock.listing.findMany.mockResolvedValueOnce([
      {
        id: 'listing-1',
        title: 'Villa duplex',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 100_000_000,
        currency: 'XOF',
        bedrooms: 4,
        bathrooms: 3,
        surfaceM2: 250,
        createdAt: new Date('2026-02-01T00:00:00Z'),
        photos: [{ url: 'https://example.com/1.jpg' }],
      },
    ] as never);

    const { req, ctx } = makeGet();
    const res = await GET(req, ctx);
    const body = await res.json();

    expect(body.id).toBe('agent-1');
    expect(body.phone).toBe('+225070000000');
    expect(body.stats).toEqual({
      activeListings: 4,
      soldListings: 2,
      verifiedDocCount: 6,
      verifiedDocTotal: 6,
    });
    expect(body.listings).toEqual([
      {
        id: 'listing-1',
        title: 'Villa duplex',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 100_000_000,
        currency: 'XOF',
        bedrooms: 4,
        bathrooms: 3,
        surfaceM2: 250,
        createdAt: '2026-02-01T00:00:00.000Z',
        primaryPhotoUrl: 'https://example.com/1.jpg',
      },
    ]);
    expect(JSON.stringify(body)).not.toContain('email');
  });
});
