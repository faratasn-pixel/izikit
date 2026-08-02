// POST /api/subscriptions/cancel — tests.
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
import { POST } from './route';

const CSRF_TOKEN = 'csrf-token-fixture-deadbeef';

function makeReq(opts: {
  bearer?: string;
  csrf?: string | null;
  csrfCookieValue?: string | null;
}): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  if (opts.csrf !== null && opts.csrf !== undefined) headers['x-csrf-token'] = opts.csrf;
  if (opts.csrfCookieValue !== null && opts.csrfCookieValue !== undefined) {
    headers.cookie = `${CSRF_COOKIE_NAME}=${opts.csrfCookieValue}`;
  }
  return new NextRequest('https://test/api/subscriptions/cancel', { method: 'POST', headers });
}

let validToken: string;

beforeEach(async () => {
  validToken = await createAccessToken({
    sub: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  } as never);
});

describe('POST /api/subscriptions/cancel', () => {
  it('cancels an active paid subscription', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      planKey: 'PRO_AGENT',
      status: 'ACTIVE',
    } as never);
    prismaMock.subscription.update.mockResolvedValue({
      planKey: 'PRO_AGENT',
      status: 'CANCELED',
      currentPeriodEnd: new Date('2026-08-15'),
      canceledAt: new Date(),
    } as never);

    const res = await POST(
      makeReq({ bearer: validToken, csrf: CSRF_TOKEN, csrfCookieValue: CSRF_TOKEN }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscription.status).toBe('CANCELED');
  });

  it('no subscription row returns NO_ACTIVE_SUBSCRIPTION', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    const res = await POST(
      makeReq({ bearer: validToken, csrf: CSRF_TOKEN, csrfCookieValue: CSRF_TOKEN }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('NO_ACTIVE_SUBSCRIPTION');
  });

  it('FREE plan returns NO_ACTIVE_SUBSCRIPTION', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      planKey: 'FREE',
      status: 'ACTIVE',
    } as never);
    const res = await POST(
      makeReq({ bearer: validToken, csrf: CSRF_TOKEN, csrfCookieValue: CSRF_TOKEN }),
    );
    expect(res.status).toBe(400);
  });

  it('already CANCELED returns NO_ACTIVE_SUBSCRIPTION', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      planKey: 'PRO_AGENT',
      status: 'CANCELED',
    } as never);
    const res = await POST(
      makeReq({ bearer: validToken, csrf: CSRF_TOKEN, csrfCookieValue: CSRF_TOKEN }),
    );
    expect(res.status).toBe(400);
  });

  it('missing CSRF header returns 403', async () => {
    const res = await POST(
      makeReq({ bearer: validToken, csrf: null, csrfCookieValue: CSRF_TOKEN }),
    );
    expect(res.status).toBe(403);
  });

  it('missing token returns 401', async () => {
    const res = await POST(makeReq({ csrf: CSRF_TOKEN, csrfCookieValue: CSRF_TOKEN }));
    expect(res.status).toBe(401);
  });
});
