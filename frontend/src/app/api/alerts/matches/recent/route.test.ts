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

  it('clamps an over-large limit to 20', async () => {
    await GET(makeGet('?limit=999'));
    expect(prismaMock.alertMatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  it('treats a non-positive limit as invalid and falls back to the default of 5', async () => {
    await GET(makeGet('?limit=0'));
    expect(prismaMock.alertMatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
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
