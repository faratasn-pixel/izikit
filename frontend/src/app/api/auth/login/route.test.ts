// Tests for POST /api/auth/login (AUTH-02 + AUTH-10 lockout integration).
// Order: prisma-mock + cookie-mock at module level so vi.mock auto-hoists
// above any module that imports `@/lib/server/prisma` or `next/headers`.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';

mockNextCookies();

// Mock lockout module so we can drive isLockedOut/recordFailure/recordSuccess.
vi.mock('@/lib/server/auth/lockout', () => ({
  isLockedOut: vi.fn(),
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
}));

// Mock dummy-bcrypt so we can assert it's called on the no-user branch.
vi.mock('@/lib/server/auth/dummy-bcrypt', () => ({
  dummyBcryptCompare: vi.fn().mockResolvedValue(undefined),
}));

// Mock verifyPassword from auth.ts to avoid running real bcrypt in tests.
vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return {
    ...actual,
    verifyPassword: vi.fn(),
  };
});

import { isLockedOut, recordFailure, recordSuccess } from '@/lib/server/auth/lockout';
import { dummyBcryptCompare } from '@/lib/server/auth/dummy-bcrypt';
import { verifyPassword } from '@/lib/server/auth';
import { POST } from './route';
import { NextRequest } from 'next/server';

function makeReq(body: unknown): NextRequest {
  return new NextRequest('https://test/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __cookieStore.clear();
  vi.mocked(isLockedOut).mockReset();
  vi.mocked(recordFailure).mockReset();
  vi.mocked(recordSuccess).mockReset();
  vi.mocked(dummyBcryptCompare).mockReset();
  vi.mocked(verifyPassword).mockReset();
  vi.mocked(isLockedOut).mockResolvedValue(false);
  vi.mocked(recordFailure).mockResolvedValue({ count: 1, locked: false });
  vi.mocked(recordSuccess).mockResolvedValue(undefined);
  vi.mocked(dummyBcryptCompare).mockResolvedValue(undefined);
  vi.mocked(verifyPassword).mockResolvedValue(false);
});

describe('POST /api/auth/login', () => {
  it('Test 1: happy path — issues 3 cookies and returns user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: '$2a$12$hashhashhashhashhashhashhashhashhashhashhashhashhashhha',
      emailVerifiedAt: new Date(),
      tokenVersion: 0,
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const res = await POST(makeReq({ email: 'a@b.com', password: 'longenough' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, user: { sub: 'u1', email: 'a@b.com' } });
    expect(recordSuccess).toHaveBeenCalledWith('a@b.com');
    expect(__cookieStore.has('app-token')).toBe(true);
    expect(__cookieStore.has('app-refresh')).toBe(true);
    expect(__cookieStore.has('app-csrf')).toBe(true);
  });

  it('Test 2: no user — INVALID_CREDENTIALS, dummy compare called, no recordFailure', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await POST(makeReq({ email: 'nobody@b.com', password: 'longenough' }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_CREDENTIALS');
    expect(dummyBcryptCompare).toHaveBeenCalledWith('longenough');
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it('Test 3: wrong password — INVALID_CREDENTIALS + recordFailure called', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: '$2a$12$hashhashhashhashhashhashhashhashhashhashhashhashhashhha',
      emailVerifiedAt: new Date(),
      tokenVersion: 0,
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);
    vi.mocked(recordFailure).mockResolvedValue({ count: 1, locked: false });

    const res = await POST(makeReq({ email: 'a@b.com', password: 'wrong' }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_CREDENTIALS');
    expect(recordFailure).toHaveBeenCalledWith('a@b.com');
  });

  it('Test 4: lockout already active — 423 LOCKED_OUT, no bcrypt', async () => {
    vi.mocked(isLockedOut).mockResolvedValue(true);

    const res = await POST(makeReq({ email: 'a@b.com', password: 'whatever' }));

    expect(res.status).toBe(423);
    expect((await res.json()).error).toBe('LOCKED_OUT');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('Test 5: 5th wrong password triggers lockout — 423 LOCKED_OUT', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: '$2a$12$hashhashhashhashhashhashhashhashhashhashhashhashhashhha',
      emailVerifiedAt: new Date(),
      tokenVersion: 0,
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);
    vi.mocked(recordFailure).mockResolvedValue({ count: 5, locked: true });

    const res = await POST(makeReq({ email: 'a@b.com', password: 'wrong' }));

    expect(res.status).toBe(423);
    expect((await res.json()).error).toBe('LOCKED_OUT');
  });

  it('Test 6: EMAIL_NOT_VERIFIED — credentials valid but emailVerifiedAt is null', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: '$2a$12$hashhashhashhashhashhashhashhashhashhashhashhashhashhha',
      emailVerifiedAt: null,
      tokenVersion: 0,
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const res = await POST(makeReq({ email: 'a@b.com', password: 'longenough' }));

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('EMAIL_NOT_VERIFIED');
    expect(recordSuccess).not.toHaveBeenCalled();
    expect(__cookieStore.has('app-token')).toBe(false);
  });

  it('Test 7: per-identifier rate limit — 11th attempt returns 429 TOO_MANY_LOGIN_ATTEMPTS', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    let last: Response | undefined;
    // D-08 default = 10/15m. The 11th attempt must be 429.
    for (let i = 0; i < 11; i++) {
      last = await POST(makeReq({ email: 'rate@b.com', password: 'longenough' }));
    }
    expect(last?.status).toBe(429);
    expect((await last!.json()).error).toBe('TOO_MANY_LOGIN_ATTEMPTS');
  });

  it('Test 8: VALIDATION_FAILED — missing password', async () => {
    const res = await POST(makeReq({ email: 'a@b.com' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('VALIDATION_FAILED');
  });

  it('Test 8b: VALIDATION_FAILED — malformed email', async () => {
    const res = await POST(makeReq({ email: 'not-an-email', password: 'longenough' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('VALIDATION_FAILED');
  });

  it('Test 9 (D-ADMIN-02): SUSPENDED user with valid credentials — 403 ACCOUNT_SUSPENDED, no cookies, recordSuccess clears counter (WR-04)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u_susp',
      email: 'suspended@b.com',
      passwordHash: '$2a$12$hashhashhashhashhashhashhashhashhashhashhashhashhashhha',
      emailVerifiedAt: new Date(),
      tokenVersion: 0,
      status: 'SUSPENDED',
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const res = await POST(makeReq({ email: 'suspended@b.com', password: 'longenough' }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('ACCOUNT_SUSPENDED');
    expect(body.message).toMatch(/suspended/i);
    // WR-04 — recordSuccess IS called: credentials passed verifyPassword,
    // so the user is legitimate; clearing the lockout counter prevents
    // post-restore lockout (where N-1 pre-suspension failures + 1 fresh
    // failure would lock a just-restored user out on the first attempt).
    expect(recordSuccess).toHaveBeenCalledWith('suspended@b.com');
    // No cookies issued.
    expect(__cookieStore.has('app-token')).toBe(false);
    expect(__cookieStore.has('app-refresh')).toBe(false);
    expect(__cookieStore.has('app-csrf')).toBe(false);
  });
});
