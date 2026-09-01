// GET/PATCH /api/preferences/appearance — tests.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';

mockNextCookies();

vi.mock('@/lib/server/auth/lockout', () => ({
  isLockedOut: vi.fn().mockResolvedValue(false),
  recordFailure: vi.fn().mockResolvedValue({ count: 1, locked: false }),
  recordSuccess: vi.fn().mockResolvedValue(undefined),
}));

import { CSRF_COOKIE_NAME, createAccessToken } from '@/lib/server/auth';
import { GET, PATCH } from './route';

const CSRF_TOKEN = 'csrf-token-fixture-deadbeef';

function makeReq(opts: {
  method: 'GET' | 'PATCH';
  bearer?: string;
  body?: unknown;
  csrf?: string | null;
  csrfCookieValue?: string | null;
}): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  if (opts.csrf !== null && opts.csrf !== undefined) headers['x-csrf-token'] = opts.csrf;
  if (opts.csrfCookieValue !== null && opts.csrfCookieValue !== undefined) {
    headers.cookie = `${CSRF_COOKIE_NAME}=${opts.csrfCookieValue}`;
  }
  return new NextRequest('https://test/api/preferences/appearance', {
    method: opts.method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

let validToken: string;

beforeEach(async () => {
  validToken = await createAccessToken({
    sub: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'user_1',
    email: 'user@example.com',
    tokenVersion: 0,
    theme: 'LIGHT',
    accentColor: '#376BFF',
    fontScale: 'NORMAL',
    density: 'NORMAL',
    sidebarStyle: 'EXPANDED',
    animationsEnabled: true,
    hoverEffectsEnabled: true,
    reduceMotion: false,
  } as never);
});

describe('GET /api/preferences/appearance', () => {
  it('returns the preferences row', async () => {
    const res = await GET(makeReq({ method: 'GET', bearer: validToken }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences.theme).toBe('LIGHT');
  });

  it('missing token returns 401', async () => {
    const res = await GET(makeReq({ method: 'GET' }));
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/preferences/appearance', () => {
  it('updates provided fields only', async () => {
    prismaMock.user.update.mockResolvedValue({
      theme: 'DARK',
      accentColor: '#376BFF',
      fontScale: 'NORMAL',
      density: 'NORMAL',
      sidebarStyle: 'EXPANDED',
      animationsEnabled: true,
      hoverEffectsEnabled: true,
      reduceMotion: false,
    } as never);

    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        bearer: validToken,
        body: { theme: 'DARK' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { theme: 'DARK' },
      select: expect.any(Object),
    });
  });

  it('invalid accentColor returns VALIDATION_FAILED', async () => {
    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        bearer: validToken,
        body: { accentColor: 'not-a-hex' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('VALIDATION_FAILED');
  });

  it('missing CSRF header returns 403', async () => {
    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        bearer: validToken,
        body: { theme: 'DARK' },
        csrf: null,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('missing token returns 401', async () => {
    const res = await PATCH(
      makeReq({
        method: 'PATCH',
        body: { theme: 'DARK' },
        csrf: CSRF_TOKEN,
        csrfCookieValue: CSRF_TOKEN,
      }),
    );
    expect(res.status).toBe(401);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
