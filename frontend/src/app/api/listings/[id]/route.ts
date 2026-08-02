// LISTINGS-03 — PATCH /api/listings/[id]
//
// Partial update of a DRAFT listing created by `POST /api/listings`. Two
// modes, both in one request body:
//   - `publish: false` (default) — "Enregistrer le brouillon": persists
//     whatever subset of fields the client sends, no validation beyond
//     per-field shape/range checks. Status stays DRAFT.
//   - `publish: true` — "Publier l'annonce": merges the incoming fields
//     with the listing's current values, checks every field/photo required
//     for publication is present, and only then flips status to
//     PENDING (awaiting the existing admin verification flow). Missing
//     requirements come back as 400 `PUBLISH_REQUIREMENTS_NOT_MET` with a
//     `missing` array the frontend maps to inline field errors.
//
// Only the owning user can edit their own DRAFT — 404 (not 403) on
// mismatch/missing to avoid leaking existence, same convention as the org
// routes. Non-DRAFT listings can't be edited through this route (409) —
// there is no "modifier annonce" flow yet (separate future screen).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const PROPERTY_TYPES = ['VILLA', 'APARTMENT', 'LAND', 'DUPLEX', 'OFFICE', 'WAREHOUSE'] as const;
const TRANSACTION_TYPES = ['SALE', 'RENT', 'SHORT_RENT'] as const;
const STANDINGS = ['BASIC', 'MID', 'HIGH'] as const;

const PatchBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  country: z.string().trim().min(1).max(120).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  transactionType: z.enum(TRANSACTION_TYPES).optional(),
  price: z.number().int().positive().optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  surfaceM2: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1900).max(2100).optional(),
  standing: z.enum(STANDINGS).optional(),
  roomsTotal: z.number().int().nonnegative().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  amenities: z.array(z.string().max(40)).max(30).optional(),
  publish: z.boolean().optional(),
});

const LISTING_SELECT = {
  id: true,
  userId: true,
  title: true,
  description: true,
  city: true,
  country: true,
  propertyType: true,
  transactionType: true,
  price: true,
  currency: true,
  surfaceM2: true,
  yearBuilt: true,
  standing: true,
  roomsTotal: true,
  bedrooms: true,
  bathrooms: true,
  amenities: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

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

    const existing = await prisma.listing.findUnique({ where: { id }, select: LISTING_SELECT });
    if (!existing || existing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'LISTING_NOT_DRAFT', message: 'Only a draft listing can be edited here' },
        { status: 409, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const { publish, ...fields } = parsed.data;

    if (publish) {
      const merged = { ...existing, ...fields };
      const missing: string[] = [];
      if (!merged.title) missing.push('title');
      if (!merged.description) missing.push('description');
      if (!merged.price || merged.price <= 0) missing.push('price');
      if (!merged.surfaceM2 || merged.surfaceM2 <= 0) missing.push('surfaceM2');
      if (!merged.city) missing.push('city');
      if (!merged.country) missing.push('country');
      if (!merged.propertyType) missing.push('propertyType');
      if (!merged.transactionType) missing.push('transactionType');

      const photoCount = await prisma.listingPhoto.count({ where: { listingId: id } });
      if (photoCount === 0) missing.push('photos');

      if (missing.length > 0) {
        return NextResponse.json(
          { error: 'PUBLISH_REQUIREMENTS_NOT_MET', missing },
          { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
        );
      }
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        ...(fields.title !== undefined && { title: fields.title }),
        ...(fields.description !== undefined && { description: fields.description }),
        ...(fields.city !== undefined && { city: fields.city }),
        ...(fields.country !== undefined && { country: fields.country }),
        ...(fields.propertyType !== undefined && { propertyType: fields.propertyType }),
        ...(fields.transactionType !== undefined && { transactionType: fields.transactionType }),
        ...(fields.price !== undefined && { price: fields.price }),
        ...(fields.currency !== undefined && { currency: fields.currency }),
        ...(fields.surfaceM2 !== undefined && { surfaceM2: fields.surfaceM2 }),
        ...(fields.yearBuilt !== undefined && { yearBuilt: fields.yearBuilt }),
        ...(fields.standing !== undefined && { standing: fields.standing }),
        ...(fields.roomsTotal !== undefined && { roomsTotal: fields.roomsTotal }),
        ...(fields.bedrooms !== undefined && { bedrooms: fields.bedrooms }),
        ...(fields.bathrooms !== undefined && { bathrooms: fields.bathrooms }),
        ...(fields.amenities !== undefined && { amenities: fields.amenities }),
        ...(publish && { status: 'PENDING' }),
      },
      select: LISTING_SELECT,
    });

    return NextResponse.json(
      { listing: updated },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
