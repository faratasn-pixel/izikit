// GET /api/tokens/transactions — tests.
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

function makeReq(bearer?: string, qs = ''): NextRequest {
  const headers: Record<string, string> = {};
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  return new NextRequest(`https://test/api/tokens/transactions${qs}`, { method: 'GET', headers });
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

describe('GET /api/tokens/transactions', () => {
  it('maps rows to the DTO shape, most recent first', async () => {
    const createdAt = new Date('2026-08-02T10:00:00.000Z');
    prismaMock.tokenTransaction.findMany.mockResolvedValue([
      {
        id: 't1',
        userId: 'user_1',
        type: 'PURCHASE',
        amount: 150,
        balanceAfter: 240,
        description: 'Achat pack Standard',
        orderId: 'o1',
        createdAt,
      },
    ] as never);

    const res = await GET(makeReq(validToken));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [
        {
          id: 't1',
          date: createdAt.toISOString(),
          description: 'Achat pack Standard',
          type: 'PURCHASE',
          amount: 150,
          balance: 240,
        },
      ],
      nextCursor: null,
    });
    expect(prismaMock.tokenTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user_1' }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('scopes the query to the authenticated user', async () => {
    prismaMock.tokenTransaction.findMany.mockResolvedValue([] as never);
    await GET(makeReq(validToken));
    const call = prismaMock.tokenTransaction.findMany.mock.calls[0]?.[0];
    expect(call?.where).toMatchObject({ userId: 'user_1' });
  });
});
