// PUBLIC-PROPERTY-REQUEST-01 — POST /api/public/property-requests tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/alerts/matching', () => ({
  runMatchingForNewRequest: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from './route';
import { runMatchingForNewRequest } from '@/lib/server/alerts/matching';

function makePost(body: unknown, opts: { ip?: string } = {}): NextRequest {
  const headers: Record<string, string> = {
    'x-forwarded-for': opts.ip ?? `test-ip-${Math.random()}`,
  };
  return new NextRequest('http://test/api/public/property-requests', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const validBody = {
  transactionType: 'VENTE',
  propertyType: 'VILLA',
  country: "Côte d'Ivoire",
  city: 'Abidjan',
  financing: 'Comptant',
  delay: 'Immédiat',
  clientName: 'Awa Diop',
  clientPhone: '0700000000',
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.propertyRequest.create.mockResolvedValue({
    id: 'preq-1',
    status: 'EN_ATTENTE',
    createdAt: new Date(),
  } as never);
});

describe('POST /api/public/property-requests', () => {
  it('400s on invalid body', async () => {
    const res = await POST(makePost({ transactionType: 'VENTE' }));
    expect(res.status).toBe(400);
  });

  it('creates the request with userId=null and source="Site web"', async () => {
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
    expect(prismaMock.propertyRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          transactionType: 'VENTE',
          propertyType: 'VILLA',
          clientName: 'Awa Diop',
          source: 'Site web',
        }),
      }),
    );
  });

  it('merges surface min/max into notes and stores the min as surfaceM2', async () => {
    await POST(makePost({ ...validBody, surfaceMin: 150, surfaceMax: 350 }));
    expect(prismaMock.propertyRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          surfaceM2: 150,
          notes: expect.stringContaining('150 – 350 m²'),
        }),
      }),
    );
  });

  it('runs alert matching for the new request', async () => {
    await POST(makePost(validBody));
    expect(runMatchingForNewRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'preq-1', userId: null }),
    );
  });

  it('still returns 201 when matching throws', async () => {
    vi.mocked(runMatchingForNewRequest).mockRejectedValueOnce(new Error('matching down'));
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
  });

  it('rejects a 6th request from the same IP within the window', async () => {
    const ip = 'fixed-rate-limit-ip-property-request';
    for (let i = 0; i < 5; i++) {
      const res = await POST(makePost(validBody, { ip }));
      expect(res.status).toBe(201);
    }
    const res = await POST(makePost(validBody, { ip }));
    expect(res.status).toBe(429);
  });
});
