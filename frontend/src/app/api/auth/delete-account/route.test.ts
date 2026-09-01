// POST /api/auth/delete-account — tests.
// Covers: happy path (anonymization fields, OAuthAccount/VerificationCode
// deleted, tokenVersion bumped, cookies cleared, NOT a literal row delete),
// CSRF reject, requireAuth reject, wrong password, last-SUPERADMIN refusal,
// runtime export shape.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { prismaMock } from '@/test-utils/prisma-mock';

interface MockEntry {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}
const __cookieStore = new Map<string, MockEntry>();
const cookieMockStore = {
  get(name: string) {
    const e = __cookieStore.get(name);
    return e ? { name: e.name, value: e.value } : undefined;
  },
  set(name: string, value: string, options?: Record<string, unknown>) {
    __cookieStore.set(name, { name, value, ...(options ? { options } : {}) });
  },
  delete(name: string) {
    __cookieStore.delete(name);
  },
  has(name: string) {
    return __cookieStore.has(name);
  },
  getAll() {
    return [...__cookieStore.values()].map((e) => ({ name: e.name, value: e.value }));
  },
};
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieMockStore),
}));

vi.mock('@/lib/server/auth/lockout', () => ({
  isLockedOut: vi.fn().mockResolvedValue(false),
  recordFailure: vi.fn().mockResolvedValue({ count: 1, locked: false }),
  recordSuccess: vi.fn().mockResolvedValue(undefined),
}));

import { isLockedOut, recordFailure } from '@/lib/server/auth/lockout';
import { COOKIE_NAME, CSRF_COOKIE_NAME, createAccessToken, hashPassword } from '@/lib/server/auth';
import { POST } from './route';

const CSRF_TOKEN = 'csrf-token-fixture-deadbeef';

function buildRequest(opts: {
  body?: unknown;
  csrf?: string | null;
  csrfCookieValue?: string | null;
}): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (opts.csrf !== null && opts.csrf !== undefined) headers.set('x-csrf-token', opts.csrf);
  if (opts.csrfCookieValue !== null && opts.csrfCookieValue !== undefined) {
    headers.set('cookie', `${CSRF_COOKIE_NAME}=${opts.csrfCookieValue}`);
  }
  return new NextRequest('http://localhost/api/auth/delete-account', {
    method: 'POST',
    headers,
    body: JSON.stringify(opts.body ?? {}),
  });
}

function seedAccessCookie(token: string): void {
  cookieMockStore.set(COOKIE_NAME, token);
}

let validToken: string;
let dbHash: string;

const isLockedOutMock = vi.mocked(isLockedOut);
const recordFailureMock = vi.mocked(recordFailure);

beforeEach(async () => {
  __cookieStore.clear();
  isLockedOutMock.mockReset().mockResolvedValue(false);
  recordFailureMock.mockReset().mockResolvedValue({ count: 1, locked: false });
  validToken = await createAccessToken({
    sub: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  });
  dbHash = await hashPassword('Current-Pass-Old-2026');
  prismaMock.user.findUnique
    .mockResolvedValueOnce({
      id: 'user_1',
      email: 'user@example.com',
      tokenVersion: 0,
    } as unknown as never)
    .mockResolvedValueOnce({
      id: 'user_1',
      email: 'user@example.com',
      passwordHash: dbHash,
      role: 'USER',
      status: 'ACTIVE',
    } as unknown as never);
  prismaMock.oAuthAccount.deleteMany.mockResolvedValue({ count: 0 } as unknown as never);
  prismaMock.verificationCode.deleteMany.mockResolvedValue({ count: 0 } as unknown as never);
  prismaMock.user.update.mockResolvedValue({ id: 'user_1' } as unknown as never);
  // Array-form $transaction passthrough — the individual calls above are
  // already recorded on prismaMock regardless of $transaction's own return.
  prismaMock.$transaction.mockImplementation((arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === 'function')
      return (arg as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    return Promise.resolve(arg);
  });
});

describe('POST /api/auth/delete-account', () => {
  it('happy path — anonymizes the row, deletes OAuth/verification rows, clears cookies', async () => {
    await seedAccessCookie(validToken);
    const req = buildRequest({
      body: { currentPassword: 'Current-Pass-Old-2026' },
      csrf: CSRF_TOKEN,
      csrfCookieValue: CSRF_TOKEN,
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });

    expect(prismaMock.oAuthAccount.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
    });
    expect(prismaMock.verificationCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        email: 'deleted-user_1@deleted.invalid',
        phone: null,
        name: null,
        avatarUrl: null,
        city: null,
        country: null,
        bio: null,
        passwordHash: null,
        status: 'SUSPENDED',
        tokenVersion: { increment: 1 },
      },
    });
    // NOT a literal row delete.
    expect(prismaMock.user.delete).not.toHaveBeenCalled();

    const access = __cookieStore.get(COOKIE_NAME);
    expect(access?.value).toBe('');
  });

  it('missing CSRF header returns 403', async () => {
    await seedAccessCookie(validToken);
    const req = buildRequest({
      body: { currentPassword: 'Current-Pass-Old-2026' },
      csrf: null,
      csrfCookieValue: CSRF_TOKEN,
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('missing access cookie returns 401', async () => {
    const req = buildRequest({ csrf: CSRF_TOKEN, csrfCookieValue: CSRF_TOKEN });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('wrong password returns INVALID_CREDENTIALS, no anonymization', async () => {
    await seedAccessCookie(validToken);
    const req = buildRequest({
      body: { currentPassword: 'totally-wrong' },
      csrf: CSRF_TOKEN,
      csrfCookieValue: CSRF_TOKEN,
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'INVALID_CREDENTIALS' });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(recordFailureMock).toHaveBeenCalledWith('user@example.com');
  });

  it('sole active SUPERADMIN cannot self-delete', async () => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'admin_1',
        email: 'root@example.com',
        tokenVersion: 0,
      } as unknown as never)
      .mockResolvedValueOnce({
        id: 'admin_1',
        email: 'root@example.com',
        passwordHash: dbHash,
        role: 'SUPERADMIN',
        status: 'ACTIVE',
      } as unknown as never);
    prismaMock.user.count.mockResolvedValue(1);
    const token = await createAccessToken({
      sub: 'admin_1',
      email: 'root@example.com',
      tokenVersion: 0,
    });
    await seedAccessCookie(token);
    const req = buildRequest({
      body: { currentPassword: 'Current-Pass-Old-2026' },
      csrf: CSRF_TOKEN,
      csrfCookieValue: CSRF_TOKEN,
    });

    const res = await POST(req);

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'LAST_SUPERADMIN' });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("route file exports runtime='nodejs' and POST handler", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'route.ts'), 'utf8');
    expect(src).toMatch(/runtime\s*=\s*['"]nodejs['"]/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });
});
