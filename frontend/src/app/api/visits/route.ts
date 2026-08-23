// VISITS-01 — GET /api/visits
//
// Cursor-paginated list of the current agent's scheduled visits, scoped via
// the `inquiry.listing.userId` relation (same two-hop ownership pattern as
// GET /api/listings/inquiries's `listing.userId`). `stats` covers the
// current calendar month by `scheduledAt`, independent of `?search=`/
// `?status=` — mirrors the always-visible stats bar on /visites, which
// doesn't change when the table is filtered.
//
// VISITS-02 — POST /api/visits
//
// Converts an existing ListingInquiry into a scheduled Visit. Requires the
// inquiry to belong to one of the caller's own listings and to not already
// have a visit (Visit.inquiryId is unique). Flips
// ListingInquiry.status → VISITE_PLANIFIEE in the same transaction as the
// Visit insert.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { VISIT_SELECT, VISIT_STATUSES, VISIT_TYPES } from '@/lib/server/visits/select';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));
    const scope = { inquiry: { listing: { userId: auth.user.sub } } } as const;

    const search = url.searchParams.get('search')?.trim();
    const searchFilter = search
      ? {
          OR: [
            { inquiry: { name: { contains: search, mode: 'insensitive' as const } } },
            { inquiry: { listing: { title: { contains: search, mode: 'insensitive' as const } } } },
          ],
        }
      : {};

    const statusParam = url.searchParams.get('status');
    const statusFilter =
      statusParam && (VISIT_STATUSES as readonly string[]).includes(statusParam)
        ? { status: statusParam }
        : {};

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthScope = { ...scope, scheduledAt: { gte: monthStart, lt: monthEnd } };

    const [rows, total, confirmees, enAttente, annulees] = await Promise.all([
      prisma.visit.findMany({
        where: { ...scope, ...searchFilter, ...statusFilter, ...cursorWhere(cursor) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: VISIT_SELECT,
      }),
      prisma.visit.count({ where: monthScope }),
      prisma.visit.count({ where: { ...monthScope, status: 'CONFIRMEE' } }),
      prisma.visit.count({ where: { ...monthScope, status: 'EN_ATTENTE' } }),
      prisma.visit.count({ where: { ...monthScope, status: 'ANNULEE' } }),
    ]);

    return NextResponse.json(
      { ...buildPage(rows, limit), stats: { total, confirmees, enAttente, annulees } },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const CreateBody = z.object({
  inquiryId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  type: z.enum(VISIT_TYPES).default('PRESENTIEL'),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const inquiry = await prisma.listingInquiry.findUnique({
      where: { id: parsed.data.inquiryId },
      select: { id: true, listing: { select: { userId: true } }, visit: { select: { id: true } } },
    });
    if (!inquiry || inquiry.listing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'INQUIRY_NOT_FOUND', message: 'Contact not found' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    if (inquiry.visit) {
      return NextResponse.json(
        { error: 'VISIT_ALREADY_EXISTS', message: 'This contact already has a scheduled visit' },
        { status: 409, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const visit = await prisma.$transaction(async (tx) => {
      const created = await tx.visit.create({
        data: {
          inquiryId: parsed.data.inquiryId,
          scheduledAt: parsed.data.scheduledAt,
          type: parsed.data.type,
          ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        },
        select: VISIT_SELECT,
      });
      await tx.listingInquiry.update({
        where: { id: parsed.data.inquiryId },
        data: { status: 'VISITE_PLANIFIEE' },
      });
      return created;
    });

    return NextResponse.json(
      { visit },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
