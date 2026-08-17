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
