// ADMIN-LISTING-REPORTS-02 — PATCH /api/admin/listing-reports/[id]
//
// Resolves a report: REVIEWED (admin looked at it, no action needed
// beyond that) or DISMISSED (not actionable). Unlike
// /api/admin/users/[id]/status, there's no same-value no-op suppression
// — re-resolving a report (e.g. correcting a mistaken DISMISSED) is a
// legitimate action here, not audit-log noise.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  status: z.enum(['REVIEWED', 'DISMISSED']),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const existing = await prisma.listingReport.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'REPORT_NOT_FOUND', message: 'Report not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const updated = await prisma.listingReport.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    await logAdminAction(prisma, {
      actorId: auth.admin.id,
      action: 'listing-report.resolve',
      targetType: 'ListingReport',
      targetId: id,
      metadata: { from: existing.status, to: parsed.data.status },
    });

    return NextResponse.json(
      { report: updated },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
