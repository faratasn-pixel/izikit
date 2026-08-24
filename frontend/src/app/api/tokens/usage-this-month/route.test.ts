// GET /api/tokens/usage-this-month — tests.
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
  return new NextRequest('https://test/api/tokens/usage-this-month', { method: 'GET', headers });
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

describe('GET /api/tokens/usage-this-month', () => {
  it('returns 0 when no usage rows exist this month', async () => {
    prismaMock.tokenTransaction.aggregate.mockResolvedValue({
      _sum: { amount: null },
    } as never);
    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ used: 0 });
  });

  it('returns the absolute value of the summed USAGE amount', async () => {
    prismaMock.tokenTransaction.aggregate.mockResolvedValue({
      _sum: { amount: -60 },
    } as never);
    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ used: 60 });
  });
});
