// POST /api/subscriptions/change-plan — tests.
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
  return new NextRequest('https://test/api/subscriptions/change-plan', {
    method: 'POST',
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
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  } as never);
});

describe('POST /api/subscriptions/change-plan', () => {
  it('downgrades to FREE immediately (no charge)', async () => {
    prismaMock.subscription.upsert.mockResolvedValue({
      planKey: 'FREE',
      status: 'ACTIVE',
      currentPeriodEnd: null,
      canceledAt: null,
    } as never);

    const res = await POST(
      makeReq({
        bearer: validToken,
        body: { planKey: 'FREE' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscription.planKey).toBe('FREE');
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_1' },
        update: expect.objectContaining({ planKey: 'FREE' }),
      }),
    );
  });

  it('rejects a paid target with UPGRADE_REQUIRES_PAYMENT', async () => {
    const res = await POST(
      makeReq({
        bearer: validToken,
        body: { planKey: 'PRO_AGENT' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('UPGRADE_REQUIRES_PAYMENT');
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it('invalid planKey returns VALIDATION_FAILED', async () => {
    const res = await POST(
      makeReq({
        bearer: validToken,
        body: { planKey: 'NOT_A_PLAN' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION_FAILED');
  });

  it('missing CSRF header returns 403', async () => {
    const res = await POST(
      makeReq({
        bearer: validToken,
        body: { planKey: 'FREE' },
        csrf: null,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(403);
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it('missing token returns 401', async () => {
    const res = await POST(
      makeReq({
        body: { planKey: 'FREE' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(401);
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });
});
