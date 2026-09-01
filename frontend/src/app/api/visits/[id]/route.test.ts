// VISITS-03 — PATCH /api/visits/[id] tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));
vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { PATCH } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makePatch(
  id: string,
  body: unknown,
): { req: NextRequest; ctx: { params: Promise<{ id: string }> } } {
  return {
    req: new NextRequest(`http://test/api/visits/${id}`, {
      method: 'PATCH',
      headers: { 'x-csrf-token': 'test-csrf' },
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.visit.findUnique.mockResolvedValue({
    id: 'v1',
    inquiry: { listing: { userId: 'user-1' } },
  } as never);
  prismaMock.visit.update.mockResolvedValue({
    id: 'v1',
    status: 'ANNULEE',
    notes: null,
  } as never);
});

describe('PATCH /api/visits/[id]', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(403);
  });

  it('404s when the visit does not exist', async () => {
    prismaMock.visit.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePatch('missing', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it('404s when the visit belongs to another user (not 403)', async () => {
    prismaMock.visit.findUnique.mockResolvedValueOnce({
      id: 'v1',
      inquiry: { listing: { userId: 'someone-else' } },
    } as never);
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
    expect(prismaMock.visit.update).not.toHaveBeenCalled();
  });

  it('400s on an invalid status', async () => {
    const { req, ctx } = makePatch('v1', { status: 'NOPE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('400s when no field is provided', async () => {
    const { req, ctx } = makePatch('v1', {});
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('updates only status when only status is provided (cancel action)', async () => {
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.visit.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'v1' }, data: { status: 'ANNULEE' } }),
    );
  });

  it('updates scheduledAt and type together (edit action)', async () => {
    const { req, ctx } = makePatch('v1', {
      scheduledAt: '2026-09-01T10:00:00.000Z',
      type: 'VIRTUELLE',
    });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const args = prismaMock.visit.update.mock.calls[0]?.[0];
    expect(args?.data).toMatchObject({ type: 'VIRTUELLE' });
    expect(args?.data?.scheduledAt).toBeInstanceOf(Date);
  });

  it('response includes x-request-id header', async () => {
    const { req, ctx } = makePatch('v1', { status: 'ANNULEE' });
    const res = await PATCH(req, ctx);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});
