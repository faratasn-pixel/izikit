// ADMIN-CONTACT-MESSAGES-02 — PATCH /api/admin/contact-messages/[id] tests.
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
    req: new NextRequest(`http://test/api/admin/contact-messages/${id}`, {
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
  prismaMock.contactMessage.findUnique.mockResolvedValue({ id: 'c1', status: 'NEW' } as never);
  prismaMock.contactMessage.update.mockResolvedValue({ id: 'c1', status: 'ARCHIVED' } as never);
  prismaMock.adminAction.create.mockResolvedValue({} as never);
});

describe('PATCH /api/admin/contact-messages/[id]', () => {
  it('404s when the message does not exist', async () => {
    prismaMock.contactMessage.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePatch('missing', { status: 'ARCHIVED' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it('400s on an invalid status', async () => {
    const { req, ctx } = makePatch('c1', { status: 'NOPE' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('updates the status and logs an admin action', async () => {
    const { req, ctx } = makePatch('c1', { status: 'ARCHIVED' });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.contactMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' }, data: { status: 'ARCHIVED' } }),
    );
    expect(prismaMock.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'contact-message.resolve', targetId: 'c1' }),
      }),
    );
  });
});
