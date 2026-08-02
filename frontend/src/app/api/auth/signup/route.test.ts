// AUTH-01 — POST /api/auth/signup tests.
// Pattern: D-25 mock Prisma + module-level vi.mock (Pitfall 11).
// prismaMock import MUST come first so the vi.mock auto-hoists above route imports.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';

// Outbox + dummy-bcrypt mocks installed at module level so they hoist above
// the route's imports.
vi.mock('@/lib/server/outbox', () => ({
  enqueueOutbox: vi.fn().mockResolvedValue({ id: 'outbox-1' }),
}));
vi.mock('@/lib/server/auth/dummy-bcrypt', () => ({
  dummyBcryptCompare: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server/auth/hibp', () => ({
  isPwned: vi.fn().mockResolvedValue(false),
}));

import { POST } from './route';
import { dummyBcryptCompare } from '@/lib/server/auth/dummy-bcrypt';
import { isPwned } from '@/lib/server/auth/hibp';
import { enqueueOutbox } from '@/lib/server/outbox';

function makeReq(body: unknown): NextRequest {
  // Build init inline so optional fields (body) aren't typed as `T | undefined`,
  // which trips Next.js's RequestInit under exactOptionalPropertyTypes.
  return body === undefined
    ? new NextRequest('http://test/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
    : new NextRequest('http://test/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default $transaction passes the prismaMock as `tx` so writes within the
  // callback hit the same mocks as the outer client (mockDeep proxies them).
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
});

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Kofi',
    lastName: 'Mensah',
    email: 'new@example.com',
    phone: '+22967000000',
    password: 'a-strong-passphrase',
    accountType: 'TENANT_BUYER',
    ...overrides,
  };
}

describe('POST /api/auth/signup', () => {
  it('creates a new user, code, and outbox event for genuinely new emails', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'u-new' } as never);
    prismaMock.verificationCode.create.mockResolvedValue({} as never);

    const res = await POST(makeReq(baseBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ok: true });

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    const createArg = prismaMock.user.create.mock.calls[0]?.[0];
    expect(createArg?.data).toMatchObject({
      email: 'new@example.com',
      phone: '+22967000000',
      name: 'Kofi Mensah',
      accountType: 'TENANT_BUYER',
    });
    expect(prismaMock.verificationCode.create).toHaveBeenCalledTimes(1);
    const codeArg = prismaMock.verificationCode.create.mock.calls[0]?.[0];
    expect(codeArg?.data?.type).toBe('EMAIL_VERIFY');

    expect(enqueueOutbox).toHaveBeenCalledTimes(1);
    const outboxArg = (enqueueOutbox as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(outboxArg?.kind).toBe('email.verification_code');
    expect(outboxArg?.payload?.to).toBe('new@example.com');
  });

  it('returns identical 201 + dummy-bcrypts on existing email (enumeration-resist)', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'u-existing' } as never);

    const res = await POST(makeReq(baseBody({ email: 'existing@example.com' })));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ok: true });

    expect(dummyBcryptCompare).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.verificationCode.create).not.toHaveBeenCalled();
    expect(enqueueOutbox).not.toHaveBeenCalled();
  });

  it('returns identical 201 + dummy-bcrypts on existing phone (enumeration-resist)', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'u-existing' } as never);

    const res = await POST(makeReq(baseBody({ phone: '+22967000099' })));
    expect(res.status).toBe(201);
    expect(dummyBcryptCompare).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('rejects banned passwords with PASSWORD_BANNED before user lookup', async () => {
    const res = await POST(makeReq(baseBody({ password: 'password' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('PASSWORD_BANNED');
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it('rejects too-short passwords with PASSWORD_TOO_SHORT', async () => {
    const res = await POST(makeReq(baseBody({ password: 'short' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('PASSWORD_TOO_SHORT');
    expect(body.message).toContain('10');
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_FAILED for malformed email', async () => {
    const res = await POST(makeReq(baseBody({ email: 'not-an-email' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION_FAILED');
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it('returns VALIDATION_FAILED for malformed phone', async () => {
    const res = await POST(makeReq(baseBody({ phone: 'not-a-phone' })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION_FAILED');
  });

  it('returns 429 TOO_MANY_SIGNUP_ATTEMPTS when the per-email limit is hit', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'u-rate' } as never);
    prismaMock.verificationCode.create.mockResolvedValue({} as never);

    const calls = await Promise.all(
      Array.from({ length: 6 }, () =>
        POST(makeReq(baseBody({ email: 'rate-target@example.com' }))),
      ),
    );
    const statuses = calls.map((r) => r.status);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(1);
    const limited = calls.find((r) => r.status === 429)!;
    const body = await limited.json();
    expect(body.error).toBe('TOO_MANY_SIGNUP_ATTEMPTS');
  });

  it('rejects pwned passwords with PASSWORD_PWNED when PASSWORD_HIBP_CHECK=1', async () => {
    vi.stubEnv('PASSWORD_HIBP_CHECK', '1');
    (isPwned as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    try {
      const res = await POST(
        makeReq(baseBody({ email: 'hibp@example.com', password: 'a-very-unique-passphrase-1234' })),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('PASSWORD_PWNED');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("source exports runtime = 'nodejs' (Phase 0 guard)", () => {
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    expect(src).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
  });
});
