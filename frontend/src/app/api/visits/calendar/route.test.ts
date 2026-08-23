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
