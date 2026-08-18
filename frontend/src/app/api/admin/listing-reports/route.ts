// ADMIN-LISTING-REPORTS-01 — GET /api/admin/listing-reports
//
// Moderation queue for visitor-submitted listing reports (the public
// POST endpoint at /api/public/listings/[id]/reports). Cursor pagination
// mirrors GET /api/admin/withdrawals's shared helpers. `status` filter is
// optional (omit to see every status); pass `?status=PENDING` for the
// actionable queue. No admin frontend consumes this in this plan — API
// only.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const REPORT_SELECT = {
  id: true,
  listingId: true,
  reason: true,
  detail: true,
  status: true,
  createdAt: true,
  listing: { select: { id: true, title: true, status: true } },
} as const satisfies Prisma.ListingReportSelect;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const status = url.searchParams.get('status');
    const cursor = decodeCursor(url.searchParams.get('cursor'));

    const where: Prisma.ListingReportWhereInput = {
      ...(status ? { status } : {}),
      ...cursorWhere(cursor),
    };

    const rows = await prisma.listingReport.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: REPORT_SELECT,
    });

    return NextResponse.json(buildPage(rows, limit), {
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}
