// PUBLIC-LISTING-INQUIRY-01 — POST /api/public/listings/[id]/inquiries tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockEnqueue = vi.fn().mockResolvedValue({ id: 'email-1' });
vi.mock('@/lib/server/queues/email-queue-singleton', () => ({
  getEmailQueue: () => ({ enqueue: mockEnqueue }),
}));

import { POST } from './route';

function makePost(
  body: unknown,
  opts: { id?: string; ip?: string } = {},
): { req: NextRequest; ctx: { params: Promise<{ id: string }> } } {
  const id = opts.id ?? 'listing-1';
  const headers: Record<string, string> = {
    'x-forwarded-for': opts.ip ?? `test-ip-${Math.random()}`,
  };
  return {
    req: new NextRequest(`http://test/api/public/listings/${id}/inquiries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

const validBody = { type: 'MESSAGE', name: 'Awa', phone: '90000000', message: 'Bonjour' };

beforeEach(() => {
  vi.clearAllMocks();
  mockEnqueue.mockResolvedValue({ id: 'email-1' });
  prismaMock.listing.findUnique.mockResolvedValue({
    id: 'listing-1',
    title: 'Villa duplex standing',
    status: 'VERIFIED',
    userId: 'owner-1',
  } as never);
  prismaMock.listingInquiry.create.mockResolvedValue({
    id: 'inquiry-1',
    listingId: 'listing-1',
    type: 'MESSAGE',
    name: 'Awa',
    phone: '90000000',
    email: null,
    message: 'Bonjour',
    createdAt: new Date(),
  } as never);
  prismaMock.notification.create.mockResolvedValue({} as never);
  prismaMock.user.findUnique.mockResolvedValue({ email: 'owner@example.com' } as never);
});

describe('POST /api/public/listings/[id]/inquiries', () => {
  it('404s when the listing does not exist or is not VERIFIED', async () => {
    prismaMock.listing.findUnique.mockResolvedValueOnce(null as never);
    const { req, ctx } = makePost(validBody);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it('400s on invalid body', async () => {
    const { req, ctx } = makePost({ type: 'MESSAGE' });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it('creates the inquiry row and returns 201', async () => {
    const { req, ctx } = makePost(validBody);
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
    expect(prismaMock.listingInquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-1',
          type: 'MESSAGE',
          name: 'Awa',
          message: 'Bonjour',
        }),
      }),
    );
  });

  it('notifies the listing owner via createNotification', async () => {
    const { req, ctx } = makePost({ ...validBody, type: 'VR_VISIT' });
    await POST(req, ctx);
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'owner-1', type: 'LISTING_INQUIRY' }),
      }),
    );
  });

  it('enqueues an email to the owner', async () => {
    const { req, ctx } = makePost(validBody);
    await POST(req, ctx);
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com' }));
  });

  it('still returns 201 when the email enqueue throws', async () => {
    mockEnqueue.mockRejectedValueOnce(new Error('brevo down'));
    const { req, ctx } = makePost(validBody);
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
  });

  it('rejects a 6th request from the same IP within the window', async () => {
    const ip = 'fixed-rate-limit-ip';
    for (let i = 0; i < 5; i++) {
      const { req, ctx } = makePost(validBody, { ip });
      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
    }
    const { req, ctx } = makePost(validBody, { ip });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });
});
