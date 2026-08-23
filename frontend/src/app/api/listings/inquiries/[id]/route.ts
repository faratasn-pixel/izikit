// LISTINGS-INQUIRIES-02 — PATCH /api/listings/inquiries/[id]
//
// Lets an agent mark a received inquiry's status and/or attach an internal
// note. Ownership is checked through the `listing.userId` relation — 404
// (not 403) on mismatch/missing, same convention as
// PATCH /api/listings/[id]. No logAdminAction: this is an agent acting on
// their own data, not an admin backoffice mutation.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const STATUSES = ['EN_ATTENTE', 'REPONDU', 'VISITE_PLANIFIEE', 'NON_QUALIFIE'] as const;

const Body = z
  .object({
    status: z.enum(STATUSES).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.status !== undefined || d.notes !== undefined, {
    message: 'At least one field required',
  });

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
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const existing = await prisma.listingInquiry.findUnique({
      where: { id },
      select: { id: true, listing: { select: { userId: true } } },
    });
    if (!existing || existing.listing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'INQUIRY_NOT_FOUND', message: 'Contact not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const data: { status?: (typeof STATUSES)[number]; notes?: string } = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

    const updated = await prisma.listingInquiry.update({
      where: { id },
      data,
      select: { id: true, status: true, notes: true },
    });

    return NextResponse.json(
      { inquiry: updated },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
