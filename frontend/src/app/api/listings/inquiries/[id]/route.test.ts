// LISTINGS-INQUIRIES-02 — PATCH /api/listings/inquiries/[id] tests.
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
    req: new NextRequest(`http://test/api/listings/inquiries/${id}`, {
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
  prismaMock.listingInquiry.findUnique.mockResolvedValue({
    id: 'i1',
    status: 'EN_ATTENTE',
    notes: null,
    listing: { userId: 'user-1' },
  } as never);
  prismaMock.listingInquiry.update.mockResolvedValue({
    id: 'i1',
    status: 'REPONDU',
    notes: 'Rappelé le client',
  } as never);
});

describe('PATCH /api/listings/inquiries/[id]', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const { req, ctx } = makePatch('i1', { status: 'REPONDU' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const { req, ctx } = makePatch('i1', { status: 'REPONDU' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(403);
  });

  it('404s when the inquiry does not exist', async () => {
    prismaMock.listingInquiry.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePatch('missing', { status: 'REPONDU' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it('404s when the inquiry belongs to another user (not 403)', async () => {
    prismaMock.listingInquiry.findUnique.mockResolvedValueOnce({
      id: 'i1',
      status: 'EN_ATTENTE',
      notes: null,
      listing: { userId: 'someone-else' },
    } as never);
    const { req, ctx } = makePatch('i1', { status: 'REPONDU' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
    expect(prismaMock.listingInquiry.update).not.toHaveBeenCalled();
  });

  it('400s on an invalid status', async () => {
    const { req, ctx } = makePatch('i1', { status: 'NOPE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('400s when neither status nor notes is provided', async () => {
    const { req, ctx } = makePatch('i1', {});
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('updates only status when only status is provided', async () => {
    const { req, ctx } = makePatch('i1', { status: 'REPONDU' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.listingInquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1' }, data: { status: 'REPONDU' } }),
    );
  });

  it('updates only notes when only notes is provided', async () => {
    const { req, ctx } = makePatch('i1', { notes: 'Rappelé le client' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.listingInquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1' }, data: { notes: 'Rappelé le client' } }),
    );
  });

  it('response includes x-request-id header', async () => {
    const { req, ctx } = makePatch('i1', { status: 'REPONDU' });
    const res = await PATCH(req, ctx);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});
