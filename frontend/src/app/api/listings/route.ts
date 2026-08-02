// LISTINGS-01 — GET /api/listings
//
// Cursor-paginated list of the current user's own listings ("Mes annonces"
// table on the Agent Dashboard / Mes Annonces page). Scoped to
// `userId = auth.user.sub` — there is no cross-user listing browsing
// endpoint yet (that's the future public "search listings" surface, a
// separate feature). DRAFT listings are excluded — they only exist as
// in-progress state for the "Publier une annonce" flow (see POST below)
// and aren't resumable/editable yet, so surfacing them here would just be
// confusing dead rows.
//
// LISTINGS-02 — POST /api/listings
//
// Creates a bare DRAFT listing (no body required) so the "Publier une
// annonce" page has a `listingId` to attach photos/documents to as soon as
// the user starts uploading — see `.planning/banani/publier-annonce-alt.md`.
// Required-for-publish validation happens in `PATCH /api/listings/[id]`
// (frontend/src/app/api/listings/[id]/route.ts), not here.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));
    const notDraft = { status: { not: 'DRAFT' } } as const;

    const [rows, total, verified, pending, sold] = await Promise.all([
      prisma.listing.findMany({
        where: {
          userId: auth.user.sub,
          ...notDraft,
          ...cursorWhere(cursor),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          title: true,
          city: true,
          country: true,
          propertyType: true,
          transactionType: true,
          price: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.listing.count({ where: { userId: auth.user.sub, ...notDraft } }),
      prisma.listing.count({ where: { userId: auth.user.sub, status: 'VERIFIED' } }),
      prisma.listing.count({ where: { userId: auth.user.sub, status: 'PENDING' } }),
      prisma.listing.count({ where: { userId: auth.user.sub, status: 'SOLD' } }),
    ]);

    return NextResponse.json(
      { ...buildPage(rows, limit), counts: { total, verified, pending, sold } },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const listing = await prisma.listing.create({
      data: {
        userId: auth.user.sub,
        title: '',
        city: '',
        country: '',
        propertyType: 'VILLA',
        price: 0,
        status: 'DRAFT',
      },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json(
      { listing },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
