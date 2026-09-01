// PUBLIC-AGENTS-01 — GET /api/public/agents tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

function makeAgentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agent-1',
    name: 'Kofi Atta',
    avatarUrl: null,
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    bio: 'Consultant immobilier',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeGet(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/public/agents${qs}`);
}

const mockUserFindMany = vi.mocked(prismaMock.user.findMany);
const mockUserCount = vi.mocked(prismaMock.user.count);
const mockUserGroupBy = vi.mocked(prismaMock.user.groupBy);
const mockListingGroupBy = vi.mocked(prismaMock.listing.groupBy);
const mockLegalDocGroupBy = vi.mocked(prismaMock.legalDocument.groupBy);

beforeEach(() => {
  vi.clearAllMocks();
  // Call order inside the route: rows -> (total, countryFacet, totalAgentsAll,
  // agentCountries in parallel) -> listing/legalDocument counts -> allAgentIds -> allDocCounts.
  mockUserFindMany
    .mockResolvedValueOnce([makeAgentRow()] as never) // rows
    .mockResolvedValueOnce([{ country: "Côte d'Ivoire" }] as never) // agentCountries
    .mockResolvedValueOnce([{ id: 'agent-1' }] as never); // allAgentIds
  mockUserCount
    .mockResolvedValueOnce(1 as never) // total
    .mockResolvedValueOnce(1 as never); // totalAgentsAll
  mockUserGroupBy.mockResolvedValue([] as never);
  mockListingGroupBy.mockResolvedValue([] as never);
  mockLegalDocGroupBy.mockResolvedValue([] as never);
});

describe('GET /api/public/agents', () => {
  it('only queries accountType OWNER_AGENT', async () => {
    await GET(makeGet());
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accountType: 'OWNER_AGENT' }),
      }),
    );
  });

  it('applies search, country, and transactionType filters', async () => {
    await GET(makeGet('?search=Kofi&country=B%C3%A9nin&transactionType=VENTE'));
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountType: 'OWNER_AGENT',
          country: 'Bénin',
          listings: { some: { status: 'VERIFIED', transactionType: 'VENTE' } },
          OR: [
            { name: { contains: 'Kofi', mode: 'insensitive' } },
            { city: { contains: 'Kofi', mode: 'insensitive' } },
            { bio: { contains: 'Kofi', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });

  it('applies page/limit as skip/take and clamps limit', async () => {
    await GET(makeGet('?page=2&limit=999'));
    expect(mockUserFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 24, take: 24 }));
  });

  it('maps rows to the flat DTO shape with real listing/doc counts, never leaking email', async () => {
    mockListingGroupBy.mockResolvedValueOnce([{ userId: 'agent-1', _count: { _all: 3 } }] as never);
    mockLegalDocGroupBy
      .mockResolvedValueOnce([{ userId: 'agent-1', _count: { _all: 2 } }] as never) // docCounts
      .mockResolvedValueOnce([{ userId: 'agent-1', _count: { _all: 2 } }] as never); // allDocCounts

    const res = await GET(makeGet());
    const body = await res.json();

    expect(body.items).toEqual([
      {
        id: 'agent-1',
        name: 'Kofi Atta',
        avatarUrl: null,
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        bio: 'Consultant immobilier',
        createdAt: '2026-01-01T00:00:00.000Z',
        listingCount: 3,
        verifiedDocCount: 2,
        verifiedDocTotal: 6,
      },
    ]);
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('computes stats.fullyVerifiedPercent from agents with all 6 docs verified', async () => {
    mockLegalDocGroupBy
      .mockResolvedValueOnce([] as never) // docCounts (page)
      .mockResolvedValueOnce([{ userId: 'agent-1', _count: { _all: 6 } }] as never); // allDocCounts

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.stats.fullyVerifiedPercent).toBe(100);
    expect(body.stats.totalAgents).toBe(1);
  });
});
