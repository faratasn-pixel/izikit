// POST /api/auth/delete-account — Settings → Zone de danger → "Supprimer
// définitivement mon compte".
//
// NOT a literal `DELETE FROM "User"`. Several FKs are intentionally
// `onDelete: Restrict` (AdminAction.actorId, Organization.ownerId,
// Withdrawal.userId) to protect the audit/financial trail — hard-deleting
// the row would throw (or require cascading away records the project's own
// design forbids touching). Instead this anonymizes the row:
//   - email      → `deleted-<id>@deleted.invalid` (frees the original email
//                  for reuse elsewhere, satisfies the unique constraint)
//   - phone/name/avatarUrl/city/country/bio → null
//   - passwordHash → null (can never log in again)
//   - status     → SUSPENDED (belt-and-suspenders: login/refresh already
//                  refuse SUSPENDED accounts even if a token survived)
//   - tokenVersion bumped → every outstanding token invalidated immediately
//   - OAuthAccount rows deleted → can't sign back in via Google/Facebook
//   - VerificationCode rows deleted → cleanup, nothing to verify anymore
// Orders/Withdrawals/Listings/AdminAction rows referencing this user are
// left untouched (financial/audit integrity) — they now point at an
// anonymized shell instead of a live account. This is disclosed in the
// Settings UI copy, not just here.
//
// Guards mirror /api/auth/deactivate: password confirmation (skipped for
// OAuth-only accounts) + refuses the sole ACTIVE SUPERADMIN.
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

    if (user.role === 'SUPERADMIN') {
      const activeSuperadmins = await prisma.user.count({
        where: { role: 'SUPERADMIN', status: 'ACTIVE' },
      });
      if (activeSuperadmins <= 1) {
        return jsonError(
          'LAST_SUPERADMIN',
          409,
          ctx.requestId,
          'You are the only active SUPERADMIN — promote another admin before deleting this account.',
        );
      }
    }

    await prisma.$transaction([
      prisma.oAuthAccount.deleteMany({ where: { userId: user.id } }),
      prisma.verificationCode.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          email: `deleted-${user.id}@deleted.invalid`,
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
      }),
    ]);

    await clearAuthCookies();
    await clearCsrfCookie();

    log.info('auth.delete-account success', { userId: user.id });

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
