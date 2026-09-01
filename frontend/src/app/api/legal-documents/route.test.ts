// Tests for GET/POST /api/legal-documents.
//
// Mock strategy mirrors src/app/api/upload/route.test.ts (Cloudinary via
// cloudinary-mock, requireAuth/verifyCsrf mocked directly, prisma.legalDocument
// stubbed with plain vi.fn — no need for the full deep prismaMock here since
// this route only touches one model).
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { NextResponse } from 'next/server';
import { mockCloudinaryClient } from '@/test-utils/cloudinary-mock';

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
  requireAuth: vi.fn(async () => ({ user: { sub: 'user-1', email: 't@e.com' } })),
}));

vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

const findMany = vi.fn(async () => []);
const findUnique = vi.fn(async () => null);
const upsert = vi.fn(async (args: unknown) => ({
  type: (args as { where: { userId_type: { type: string } } }).where.userId_type.type,
  status: 'PENDING',
  url: 'https://res.cloudinary.com/test/x.pdf',
  filename: 'doc.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 4,
  expiresAt: null,
  rejectionReason: null,
  createdAt: new Date(),
}));

vi.mock('@/lib/server/prisma', () => ({
  prisma: { legalDocument: { findMany, findUnique, upsert } },
}));

beforeEach(() => {
  vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test-cloud');
  vi.stubEnv('CLOUDINARY_API_KEY', 'test-key');
  vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  findMany.mockResolvedValue([]);
  findUnique.mockResolvedValue(null);
});

function makeGetReq() {
  return new Request(new URL('http://localhost/api/legal-documents'), { method: 'GET' });
}

interface MakePostOpts {
  type?: string | null;
  file?: File | null;
  expiresAt?: string;
  csrf?: boolean;
}

function makePostReq(opts: MakePostOpts) {
  const fd = new FormData();
  if (opts.type !== null) fd.append('type', opts.type ?? 'ID_CARD');
  if (opts.file !== undefined && opts.file !== null) fd.append('file', opts.file);
  if (opts.expiresAt) fd.append('expiresAt', opts.expiresAt);
  const headers = new Headers();
  if (opts.csrf !== false) headers.set('x-csrf-token', 'test-csrf');
  return new Request(new URL('http://localhost/api/legal-documents'), {
    method: 'POST',
    body: fd,
    headers,
  });
}

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

describe('GET /api/legal-documents', () => {
  it('returns all 6 fixed types with null documents when none uploaded', async () => {
    const { GET } = await import('./route');
    const res = await GET(makeGetReq() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents).toHaveLength(6);
    expect(body.documents.every((d: { document: unknown }) => d.document === null)).toBe(true);
    expect(body.stats).toEqual({ verified: 0, pending: 0, missing: 6, total: 6 });
  });

  it('merges uploaded rows and computes stats', async () => {
    findMany.mockResolvedValueOnce([
      { type: 'ID_CARD', status: 'VERIFIED' },
      { type: 'RCCM', status: 'PENDING' },
    ] as never);
    const { GET } = await import('./route');
    const res = await GET(makeGetReq() as never);
    const body = await res.json();
    expect(body.stats).toEqual({ verified: 1, pending: 1, missing: 4, total: 6 });
    const idCard = body.documents.find((d: { type: string }) => d.type === 'ID_CARD');
    expect(idCard.document.status).toBe('VERIFIED');
  });

  it('no auth returns 401', async () => {
    const { requireAuth } = await import('@/lib/server/middleware');
    (requireAuth as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
    );
    const { GET } = await import('./route');
    const res = await GET(makeGetReq() as never);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/legal-documents', () => {
  it('valid pdf upload upserts as PENDING', async () => {
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'cnib.pdf', { type: 'application/pdf' });
    const res = await POST(makePostReq({ type: 'ID_CARD', file }) as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.document.type).toBe('ID_CARD');
    expect(body.document.status).toBe('PENDING');
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('invalid document type returns 400', async () => {
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'x.pdf', { type: 'application/pdf' });
    const res = await POST(makePostReq({ type: 'NOT_A_TYPE', file }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_DOCUMENT_TYPE');
  });

  it('missing file returns 400', async () => {
    const { POST } = await import('./route');
    const res = await POST(makePostReq({ type: 'ID_CARD', file: null }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('UPLOAD_MISSING_FILE');
  });

  it('mime not in the pdf/jpeg/png allowlist returns 415', async () => {
    const { POST } = await import('./route');
    const gif = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], 'a.gif', {
      type: 'image/gif',
    });
    const res = await POST(makePostReq({ type: 'ID_CARD', file: gif }) as never);
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.code).toBe('INVALID_MIME');
  });

  it('magic byte mismatch returns 415', async () => {
    const { POST } = await import('./route');
    // PDF bytes declared as image/png.
    const fake = new File([PDF_BYTES], 'a.png', { type: 'image/png' });
    const res = await POST(makePostReq({ type: 'ID_CARD', file: fake }) as never);
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.code).toBe('MAGIC_BYTE_MISMATCH');
  });

  it('replacing a VERIFIED document returns 409', async () => {
    findUnique.mockResolvedValueOnce({ status: 'VERIFIED' } as never);
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'cnib.pdf', { type: 'application/pdf' });
    const res = await POST(makePostReq({ type: 'ID_CARD', file }) as never);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('DOCUMENT_VERIFIED');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('replacing a PENDING document is allowed', async () => {
    findUnique.mockResolvedValueOnce({ status: 'PENDING' } as never);
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'cnib.pdf', { type: 'application/pdf' });
    const res = await POST(makePostReq({ type: 'ID_CARD', file }) as never);
    expect(res.status).toBe(201);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('invalid expiresAt returns 400 VALIDATION_FAILED', async () => {
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'cnib.pdf', { type: 'application/pdf' });
    const res = await POST(
      makePostReq({ type: 'ID_CARD', file, expiresAt: 'not-a-date' }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_FAILED');
  });

  it('storage not configured (env missing) returns 503', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'cnib.pdf', { type: 'application/pdf' });
    const res = await POST(makePostReq({ type: 'ID_CARD', file }) as never);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('STORAGE_NOT_CONFIGURED');
  });

  it('csrf missing returns 403', async () => {
    const { verifyCsrf } = await import('@/lib/server/auth');
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(new Response(null, { status: 403 }));
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'cnib.pdf', { type: 'application/pdf' });
    const res = await POST(makePostReq({ type: 'ID_CARD', file, csrf: false }) as never);
    expect(res.status).toBe(403);
  });

  it('no auth returns 401', async () => {
    const { requireAuth } = await import('@/lib/server/middleware');
    (requireAuth as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
    );
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'cnib.pdf', { type: 'application/pdf' });
    const res = await POST(makePostReq({ type: 'ID_CARD', file }) as never);
    expect(res.status).toBe(401);
  });

  it('upload failed (cloudinary throws) returns 502', async () => {
    const { uploadBuffer } = await import('@/lib/server/upload/cloudinary-client');
    (uploadBuffer as unknown as Mock).mockImplementationOnce(async () => {
      throw new Error('Cloudinary down');
    });
    const { POST } = await import('./route');
    const file = new File([PDF_BYTES], 'cnib.pdf', { type: 'application/pdf' });
    const res = await POST(makePostReq({ type: 'ID_CARD', file }) as never);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('UPLOAD_FAILED');
  });
});
