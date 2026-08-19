// PUBLIC-CONTACT-01 — POST /api/public/contact tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockEnqueue = vi.fn().mockResolvedValue({ id: 'email-1' });
vi.mock('@/lib/server/queues/email-queue-singleton', () => ({
  getEmailQueue: () => ({ enqueue: mockEnqueue }),
}));

import { POST } from './route';

function makePost(body: unknown, opts: { ip?: string } = {}): NextRequest {
  const headers: Record<string, string> = {
    'x-forwarded-for': opts.ip ?? `test-ip-${Math.random()}`,
  };
  return new NextRequest('http://test/api/public/contact', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const validBody = {
  firstName: 'Awa',
  lastName: 'Diop',
  email: 'awa@example.com',
  subject: 'GENERAL',
  message: 'Bonjour, question sur vos services.',
};

const originalInboxEmail = process.env.CONTACT_INBOX_EMAIL;

beforeEach(() => {
  vi.clearAllMocks();
  mockEnqueue.mockResolvedValue({ id: 'email-1' });
  process.env.CONTACT_INBOX_EMAIL = 'inbox@example.com';
  prismaMock.contactMessage.create.mockResolvedValue({
    id: 'contact-1',
    firstName: 'Awa',
    lastName: 'Diop',
    email: 'awa@example.com',
    phone: null,
    country: null,
    subject: 'GENERAL',
    message: 'Bonjour, question sur vos services.',
    status: 'NEW',
    createdAt: new Date(),
  } as never);
});

afterEach(() => {
  if (originalInboxEmail === undefined) delete process.env.CONTACT_INBOX_EMAIL;
  else process.env.CONTACT_INBOX_EMAIL = originalInboxEmail;
});

describe('POST /api/public/contact', () => {
  it('400s on invalid body', async () => {
    const res = await POST(makePost({ firstName: 'Awa' }));
    expect(res.status).toBe(400);
  });

  it('creates the contact message row and returns 201', async () => {
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
    expect(prismaMock.contactMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Awa',
          lastName: 'Diop',
          email: 'awa@example.com',
          subject: 'GENERAL',
          message: 'Bonjour, question sur vos services.',
        }),
      }),
    );
  });

  it('omits phone/country from the create payload when absent', async () => {
    await POST(makePost(validBody));
    const call = prismaMock.contactMessage.create.mock.calls[0]?.[0];
    expect(call?.data).not.toHaveProperty('phone');
    expect(call?.data).not.toHaveProperty('country');
  });

  it('includes phone/country when provided', async () => {
    await POST(makePost({ ...validBody, phone: '90000000', country: 'Bénin' }));
    expect(prismaMock.contactMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: '90000000', country: 'Bénin' }),
      }),
    );
  });

  it('enqueues an email to CONTACT_INBOX_EMAIL when set', async () => {
    await POST(makePost(validBody));
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'inbox@example.com' }));
  });

  it('still returns 201 when CONTACT_INBOX_EMAIL is unset', async () => {
    delete process.env.CONTACT_INBOX_EMAIL;
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('still returns 201 when the email enqueue throws', async () => {
    mockEnqueue.mockRejectedValueOnce(new Error('brevo down'));
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
  });

  it('rejects a 6th request from the same IP within the window', async () => {
    const ip = 'fixed-rate-limit-ip-contact';
    for (let i = 0; i < 5; i++) {
      const res = await POST(makePost(validBody, { ip }));
      expect(res.status).toBe(201);
    }
    const res = await POST(makePost(validBody, { ip }));
    expect(res.status).toBe(429);
  });
});
