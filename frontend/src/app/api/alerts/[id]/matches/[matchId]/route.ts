// ALERTS-06 — PATCH /api/alerts/[id]/matches/[matchId]
//
// Marks a single AlertMatch as viewed by the owning user (fired when they
// click "Voir la demande" from /alertes or /alertes/[id]). Idempotent —
// never overwrites an existing viewedAt, so it always reflects the FIRST
// time the user opened that match's underlying PropertyRequest.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const PatchBody = z.object({
  viewed: z.literal(true),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; matchId: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id, matchId } = await ctx.params;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const match = await prisma.alertMatch.findUnique({
      where: { id: matchId },
      select: { id: true, alertId: true, viewedAt: true, alert: { select: { userId: true } } },
    });
    if (!match || match.alertId !== id || match.alert.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'MATCH_NOT_FOUND', message: 'Match not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const viewedAt =
      match.viewedAt ??
      (
        await prisma.alertMatch.update({
          where: { id: matchId },
          data: { viewedAt: new Date() },
          select: { viewedAt: true },
        })
      ).viewedAt;

    return NextResponse.json(
      { match: { id: match.id, viewedAt } },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
