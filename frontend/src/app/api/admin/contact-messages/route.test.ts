// ADMIN-CONTACT-MESSAGES-01 — GET /api/admin/contact-messages tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({
  requireAdmin: vi.fn(),
}));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { GET } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);

const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makeGet(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
  prismaMock.contactMessage.findMany.mockResolvedValue([] as never);
});

describe('GET /api/admin/contact-messages', () => {
  it('applies the status filter when provided', async () => {
    await GET(makeGet('http://test/api/admin/contact-messages?status=NEW'));
    expect(prismaMock.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'NEW' }) }),
    );
  });

  it('returns items + nextCursor', async () => {
    prismaMock.contactMessage.findMany.mockResolvedValueOnce([
      {
        id: 'c1',
        firstName: 'Awa',
        lastName: 'Diop',
        email: 'awa@example.com',
        phone: null,
        country: null,
        subject: 'GENERAL',
        message: 'Bonjour',
        status: 'NEW',
        createdAt: new Date('2026-08-01T00:00:00Z'),
      },
    ] as never);
    const res = await GET(makeGet('http://test/api/admin/contact-messages'));
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.nextCursor).toBeNull();
  });

  it('propagates 403 from requireAdmin without a DB hit', async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 }),
    );
    const res = await GET(makeGet('http://test/api/admin/contact-messages'));
    expect(res.status).toBe(403);
    expect(prismaMock.contactMessage.findMany).not.toHaveBeenCalled();
  });

  it('propagates 429 from the rate limiter without a DB hit', async () => {
    mockRateLimit.mockResolvedValueOnce(
      NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 }),
    );
    const res = await GET(makeGet('http://test/api/admin/contact-messages'));
    expect(res.status).toBe(429);
    expect(prismaMock.contactMessage.findMany).not.toHaveBeenCalled();
  });
});
