// PUBLIC-PROPERTY-REQUEST-01 — POST /api/public/property-requests tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/alerts/matching', () => ({
  runMatchingForNewRequest: vi.fn().mockResolvedValue(undefined),
}));

import { POST, GET } from './route';
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

function makeGet(): NextRequest {
  return new NextRequest('http://test/api/public/property-requests');
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

describe('GET /api/public/property-requests', () => {
  function makeRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'preq-1',
      transactionType: 'VENTE',
      propertyType: 'VILLA',
      country: "Côte d'Ivoire",
      city: 'Abidjan',
      budgetMin: 80_000_000,
      budgetMax: 200_000_000,
      status: 'EN_ATTENTE',
      createdAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    };
  }

  it('returns the 6 most recent requests, newest first', async () => {
    prismaMock.propertyRequest.findMany.mockResolvedValueOnce([makeRow()] as never);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    expect(prismaMock.propertyRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
    );
  });

  it('never selects or leaks client contact info', async () => {
    prismaMock.propertyRequest.findMany.mockResolvedValueOnce([makeRow()] as never);
    const res = await GET(makeGet());
    const args = prismaMock.propertyRequest.findMany.mock.calls[0]?.[0];
    expect(args?.select).not.toHaveProperty('clientName');
    expect(args?.select).not.toHaveProperty('clientPhone');
    expect(args?.select).not.toHaveProperty('clientEmail');
    expect(args?.select).not.toHaveProperty('notes');
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/clientName|clientPhone|clientEmail/i);
  });

  it('maps rows to the flat DTO shape', async () => {
    prismaMock.propertyRequest.findMany.mockResolvedValueOnce([makeRow()] as never);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items).toEqual([
      {
        id: 'preq-1',
        transactionType: 'VENTE',
        propertyType: 'VILLA',
        country: "Côte d'Ivoire",
        city: 'Abidjan',
        budgetMin: 80_000_000,
        budgetMax: 200_000_000,
        status: 'EN_ATTENTE',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
  });

  it('returns an empty list when there are no requests yet', async () => {
    prismaMock.propertyRequest.findMany.mockResolvedValueOnce([] as never);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items).toEqual([]);
  });
});
