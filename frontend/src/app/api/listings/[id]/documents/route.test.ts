// LISTINGS-06 — POST /api/listings/[id]/documents tests.
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

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

function makePostReq(id: string, type: string | null, file: File | null) {
  const fd = new FormData();
  if (type !== null) fd.append('type', type);
  if (file) fd.append('file', file);
  const req = new NextRequest(`http://test/api/listings/${id}/documents`, {
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
  prismaMock.listingDocument.findUnique.mockResolvedValue(null);
  prismaMock.listingDocument.upsert.mockResolvedValue({
    type: 'LAND_TITLE',
    status: 'PENDING',
    url: 'https://res.cloudinary.com/test/x.pdf',
    filename: 'titre.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 4,
    createdAt: new Date(),
  } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/listings/[id]/documents', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const file = new File([PDF_BYTES], 'a.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const file = new File([PDF_BYTES], 'a.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it('listing not owned returns 404', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({
      userId: 'someone-else',
      status: 'DRAFT',
    } as never);
    const file = new File([PDF_BYTES], 'a.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it('non-DRAFT listing returns 409', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      status: 'PENDING',
    } as never);
    const file = new File([PDF_BYTES], 'a.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
  });

  it('invalid document type returns 400', async () => {
    const file = new File([PDF_BYTES], 'a.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'NOT_A_TYPE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_DOCUMENT_TYPE');
  });

  it('missing file returns 400', async () => {
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', null);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('UPLOAD_MISSING_FILE');
  });

  it('mime not in the allowlist returns 415', async () => {
    const gif = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], 'a.gif', {
      type: 'image/gif',
    });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', gif);
    const res = await POST(req, ctx);
    expect(res.status).toBe(415);
  });

  it('magic byte mismatch returns 415', async () => {
    const fake = new File([PDF_BYTES], 'a.png', { type: 'image/png' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', fake);
    const res = await POST(req, ctx);
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.code).toBe('MAGIC_BYTE_MISMATCH');
  });

  it('replacing a VERIFIED document returns 409', async () => {
    prismaMock.listingDocument.findUnique.mockResolvedValueOnce({ status: 'VERIFIED' } as never);
    const file = new File([PDF_BYTES], 'a.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('DOCUMENT_VERIFIED');
    expect(prismaMock.listingDocument.upsert).not.toHaveBeenCalled();
  });

  it('valid upload upserts by (listingId, type) as PENDING', async () => {
    const file = new File([PDF_BYTES], 'titre.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.document.status).toBe('PENDING');
    const args = prismaMock.listingDocument.upsert.mock.calls[0]?.[0];
    expect(args?.where).toEqual({ listingId_type: { listingId: 'l1', type: 'LAND_TITLE' } });
  });

  it('storage not configured returns 503', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
    const file = new File([PDF_BYTES], 'a.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(503);
  });

  it('upload failure (cloudinary throws) returns 502', async () => {
    const { uploadBuffer } = await import('@/lib/server/upload/cloudinary-client');
    (uploadBuffer as unknown as Mock).mockImplementationOnce(async () => {
      throw new Error('Cloudinary down');
    });
    const file = new File([PDF_BYTES], 'a.pdf', { type: 'application/pdf' });
    const { req, ctx } = makePostReq('l1', 'LAND_TITLE', file);
    const res = await POST(req, ctx);
    expect(res.status).toBe(502);
  });
});
