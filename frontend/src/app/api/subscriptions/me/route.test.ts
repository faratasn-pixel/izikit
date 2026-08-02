// GET /api/subscriptions/me — tests.
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

import { createAccessToken } from '@/lib/server/auth';
import { GET } from './route';

function makeReq(bearer?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  return new NextRequest('https://test/api/subscriptions/me', { method: 'GET', headers });
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

describe('GET /api/subscriptions/me', () => {
  it('returns FREE defaults when no row exists', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      subscription: {
        planKey: 'FREE',
        status: 'ACTIVE',
        currentPeriodEnd: null,
        canceledAt: null,
      },
    });
  });

  it('returns the existing subscription row', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      planKey: 'PRO_AGENT',
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-08-15'),
      canceledAt: null,
    } as never);
    const res = await GET(makeReq(validToken));
    const body = await res.json();
    expect(body.subscription.planKey).toBe('PRO_AGENT');
  });

  it('missing token returns 401', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });
});
