// LISTINGS-INQUIRIES-01 — GET /api/listings/inquiries
//
// Cursor-paginated list of inquiries received on the current user's own
// listings ("Contacts reçus" page). Scoped via the `listing.userId`
// relation, same ownership convention as GET /api/listings. Returns
// `stats` alongside `items` in one response — mirrors GET /api/requests's
// `counts` field — since the page has no separate stats endpoint and
// fetches once on mount.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));
    const scope = { listing: { userId: auth.user.sub } } as const;
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    // Used by the "Planifier une visite" picker on /visites — an inquiry
    // that already has a linked Visit, or is already marked
    // VISITE_PLANIFIEE, can't be converted a second time (Visit.inquiryId
    // is unique).
    const eligibleForVisit = url.searchParams.get('eligibleForVisit') === 'true';
    const eligibleFilter = eligibleForVisit
      ? { status: { not: 'VISITE_PLANIFIEE' as const }, visit: null }
      : {};

    const [rows, total, nouveaux7j, enAttente, visitePlanifiee] = await Promise.all([
      prisma.listingInquiry.findMany({
        where: { ...scope, ...eligibleFilter, ...cursorWhere(cursor) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          message: true,
          type: true,
          status: true,
          notes: true,
          createdAt: true,
          listing: {
            select: {
              id: true,
              title: true,
              city: true,
              country: true,
              transactionType: true,
              price: true,
              currency: true,
            },
          },
        },
      }),
      prisma.listingInquiry.count({ where: scope }),
      prisma.listingInquiry.count({ where: { ...scope, createdAt: { gte: sevenDaysAgo } } }),
      prisma.listingInquiry.count({ where: { ...scope, status: 'EN_ATTENTE' } }),
      prisma.listingInquiry.count({ where: { ...scope, status: 'VISITE_PLANIFIEE' } }),
    ]);

    const tauxConversion = total > 0 ? Math.round((visitePlanifiee / total) * 100) : 0;

    return NextResponse.json(
      {
        ...buildPage(rows, limit),
        stats: { total, nouveaux7j, enAttente, tauxConversion },
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
