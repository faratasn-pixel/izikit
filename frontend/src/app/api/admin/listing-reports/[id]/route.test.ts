// ADMIN-LISTING-REPORTS-02 — PATCH /api/admin/listing-reports/[id] tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({
  requireAdmin: vi.fn(),
}));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { PATCH } from './route';
import { seedAdmin } from '@/test-utils/admin-fixtures';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRateLimit = vi.mocked(enforceAdminRateLimit);

const adminUser = seedAdmin({ id: 'admin_1', email: 'admin@test.local' });
const adminCtx = {
  user: { sub: adminUser.id, email: adminUser.email },
  admin: { id: adminUser.id, email: adminUser.email, role: 'ADMIN' as const },
};

function makePatch(
  id: string,
  body: unknown,
): { req: NextRequest; ctx: { params: Promise<{ id: string }> } } {
  return {
    req: new NextRequest(`http://test/api/admin/listing-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(adminCtx);
  mockRateLimit.mockResolvedValue(null);
  prismaMock.listingReport.findUnique.mockResolvedValue({ id: 'r1', status: 'PENDING' } as never);
  prismaMock.listingReport.update.mockResolvedValue({ id: 'r1', status: 'DISMISSED' } as never);
  prismaMock.adminAction.create.mockResolvedValue({} as never);
});

describe('PATCH /api/admin/listing-reports/[id]', () => {
  it('404s when the report does not exist', async () => {
    prismaMock.listingReport.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePatch('missing', { status: 'DISMISSED' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it('400s on an invalid status', async () => {
    const { req, ctx } = makePatch('r1', { status: 'NOPE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('updates the status and logs an admin action', async () => {
    const { req, ctx } = makePatch('r1', { status: 'DISMISSED' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.listingReport.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1' }, data: { status: 'DISMISSED' } }),
    );
    expect(prismaMock.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'listing-report.resolve', targetId: 'r1' }),
      }),
    );
  });
});
