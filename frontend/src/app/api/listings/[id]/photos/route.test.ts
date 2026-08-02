// LISTINGS-04 — POST /api/listings/[id]/photos tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { mockCloudinaryClient } from '@/test-utils/cloudinary-mock';

mockNextCookies();

const cl = mockCloudinaryClient();

vi.mock('@/lib/server/upload/cloudinary-client', () => ({
  uploadBuffer: vi.fn((publicId: string, body: Buffer) => cl.uploadBuffer(publicId, body)),
  StorageNotConfiguredError: class StorageNotConfiguredError extends Error {
    constructor() {
      super('Storage not configured');
      this.name = 'StorageNotConfiguredError';
    }
  },
}));

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { POST } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

function makePostReq(id: string, file: File | null, isPrimary?: boolean) {
  const fd = new FormData();
  if (file) fd.append('file', file);
  if (isPrimary !== undefined) fd.append('isPrimary', String(isPrimary));
  const req = new NextRequest(`http://test/api/listings/${id}/photos`, {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-csrf' },
    body: fd,
  });
  return { req, ctx: { params: Promise.resolve({ id }) } };
}

beforeEach(() => {
  vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test-cloud');
  vi.stubEnv('CLOUDINARY_API_KEY', 'test-key');
  vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret');
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.listing.findUnique.mockResolvedValue({ userId: 'user-1', status: 'DRAFT' } as never);
  prismaMock.listingPhoto.count.mockResolvedValue(0 as never);
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
  prismaMock.listingPhoto.create.mockResolvedValue({
    id: 'photo-1',
    url: 'https://res.cloudinary.com/test/x.jpg',
    isPrimary: true,
    position: 0,
    createdAt: new Date(),
  } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/listings/[id]/photos', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it('listing not owned returns 404', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({
      userId: 'someone-else',
      status: 'DRAFT',
    } as never);
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it('non-DRAFT listing returns 409', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      status: 'PENDING',
    } as never);
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
  });

  it('missing file returns 400', async () => {
    const { req, ctx } = makePostReq('l1', null);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('UPLOAD_MISSING_FILE');
  });

  it('mime not in the image allowlist returns 415', async () => {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'a.pdf', {
      type: 'application/pdf',
    });
    const { req, ctx } = makePostReq('l1', pdf);
    const res = await POST(req, ctx);
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.code).toBe('INVALID_MIME');
  });

  it('magic byte mismatch returns 415', async () => {
    const fake = new File([JPEG_BYTES], 'a.png', { type: 'image/png' });
    const { req, ctx } = makePostReq('l1', fake);
    const res = await POST(req, ctx);
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.code).toBe('MAGIC_BYTE_MISMATCH');
  });

  it('at the 20-photo cap returns 400 TOO_MANY_PHOTOS', async () => {
    prismaMock.listingPhoto.count.mockResolvedValueOnce(20 as never);
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('TOO_MANY_PHOTOS');
  });

  it('first photo is auto-marked primary', async () => {
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
    const createArgs = prismaMock.listingPhoto.create.mock.calls[0]?.[0];
    expect(createArgs?.data?.isPrimary).toBe(true);
  });

  it('subsequent photo is not primary unless isPrimary=true is sent', async () => {
    prismaMock.listingPhoto.count.mockResolvedValueOnce(2 as never);
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file);
    await POST(req, ctx);
    const createArgs = prismaMock.listingPhoto.create.mock.calls[0]?.[0];
    expect(createArgs?.data?.isPrimary).toBe(false);
    expect(prismaMock.listingPhoto.updateMany).not.toHaveBeenCalled();
  });

  it('isPrimary=true unsets the previous primary photo first', async () => {
    prismaMock.listingPhoto.count.mockResolvedValueOnce(2 as never);
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file, true);
    await POST(req, ctx);
    expect(prismaMock.listingPhoto.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { listingId: 'l1', isPrimary: true } }),
    );
  });

  it('storage not configured returns 503', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
    const file = new File([JPEG_BYTES], 'a.jpg', { type: 'image/jpeg' });
    const { req, ctx } = makePostReq('l1', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(503);
  });
});
