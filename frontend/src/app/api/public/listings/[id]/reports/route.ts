// PUBLIC-LISTING-REPORT-01 — POST /api/public/listings/[id]/reports
//
// Unauthenticated report/flag submission. Same CSRF carve-out and per-IP
// rate-limit pattern as .../inquiries. No notification is sent on
// purpose — admins review the moderation queue via
// GET /api/admin/listing-reports instead of being paged per report.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  reason: z.enum(['FAKE', 'SOLD', 'INCORRECT_INFO', 'SCAM', 'OTHER']),
  detail: z.string().trim().max(1000).optional(),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'listing-report',
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: 'TOO_MANY_REPORTS',
  message: 'Too many requests. Try again later.',
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const limited = await limiter.check(req, null);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!listing || listing.status !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    await prisma.listingReport.create({
      data: {
        listingId: id,
        reason: parsed.data.reason,
        // exactOptionalPropertyTypes: same rule as ListingInquiry.email.
        ...(parsed.data.detail !== undefined && { detail: parsed.data.detail }),
      },
    });

    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
