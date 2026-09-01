// GET/PATCH /api/organizations/me — tests.
// Covers: GET returns null when no org exists yet; GET returns the owned
// org; PATCH find-or-creates on first save; PATCH updates an existing org
// (incl. zones); CSRF reject; requireAuth reject; validation failure.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';

mockNextCookies();

vi.mock('@/lib/server/auth/lockout', () => ({
  isLockedOut: vi.fn().mockResolvedValue(false),
  recordFailure: vi.fn().mockResolvedValue({ count: 1, locked: false }),
  recordSuccess: vi.fn().mockResolvedValue(undefined),
}));

import { CSRF_COOKIE_NAME, createAccessToken } from '@/lib/server/auth';
import { GET, PATCH } from './route';

const CSRF_TOKEN = 'csrf-token-fixture-deadbeef';

function makeReq(opts: {
  method: 'GET' | 'PATCH';
  bearer?: string;
  body?: unknown;
  csrf?: string | null;
  csrfCookieValue?: string | null;
}): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  if (opts.csrf !== null && opts.csrf !== undefined) headers['x-csrf-token'] = opts.csrf;
  if (opts.csrfCookieValue !== null && opts.csrfCookieValue !== undefined) {
    headers.cookie = `${CSRF_COOKIE_NAME}=${opts.csrfCookieValue}`;
  }
  return new NextRequest('https://test/api/organizations/me', {
    method: opts.method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

let validToken: string;

beforeEach(async () => {
  validToken = await createAccessToken({
    sub: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  });
  // requireAuth's own tokenVersion re-check.
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  } as never);
});

describe('GET /api/organizations/me', () => {
  it('returns organization: null when the caller owns none yet', async () => {
    prismaMock.organization.findFirst.mockResolvedValue(null);

    const res = await GET(makeReq({ method: 'GET', bearer: validToken }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ organization: null });
  });

  it('returns the organization owned by the caller', async () => {
    prismaMock.organization.findFirst.mockResolvedValue({
      id: 'org_1',
      slug: 'mon-agence',
      name: 'AfrikImmo',
      zones: [],
    } as never);

    const res = await GET(makeReq({ method: 'GET', bearer: validToken }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organization).toMatchObject({ id: 'org_1', name: 'AfrikImmo' });
  });

  it('missing token returns 401', async () => {
    const res = await GET(makeReq({ method: 'GET' }));
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/organizations/me', () => {
  it('find-or-creates the organization on first save', async () => {
    prismaMock.organization.findFirst.mockResolvedValueOnce(null); // no existing org
    prismaMock.organization.create.mockResolvedValue({ id: 'org_new' } as never);
    prismaMock.organization.findUniqueOrThrow.mockResolvedValue({ id: 'org_new' } as never);
    prismaMock.organization.update.mockResolvedValue({
      id: 'org_new',
      slug: 'afrikimmo',
      name: 'AfrikImmo',
      zones: [],
    } as never);

    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        bearer: validToken,
        body: { name: 'AfrikImmo' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.organization.create).toHaveBeenCalledTimes(1);
    const createArg = prismaMock.organization.create.mock.calls[0]![0];
    expect(createArg.data).toMatchObject({
      ownerId: 'user_1',
      name: 'AfrikImmo',
      members: { create: { userId: 'user_1', role: 'OWNER' } },
    });
    expect(prismaMock.organization.update).toHaveBeenCalledWith({
      where: { id: 'org_new' },
      data: { name: 'AfrikImmo' },
      select: expect.any(Object),
    });
  });

  it('updates an existing organization (incl. zones), no create call', async () => {
    prismaMock.organization.findFirst.mockResolvedValue({ id: 'org_1' } as never);
    prismaMock.organization.update.mockResolvedValue({
      id: 'org_1',
      slug: 'afrikimmo',
      name: 'AfrikImmo',
      zones: [{ country: 'Bénin', cities: ['Cotonou'] }],
    } as never);

    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        bearer: validToken,
        body: { zones: [{ country: 'Bénin', cities: ['Cotonou'] }] },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.organization.create).not.toHaveBeenCalled();
    expect(prismaMock.organization.update).toHaveBeenCalledWith({
      where: { id: 'org_1' },
      data: { zones: [{ country: 'Bénin', cities: ['Cotonou'] }] },
      select: expect.any(Object),
    });
  });

  it('missing CSRF header returns 403', async () => {
    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        bearer: validToken,
        body: { name: 'X' },
        csrf: null,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(403);
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });

  it('missing token returns 401', async () => {
    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        body: { name: 'X' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(401);
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });

  it('invalid body returns VALIDATION_FAILED', async () => {
    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        bearer: validToken,
        body: { email: 'not-an-email' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'VALIDATION_FAILED' });
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });
});
