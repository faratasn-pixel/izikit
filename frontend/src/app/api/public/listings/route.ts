// PUBLIC-LISTINGS-01 — GET /api/public/listings
//
// Unauthenticated, read-only listing browse for the public "/annonces"
// marketing page. Mirrors the no-auth pattern of api/health/route.ts —
// there is no requireAuth() call here on purpose. Only VERIFIED listings
// are ever returned (never DRAFT/PENDING/SOLD). Query params are
// best-effort: anything malformed is silently ignored rather than
// rejected with a 400, since this backs a public navigation page, not a
// form submission.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 24;

function parsePage(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const LISTING_SELECT = {
  id: true,
  title: true,
  city: true,
  country: true,
  propertyType: true,
  transactionType: true,
  price: true,
  currency: true,
  createdAt: true,
  photos: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true },
  },
  _count: { select: { photos: true } },
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const params = req.nextUrl.searchParams;

    const country = params.get('country')?.trim() || undefined;
    const propertyType = params.get('propertyType')?.trim() || undefined;
    const transactionType = params.get('transactionType')?.trim() || undefined;
    const priceMin = parsePositiveInt(params.get('priceMin'));
    const priceMax = parsePositiveInt(params.get('priceMax'));
    const page = parsePage(params.get('page'));
    const limit = parseLimit(params.get('limit'));

    // Builds the Prisma `where` clause. `omit` drops one filter dimension
    // from the clause — used so each facet's own counts aren't collapsed by
    // its own currently-selected value (e.g. filtering by country=Bénin
    // must NOT shrink the country facet list down to just Bénin).
    function buildWhere(
      omit?: 'country' | 'propertyType' | 'transactionType',
    ): Prisma.ListingWhereInput {
      const where: Prisma.ListingWhereInput = { status: 'VERIFIED' };
      if (country && omit !== 'country') where.country = country;
      if (propertyType && omit !== 'propertyType') where.propertyType = propertyType;
      if (transactionType && omit !== 'transactionType') where.transactionType = transactionType;
      if (priceMin !== undefined || priceMax !== undefined) {
        where.price = {
          ...(priceMin !== undefined && { gte: priceMin }),
          ...(priceMax !== undefined && { lte: priceMax }),
        };
      }
      return where;
    }

    const baseWhere = buildWhere();

    const [rows, total, countryFacet, propertyTypeFacet, transactionTypeFacet] = await Promise.all([
      prisma.listing.findMany({
        where: baseWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: LISTING_SELECT,
      }),
      prisma.listing.count({ where: baseWhere }),
      prisma.listing.groupBy({
        by: ['country'],
        where: buildWhere('country'),
        _count: { _all: true },
      }),
      prisma.listing.groupBy({
        by: ['propertyType'],
        where: buildWhere('propertyType'),
        _count: { _all: true },
      }),
      prisma.listing.groupBy({
        by: ['transactionType'],
        where: buildWhere('transactionType'),
        _count: { _all: true },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      city: r.city,
      country: r.country,
      propertyType: r.propertyType,
      transactionType: r.transactionType,
      price: r.price,
      currency: r.currency,
      createdAt: r.createdAt,
      primaryPhotoUrl: r.photos[0]?.url ?? null,
      photoCount: r._count.photos,
      agent: { name: r.user.name, avatarUrl: r.user.avatarUrl, seed: r.user.id },
    }));

    const toFacet = (rows: { _count: { _all: number } }[], key: string) =>
      rows
        .map((r) => ({
          value: (r as unknown as Record<string, string>)[key],
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count);

    return NextResponse.json(
      {
        items,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        facets: {
          countries: toFacet(countryFacet, 'country'),
          propertyTypes: toFacet(propertyTypeFacet, 'propertyType'),
          transactionTypes: toFacet(transactionTypeFacet, 'transactionType'),
        },
      },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
