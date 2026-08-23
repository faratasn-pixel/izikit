// VISITS-03 — PATCH /api/visits/[id]
//
// Edits a scheduled visit (date/time, type, notes) or cancels it
// (`status: 'ANNULEE'`) — there is no DELETE route, cancellation is a soft
// status change. Ownership is checked through the `inquiry.listing.userId`
// relation, 404 (not 403) on mismatch, same convention as
// PATCH /api/listings/inquiries/[id].
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { VISIT_SELECT, VISIT_STATUSES, VISIT_TYPES } from '@/lib/server/visits/select';

const PatchBody = z
  .object({
    status: z.enum(VISIT_STATUSES).optional(),
    notes: z.string().trim().max(2000).optional(),
    scheduledAt: z.coerce.date().optional(),
    type: z.enum(VISIT_TYPES).optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.notes !== undefined ||
      d.scheduledAt !== undefined ||
      d.type !== undefined,
    { message: 'At least one field required' },
  );

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await ctx.params;
    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const existing = await prisma.visit.findUnique({
      where: { id },
      select: { id: true, inquiry: { select: { listing: { select: { userId: true } } } } },
    });
    if (!existing || existing.inquiry.listing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'VISIT_NOT_FOUND', message: 'Visit not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const data: {
      status?: (typeof VISIT_STATUSES)[number];
      notes?: string;
      scheduledAt?: Date;
      type?: (typeof VISIT_TYPES)[number];
    } = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.scheduledAt !== undefined) data.scheduledAt = parsed.data.scheduledAt;
    if (parsed.data.type !== undefined) data.type = parsed.data.type;

    const visit = await prisma.visit.update({
      where: { id },
      data,
      select: VISIT_SELECT,
    });

    return NextResponse.json(
      { visit },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
