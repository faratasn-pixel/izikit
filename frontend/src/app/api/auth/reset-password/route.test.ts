// AUTH-08 — POST /api/auth/reset-password tests.
import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';

import { POST } from './route';

const VALID_CODE = 'ABCD2345';
const STRONG_PW = 'a-strong-passphrase-2026';

function makeReq(body: unknown): NextRequest {
  return body === undefined
    ? new NextRequest('http://test/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
    : new NextRequest('http://test/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((cb: unknown) => {
    if (typeof cb === 'function') {
      return (cb as (tx: typeof prismaMock) => unknown)(prismaMock) as Promise<unknown>;
    }
    return Promise.resolve(cb);
  });
});

describe('POST /api/auth/reset-password', () => {
  // WR-01 — limiter is now FIRST, so each test must use a unique email to
  // avoid accidental cross-test bucket pollution (5/15m by default).
  it('happy path: hashes new password, bumps tokenVersion, consumes code in single tx', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+22967000001' } as never);
    prismaMock.verificationCode.findFirst.mockResolvedValue({
      id: 'vc1',
      expiresAt: new Date(Date.now() + 60_000),
    } as never);
    // WR-05 — updateMany now consumes the code; happy path returns count=1.
    prismaMock.verificationCode.updateMany.mockResolvedValue({ count: 1 } as never);

    const res = await POST(
      makeReq({ email: 'reset1@b.com', code: VALID_CODE, newPassword: STRONG_PW }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    const userArg = prismaMock.user.update.mock.calls[0]?.[0];
    expect(userArg?.data?.passwordHash).toBeTruthy();
    expect(userArg?.data?.tokenVersion).toEqual({ increment: 1 });

    expect(prismaMock.verificationCode.updateMany).toHaveBeenCalledTimes(1);
    const codeArg = prismaMock.verificationCode.updateMany.mock.calls[0]?.[0];
    expect(codeArg?.where?.usedAt).toBeNull();
    expect(codeArg?.data?.usedAt).toBeInstanceOf(Date);
  });

  it('WR-05 — race: when updateMany returns count=0, surfaces VERIFICATION_CODE_INVALID and skips user.update', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+22967000002' } as never);
    prismaMock.verificationCode.findFirst.mockResolvedValue({
      id: 'vc1',
      expiresAt: new Date(Date.now() + 60_000),
    } as never);
    // Simulate concurrent consumption — updateMany finds 0 rows.
    prismaMock.verificationCode.updateMany.mockResolvedValue({ count: 0 } as never);

    const res = await POST(
      makeReq({ email: 'reset2@b.com', code: VALID_CODE, newPassword: STRONG_PW }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VERIFICATION_CODE_INVALID');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('returns VERIFICATION_CODE_INVALID when no matching code exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+22967000003' } as never);
    prismaMock.verificationCode.findFirst.mockResolvedValue(null);

    const res = await POST(
      makeReq({ email: 'reset3@b.com', code: VALID_CODE, newPassword: STRONG_PW }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VERIFICATION_CODE_INVALID');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('returns VERIFICATION_CODE_EXPIRED when code is past expiry', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+22967000004' } as never);
    prismaMock.verificationCode.findFirst.mockResolvedValue({
      id: 'vc1',
      expiresAt: new Date(Date.now() - 1_000),
    } as never);

    const res = await POST(
      makeReq({ email: 'reset4@b.com', code: VALID_CODE, newPassword: STRONG_PW }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VERIFICATION_CODE_EXPIRED');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects banned new passwords with PASSWORD_BANNED — code NOT consumed', async () => {
    const res = await POST(
      makeReq({ email: 'reset5@b.com', code: VALID_CODE, newPassword: 'password' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('PASSWORD_BANNED');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.verificationCode.updateMany).not.toHaveBeenCalled();
  });

  it('rejects too-short new passwords with PASSWORD_TOO_SHORT — code NOT consumed', async () => {
    const res = await POST(
      makeReq({ email: 'reset6@b.com', code: VALID_CODE, newPassword: 'short' }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('PASSWORD_TOO_SHORT');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.verificationCode.updateMany).not.toHaveBeenCalled();
  });

  it('returns 429 TOO_MANY_RESET_ATTEMPTS after 5/15m', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const calls = await Promise.all(
      Array.from({ length: 6 }, () =>
        POST(
          makeReq({
            email: 'reset7@b.com',
            code: VALID_CODE,
            newPassword: STRONG_PW,
          }),
        ),
      ),
    );
    const limited = calls.find((r) => r.status === 429)!;
    expect(limited).toBeTruthy();
    const body = await limited.json();
    expect(body.error).toBe('TOO_MANY_RESET_ATTEMPTS');
  });

  it('treats already-used codes as VERIFICATION_CODE_INVALID (filtered by usedAt:null)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+22967000008' } as never);
    // Already-used codes are filtered out by `where: { usedAt: null }` —
    // findFirst returns null, mirroring the "no code" case.
    prismaMock.verificationCode.findFirst.mockResolvedValue(null);

    const res = await POST(
      makeReq({ email: 'reset8@b.com', code: VALID_CODE, newPassword: STRONG_PW }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VERIFICATION_CODE_INVALID');
  });

  it('skips lockout clear when the user has no phone (e.g. Google-only account)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: null } as never);
    prismaMock.verificationCode.findFirst.mockResolvedValue({
      id: 'vc1',
      expiresAt: new Date(Date.now() + 60_000),
    } as never);
    prismaMock.verificationCode.updateMany.mockResolvedValue({ count: 1 } as never);

    const res = await POST(
      makeReq({ email: 'reset9@b.com', code: VALID_CODE, newPassword: STRONG_PW }),
    );
    expect(res.status).toBe(200);
  });

  it('returns VALIDATION_FAILED for a malformed email', async () => {
    const res = await POST(
      makeReq({ email: 'not-an-email', code: VALID_CODE, newPassword: STRONG_PW }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION_FAILED');
  });

  it("source contains runtime='nodejs' AND tokenVersion increment AND no setAuthCookies", () => {
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    expect(src).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
    expect(src).toMatch(/tokenVersion:\s*\{\s*increment:\s*1\s*\}/);
    expect(src).not.toContain('setAuthCookies');
  });
});
