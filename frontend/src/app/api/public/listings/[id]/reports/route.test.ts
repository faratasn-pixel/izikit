// PUBLIC-LISTING-REPORT-01 — POST /api/public/listings/[id]/reports tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function makePost(
  body: unknown,
  opts: { id?: string; ip?: string } = {},
): { req: NextRequest; ctx: { params: Promise<{ id: string }> } } {
  const id = opts.id ?? 'listing-1';
  const headers: Record<string, string> = {
    'x-forwarded-for': opts.ip ?? `test-ip-${Math.random()}`,
  };
  return {
    req: new NextRequest(`http://test/api/public/listings/${id}/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

const validBody = { reason: 'FAKE' };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.listing.findUnique.mockResolvedValue({ id: 'listing-1', status: 'VERIFIED' } as never);
  prismaMock.listingReport.create.mockResolvedValue({
    id: 'report-1',
    listingId: 'listing-1',
    reason: 'FAKE',
    detail: null,
    status: 'PENDING',
    createdAt: new Date(),
  } as never);
});

describe('POST /api/public/listings/[id]/reports', () => {
  it('404s when the listing does not exist or is not VERIFIED', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePost(validBody);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it('400s on an invalid reason', async () => {
    const { req, ctx } = makePost({ reason: 'NOPE' });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it('creates the report row and returns 201', async () => {
    const { req, ctx } = makePost({ reason: 'SCAM', detail: 'Semble frauduleux' });
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
    expect(prismaMock.listingReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          reason: 'SCAM',
          detail: 'Semble frauduleux',
        }),
      }),
    );
  });

  it('rejects a 6th request from the same IP within the window', async () => {
    const ip = 'fixed-rate-limit-ip-reports';
    for (let i = 0; i < 5; i++) {
      const { req, ctx } = makePost(validBody, { ip });
      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
    }
    const { req, ctx } = makePost(validBody, { ip });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });
});
