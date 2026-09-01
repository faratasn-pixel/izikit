// POST /api/auth/sessions/revoke-others — tests.
// Covers: happy path (tokenVersion bumped, fresh cookies for current session),
// CSRF reject, requireAuth reject, runtime export shape.
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

import {
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  createAccessToken,
} from '@/lib/server/auth';
import { POST } from './route';

const CSRF_TOKEN = 'csrf-token-fixture-deadbeef';

function buildRequest(opts: {
  csrf?: string | null;
  csrfCookieValue?: string | null;
}): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (opts.csrf !== null && opts.csrf !== undefined) headers.set('x-csrf-token', opts.csrf);
  if (opts.csrfCookieValue !== null && opts.csrfCookieValue !== undefined) {
    headers.set('cookie', `${CSRF_COOKIE_NAME}=${opts.csrfCookieValue}`);
  }
  return new NextRequest('http://localhost/api/auth/sessions/revoke-others', {
    method: 'POST',
    headers,
  });
}

function seedAccessCookie(token: string): void {
  cookieMockStore.set(COOKIE_NAME, token);
}

let validToken: string;

beforeEach(async () => {
  __cookieStore.clear();
  validToken = await createAccessToken({
    sub: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  } as unknown as never);
  prismaMock.user.update.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 1,
  } as unknown as never);
});

describe('POST /api/auth/sessions/revoke-others', () => {
  it('happy path — bumps tokenVersion and reissues cookies for the current session', async () => {
    await seedAccessCookie(validToken);
    const req = buildRequest({ csrf: CSRF_TOKEN, csrfCookieValue: CSRF_TOKEN });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { tokenVersion: { increment: 1 } },
      select: { id: true, email: true, tokenVersion: true },
    });

    expect(__cookieStore.has(COOKIE_NAME)).toBe(true);
    expect(__cookieStore.has(REFRESH_COOKIE_NAME)).toBe(true);
    expect(__cookieStore.has(CSRF_COOKIE_NAME)).toBe(true);
    const newAccess = __cookieStore.get(COOKIE_NAME);
    expect(newAccess?.value).toBeTruthy();
    expect(newAccess?.value).not.toBe(validToken);
  });

  it('missing CSRF header returns 403', async () => {
    await seedAccessCookie(validToken);
    const req = buildRequest({ csrf: null, csrfCookieValue: CSRF_TOKEN });

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

  it("route file exports runtime='nodejs' and POST handler", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'route.ts'), 'utf8');
    expect(src).toMatch(/runtime\s*=\s*['"]nodejs['"]/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });
});
