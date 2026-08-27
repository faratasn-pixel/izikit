// PUBLIC-LISTING-DETAIL-01 — GET /api/public/listings/[id]
//
// Unauthenticated, read-only single-listing detail for the public
// "/annonces/[id]" page. Same no-auth pattern as GET /api/public/listings.
// Only a VERIFIED listing is ever returned — 404 for DRAFT/PENDING/SOLD/
// missing, so this route never leaks a non-public listing's existence.
// Increments Listing.viewCount on every successful read (best-effort — a
// lost increment under a race is an acceptable trade-off for a vanity
// counter, no financial/legal invariant here). Also geocodes city/country
// via Nominatim (best-effort, non-fatal) and returns up to 3 similar
// VERIFIED listings (same country + propertyType).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { geocodeCity } from '@/lib/server/geocode';
import { classifySource } from '@/lib/server/analytics/classify-source';
import { log } from '@/lib/server/observability/log';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const LISTING_SELECT = {
  id: true,
  title: true,
  description: true,
  landmark: true,
  city: true,
  country: true,
  propertyType: true,
  transactionType: true,
  price: true,
  currency: true,
  surfaceM2: true,
  capacity: true,
  yearBuilt: true,
  standing: true,
  roomsTotal: true,
  bedrooms: true,
  bathrooms: true,
  kitchens: true,
  amenities: true,
  status: true,
  viewCount: true,
  createdAt: true,
  photos: {
    orderBy: { position: 'asc' as const },
    select: { url: true, isPrimary: true },
  },
  user: { select: { id: true, name: true, avatarUrl: true, phone: true } },
} as const;

const SIMILAR_SELECT = {
  id: true,
  title: true,
  city: true,
  country: true,
  propertyType: true,
  transactionType: true,
  price: true,
  currency: true,
  createdAt: true,
  photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
  _count: { select: { photos: true } },
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const { id } = await ctx.params;

    const listing = await prisma.listing.findUnique({ where: { id }, select: LISTING_SELECT });
    if (!listing || listing.status !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    let viewCount = listing.viewCount;
    try {
      const updated = await prisma.listing.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      viewCount = updated.viewCount;
    } catch (err) {
      log.warn('listing-detail: viewCount increment failed', {
        listingId: id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    const source = classifySource(
      req.headers.get('referer'),
      req.nextUrl.searchParams.get('utm_source'),
    );
    try {
      await prisma.listingView.create({ data: { listingId: id, source } });
    } catch (err) {
      log.warn('listing-detail: ListingView write failed', {
        listingId: id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    const location = await geocodeCity(listing.city, listing.country).catch(() => null);

    const similarRows = await prisma.listing.findMany({
      where: {
        status: 'VERIFIED',
        country: listing.country,
        propertyType: listing.propertyType,
        id: { not: id },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
      select: SIMILAR_SELECT,
    });

    const similar = similarRows.map((r) => ({
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

    return NextResponse.json(
      {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        landmark: listing.landmark,
        city: listing.city,
        country: listing.country,
        propertyType: listing.propertyType,
        transactionType: listing.transactionType,
        price: listing.price,
        currency: listing.currency,
        surfaceM2: listing.surfaceM2,
        capacity: listing.capacity,
        yearBuilt: listing.yearBuilt,
        standing: listing.standing,
        roomsTotal: listing.roomsTotal,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        kitchens: listing.kitchens,
        amenities: (listing.amenities as string[]) ?? [],
        viewCount,
        createdAt: listing.createdAt,
        photos: listing.photos,
        agent: {
          name: listing.user.name,
          avatarUrl: listing.user.avatarUrl,
          phone: listing.user.phone,
          seed: listing.user.id,
        },
        location,
        similar,
      },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
