// LISTINGS-05 — DELETE /api/listings/[id]/photos/[photoId] tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

mockNextCookies();

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { DELETE } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makeDeleteReq(id: string, photoId: string) {
  const req = new NextRequest(`http://test/api/listings/${id}/photos/${photoId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': 'test-csrf' },
  });
  return { req, ctx: { params: Promise.resolve({ id, photoId }) } };
}

beforeEach(() => {
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.listing.findUnique.mockResolvedValue({ userId: 'user-1', status: 'DRAFT' } as never);
  prismaMock.listingPhoto.findUnique.mockResolvedValue({
    id: 'p1',
    listingId: 'l1',
    isPrimary: false,
  } as never);
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
});

describe('DELETE /api/listings/[id]/photos/[photoId]', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const { req, ctx } = makeDeleteReq('l1', 'p1');
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const { req, ctx } = makeDeleteReq('l1', 'p1');
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(403);
  });

  it('listing not owned returns 404', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({
      userId: 'someone-else',
      status: 'DRAFT',
    } as never);
    const { req, ctx } = makeDeleteReq('l1', 'p1');
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(404);
  });

  it('non-DRAFT listing returns 409', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      status: 'PENDING',
    } as never);
    const { req, ctx } = makeDeleteReq('l1', 'p1');
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(409);
  });

  it('photo not found (or belongs to another listing) returns 404', async () => {
    prismaMock.listingPhoto.findUnique.mockResolvedValueOnce(null);
    const { req, ctx } = makeDeleteReq('l1', 'p1');
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('PHOTO_NOT_FOUND');
  });

  it('deletes a non-primary photo without promoting anything', async () => {
    const { req, ctx } = makeDeleteReq('l1', 'p1');
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.listingPhoto.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(prismaMock.listingPhoto.update).not.toHaveBeenCalled();
  });

  it('deleting the primary photo promotes the earliest remaining photo', async () => {
    prismaMock.listingPhoto.findUnique.mockResolvedValueOnce({
      id: 'p1',
      listingId: 'l1',
      isPrimary: true,
    } as never);
    prismaMock.listingPhoto.findFirst.mockResolvedValueOnce({ id: 'p2' } as never);
    const { req, ctx } = makeDeleteReq('l1', 'p1');
    await DELETE(req, ctx);
    expect(prismaMock.listingPhoto.update).toHaveBeenCalledWith({
      where: { id: 'p2' },
      data: { isPrimary: true },
    });
  });

  it('deleting the primary photo when none remain does not throw', async () => {
    prismaMock.listingPhoto.findUnique.mockResolvedValueOnce({
      id: 'p1',
      listingId: 'l1',
      isPrimary: true,
    } as never);
    prismaMock.listingPhoto.findFirst.mockResolvedValueOnce(null);
    const { req, ctx } = makeDeleteReq('l1', 'p1');
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.listingPhoto.update).not.toHaveBeenCalled();
  });
});
