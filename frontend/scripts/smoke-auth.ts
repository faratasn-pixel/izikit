// frontend/scripts/smoke-auth.ts
//
// TEST-03 — Smoke test against a running Next.js dev server.
// Requires Node 20+ for Response.headers.getSetCookie() (engines.node enforces).
//
// Usage: pnpm smoke:auth   (after `pnpm dev` in another terminal)
//
// Covers: signup → fetch verification code via Prisma → verify-email →
// me → logout. Exits 0 on full pass, 1 + log on any failure.
//
// NOT run in CI (requires a live server). Manual UAT only — that's why no
// companion `smoke-auth.test.ts` exists; Vitest auto-discovers `scripts/**/
// *.test.ts` and would run it without a live server. The script IS the test.
//
// COOKIE PREFIX: hardcodes `app-csrf=` per the default `COOKIE_PREFIX=app`
// env var. Forks that override `COOKIE_PREFIX` must update the regex in
// csrfFromCookies().

import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const TEST_EMAIL = `smoke-${Date.now()}@example.test`;
const TEST_PASSWORD = 'SmokeTestPwd123!';

interface ApiError extends Error {
  step?: string;
  status?: number;
  body?: unknown;
}

function fail(step: string, status: number, body: unknown): never {
  const err: ApiError = new Error(`[${step}] failed: status=${status}`);
  err.step = step;
  err.status = status;
  err.body = body;
  throw err;
}

async function assertStatus(label: string, res: Response, expected: number): Promise<unknown> {
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  if (res.status !== expected) fail(label, res.status, body);
  console.log(`  ✓ ${label}: ${res.status}`);
  return body;
}

// NOTE: forks overriding COOKIE_PREFIX must update this regex.
function csrfFromCookies(setCookieHeaders: string[]): string | null {
  for (const c of setCookieHeaders) {
    const m = c.match(/(?:^|;\s*)app-csrf=([^;]+)/);
    if (m) return decodeURIComponent(m[1] ?? '');
  }
  return null;
}

export async function main(): Promise<number> {
  // Friendly env guard — operator-facing, not a test failure.
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
    console.error('\n  Missing DATABASE_URL or JWT_SECRET in env.');
    console.error('  → Run: cp .env.example .env.local && pnpm dev');
    console.error('  → Then in a new terminal: pnpm smoke:auth\n');
    return 1;
  }

  const prisma = new PrismaClient();
  const cookieJar: string[] = [];

  function recordCookies(res: Response): void {
    // Response.headers.getSetCookie() is Node 20+ — see header comment.
    const sc = res.headers.getSetCookie?.() ?? [];
    cookieJar.push(...sc);
  }
  function cookieHeader(): string {
    // Crude but sufficient — keep the last value per cookie name.
    const map = new Map<string, string>();
    for (const c of cookieJar) {
      const eq = c.indexOf('=');
      if (eq < 0) continue;
      const name = c.slice(0, eq);
      const val = c.slice(eq + 1).split(';')[0] ?? '';
      map.set(name, val);
    }
    return [...map].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  try {
    console.log(`Smoke against ${BASE_URL} as ${TEST_EMAIL}\n`);

    // 1. Signup — enumeration-resistant 201, NO cookies.
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    await assertStatus('signup', signupRes, 201);

    // 2. Peek the verification code from DB (dev-only, single-use).
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (!user) fail('db.findUser', 0, { email: TEST_EMAIL });
    const codeRow = await prisma.verificationCode.findFirst({
      where: { userId: user.id, type: 'EMAIL_VERIFY', usedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });
    if (!codeRow) fail('db.findCode', 0, { userId: user.id });
    console.log(`  ✓ db.peekCode: ${codeRow.code.slice(0, 2)}…`);

    // 3. Verify-email — issues cookies on success.
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, code: codeRow.code }),
    });
    await assertStatus('verify-email', verifyRes, 200);
    recordCookies(verifyRes);

    // 4. GET /me — proves access cookie is valid.
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { cookie: cookieHeader() },
    });
    const meBody = (await assertStatus('me', meRes, 200)) as { user?: { email?: string } };
    if (meBody.user?.email !== TEST_EMAIL) fail('me.email', 200, meBody);

    // 5. Logout — needs CSRF (double-submit cookie).
    const csrf = csrfFromCookies(cookieJar);
    if (!csrf) fail('logout.csrf', 0, { cookieJar });
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: cookieHeader(), 'x-csrf-token': csrf },
    });
    await assertStatus('logout', logoutRes, 200);

    console.log('\n✓ smoke-auth PASS');
    return 0;
  } catch (err) {
    const e = err as ApiError;
    console.error(`\n✗ smoke-auth FAIL at [${e.step ?? 'unknown'}]`);
    console.error(`  status: ${e.status ?? 'n/a'}`);
    console.error(`  body:   ${JSON.stringify(e.body, null, 2)}`);
    return 1;
  } finally {
    // Cleanup test user so re-runs don't accumulate.
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

// Compares via pathToFileURL (not a raw `file://` template) because
// process.argv[1] uses OS-native path separators — on Windows that's
// backslashes, which never match import.meta.url's forward-slash
// file:// form, silently no-opping the whole script.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
