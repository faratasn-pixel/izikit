// VISITS-01/02 — GET /api/visits, POST /api/visits tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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
import { GET, POST } from './route';

const mockRequireAuth = vi.mocked(requireAuth);
const authedCtx = { user: { sub: 'user-1', email: 'me@example.com' } };

function makeGet(qs = ''): NextRequest {
  return new NextRequest(`http://test/api/visits${qs}`, { method: 'GET' });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest('http://test/api/visits', {
    method: 'POST',
    headers: { 'x-csrf-token': 'test-csrf' },
    body: JSON.stringify(body),
  });
}

function makeVisit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    scheduledAt: new Date('2026-08-25T09:30:00Z'),
    type: 'PRESENTIEL',
    status: 'EN_ATTENTE',
    notes: null,
    createdAt: new Date('2026-08-20T09:14:00Z'),
    inquiry: {
      id: 'i1',
      name: 'Amavi Kodjovi',
      phone: '+228 90 34 12 78',
      email: 'amavi.k@gmail.com',
      listing: {
        id: 'l1',
        title: 'Villa F4',
        city: 'Lomé',
        country: 'Togo',
        propertyType: 'VILLA',
        transactionType: 'VENTE',
        price: 85_000_000,
        currency: 'XOF',
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  __cookieStore.clear();
  mockRequireAuth.mockResolvedValue(authedCtx);
  prismaMock.visit.count.mockResolvedValue(0 as never);
  prismaMock.visit.findMany.mockResolvedValue([] as never);
});

describe('GET /api/visits', () => {
  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect(prismaMock.visit.findMany).not.toHaveBeenCalled();
  });

  it('scopes the query to the authenticated user via inquiry.listing', async () => {
    await GET(makeGet());
    const args = prismaMock.visit.findMany.mock.calls[0]?.[0];
    expect(args?.where?.inquiry).toMatchObject({ listing: { userId: 'user-1' } });
    for (const call of prismaMock.visit.count.mock.calls) {
      expect(call[0]?.where?.inquiry).toMatchObject({ listing: { userId: 'user-1' } });
    }
  });

  it('returns items with the joined inquiry/listing fields', async () => {
    prismaMock.visit.findMany.mockResolvedValue([makeVisit()] as never);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: 'v1',
      status: 'EN_ATTENTE',
      inquiry: { name: 'Amavi Kodjovi', listing: { title: 'Villa F4' } },
    });
  });

  it('emits a nextCursor when more rows exist than the limit', async () => {
    prismaMock.visit.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, i) => makeVisit({ id: `v${i}` })) as never,
    );
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.items).toHaveLength(20);
    expect(body.nextCursor).toBeTruthy();
  });

  it('applies ?search= as a case-insensitive OR on inquiry.name / listing.title', async () => {
    await GET(makeGet('?search=villa'));
    const args = prismaMock.visit.findMany.mock.calls[0]?.[0];
    expect(args?.where?.OR).toEqual([
      { inquiry: { name: { contains: 'villa', mode: 'insensitive' } } },
      { inquiry: { listing: { title: { contains: 'villa', mode: 'insensitive' } } } },
    ]);
  });

  it('applies ?status= when it is a valid status', async () => {
    await GET(makeGet('?status=CONFIRMEE'));
    const args = prismaMock.visit.findMany.mock.calls[0]?.[0];
    expect(args?.where?.status).toBe('CONFIRMEE');
  });

  it('ignores an invalid ?status=', async () => {
    await GET(makeGet('?status=NOPE'));
    const args = prismaMock.visit.findMany.mock.calls[0]?.[0];
    expect(args?.where?.status).toBeUndefined();
  });

  it('computes monthly stats from count queries scoped to the same user', async () => {
    prismaMock.visit.count
      .mockResolvedValueOnce(24 as never) // total
      .mockResolvedValueOnce(17 as never) // confirmees
      .mockResolvedValueOnce(5 as never) // enAttente
      .mockResolvedValueOnce(2 as never); // annulees
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.stats).toEqual({ total: 24, confirmees: 17, enAttente: 5, annulees: 2 });
  });

  it('response includes x-request-id header', async () => {
    const res = await GET(makeGet());
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});

describe('POST /api/visits', () => {
  const eligibleInquiry = {
    id: 'i1',
    listing: { userId: 'user-1' },
    visit: null,
  };

  beforeEach(() => {
    prismaMock.listingInquiry.findUnique.mockResolvedValue(eligibleInquiry as never);
    prismaMock.$transaction.mockImplementation((async (cb: unknown) => {
      const tx = {
        visit: { create: vi.fn().mockResolvedValue(makeVisit()) },
        listingInquiry: { update: vi.fn().mockResolvedValue({}) },
      };
      return (cb as (t: typeof tx) => unknown)(tx);
    }) as never);
  });

  it('returns 401 when requireAuth bails', async () => {
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    );
    const res = await POST(makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z' }));
    expect(res.status).toBe(401);
  });

  it('csrf missing returns 403', async () => {
    (verifyCsrf as unknown as Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF' }, { status: 403 }),
    );
    const res = await POST(makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z' }));
    expect(res.status).toBe(403);
  });

  it('400s on an invalid body', async () => {
    const res = await POST(makePost({ inquiryId: 'i1' }));
    expect(res.status).toBe(400);
  });

  it('404s when the inquiry does not exist', async () => {
    prismaMock.listingInquiry.findUnique.mockResolvedValueOnce(null as never);
    const res = await POST(
      makePost({ inquiryId: 'missing', scheduledAt: '2026-08-25T09:30:00.000Z' }),
    );
    expect(res.status).toBe(404);
  });

  it('404s when the inquiry belongs to another user (not 403)', async () => {
    prismaMock.listingInquiry.findUnique.mockResolvedValueOnce({
      id: 'i1',
      listing: { userId: 'someone-else' },
      visit: null,
    } as never);
    const res = await POST(makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z' }));
    expect(res.status).toBe(404);
  });

  it('409s when the inquiry already has a visit', async () => {
    prismaMock.listingInquiry.findUnique.mockResolvedValueOnce({
      id: 'i1',
      listing: { userId: 'user-1' },
      visit: { id: 'v-existing' },
    } as never);
    const res = await POST(makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('VISIT_ALREADY_EXISTS');
  });

  it('creates the visit and flips the inquiry status to VISITE_PLANIFIEE in one transaction', async () => {
    let updateArgs: unknown;
    let createArgs: unknown;
    prismaMock.$transaction.mockImplementationOnce((async (cb: unknown) => {
      const tx = {
        visit: {
          create: vi.fn().mockImplementation((args: unknown) => {
            createArgs = args;
            return Promise.resolve(makeVisit());
          }),
        },
        listingInquiry: {
          update: vi.fn().mockImplementation((args: unknown) => {
            updateArgs = args;
            return Promise.resolve({});
          }),
        },
      };
      return (cb as (t: typeof tx) => unknown)(tx);
    }) as never);

    const res = await POST(
      makePost({ inquiryId: 'i1', scheduledAt: '2026-08-25T09:30:00.000Z', type: 'VIRTUELLE' }),
    );
    expect(res.status).toBe(201);
    expect(createArgs).toMatchObject({ data: { inquiryId: 'i1', type: 'VIRTUELLE' } });
    expect(updateArgs).toMatchObject({ where: { id: 'i1' }, data: { status: 'VISITE_PLANIFIEE' } });
  });
});

describe('source invariants', () => {
  it("route source contains runtime='nodejs' and withRequestContext", () => {
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    expect(src).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
    expect(src).toContain('withRequestContext');
  });
});
