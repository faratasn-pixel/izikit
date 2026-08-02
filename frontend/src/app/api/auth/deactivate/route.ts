// POST /api/auth/deactivate — Settings → Zone de danger → "Désactiver mon compte".
//
// Self-service account deactivation. Sets `status: SUSPENDED` — the SAME
// enum value and refusal path the admin back-office already uses
// (login/refresh both refuse SUSPENDED accounts with 403 ACCOUNT_SUSPENDED,
// per CLAUDE.md). Reactivation requires a SUPERADMIN via the existing
// PATCH /api/admin/users/[id]/status route — there is no separate
// self-service "reactivate", by design (mirrors how the admin route treats
// SUSPENDED → ACTIVE as a privileged restore).
//
// Guards:
//   - Password confirmation, mirroring change-password's currentPassword
//     check. OAuth-only accounts (no passwordHash) skip this — there is no
//     password to confirm; the live authenticated session + CSRF token are
//     the only factor available, same as set-password's threat model.
//   - Refuses if the caller is the sole ACTIVE SUPERADMIN — mirrors the
//     "can't demote the last SUPERADMIN" invariant (CLAUDE.md): suspension
//     is functionally a role change since it strips authentication.
//
// After deactivation, tokenVersion is bumped and auth cookies are cleared
// (NOT reissued, unlike change-password/set-password/revoke-others) — the
// user is immediately logged out on every device, including this one.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { clearAuthCookies, clearCsrfCookie, verifyCsrf, verifyPassword } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { isLockedOut, recordFailure, recordSuccess } from '@/lib/server/auth/lockout';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';

const Body = z.object({
  currentPassword: z.string().optional(),
});

function jsonError(
  code: string,
  status: number,
  requestId: string,
  message?: string,
): NextResponse {
  const res = NextResponse.json({ error: code, ...(message ? { message } : {}) }, { status });
  res.headers.set('x-request-id', requestId);
  return res;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) {
      csrfFail.headers.set('x-request-id', ctx.requestId);
      return csrfFail;
    }

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    if (await isLockedOut(auth.user.email)) {
      return jsonError('LOCKED_OUT', 423, ctx.requestId, 'Account temporarily locked.');
    }

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonError('VALIDATION_FAILED', 400, ctx.requestId, 'Invalid request body');
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.sub },
      select: { id: true, email: true, passwordHash: true, role: true, status: true },
    });
    if (!user) {
      return jsonError('USER_NOT_FOUND', 404, ctx.requestId);
    }

    // Password confirmation — only meaningful when a password exists.
    if (user.passwordHash) {
      if (!parsed.data.currentPassword) {
        return jsonError('PASSWORD_REQUIRED', 400, ctx.requestId, 'Current password is required.');
      }
      const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
      if (!ok) {
        const r = await recordFailure(user.email);
        if (r.locked) {
          return jsonError('LOCKED_OUT', 423, ctx.requestId, 'Account temporarily locked.');
        }
        return jsonError(
          'INVALID_CREDENTIALS',
          400,
          ctx.requestId,
          'Current password is incorrect',
        );
      }
      await recordSuccess(user.email);
    }

    // Last-active-SUPERADMIN guard — mirrors the role-change invariant.
    if (user.role === 'SUPERADMIN') {
      const activeSuperadmins = await prisma.user.count({
        where: { role: 'SUPERADMIN', status: 'ACTIVE' },
      });
      if (activeSuperadmins <= 1) {
        return jsonError(
          'LAST_SUPERADMIN',
          409,
          ctx.requestId,
          'You are the only active SUPERADMIN — promote another admin before deactivating this account.',
        );
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'SUSPENDED', tokenVersion: { increment: 1 } },
    });

    await clearAuthCookies();
    await clearCsrfCookie();

    log.info('auth.deactivate success', { userId: user.id });

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
