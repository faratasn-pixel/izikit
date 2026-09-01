// LISTINGS-05 — DELETE /api/listings/[id]/photos/[photoId]
//
// Removes a photo from a DRAFT listing (the thumbnail's "×" button in the
// Banani mockup). If the removed photo was primary and others remain, the
// earliest-added remaining photo is promoted to primary so the listing
// never ends up with photos but no cover image.
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; photoId: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id, photoId } = await ctx.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });
    if (!listing || listing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }
    if (listing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'LISTING_NOT_DRAFT', message: 'Only a draft listing can be edited here' },
        { status: 409, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const photo = await prisma.listingPhoto.findUnique({
      where: { id: photoId },
      select: { id: true, listingId: true, isPrimary: true },
    });
    if (!photo || photo.listingId !== id) {
      return NextResponse.json(
        { error: 'PHOTO_NOT_FOUND', message: 'Photo not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.listingPhoto.delete({ where: { id: photoId } });
      if (photo.isPrimary) {
        const next = await tx.listingPhoto.findFirst({
          where: { listingId: id },
          orderBy: { position: 'asc' },
          select: { id: true },
        });
        if (next) {
          await tx.listingPhoto.update({ where: { id: next.id }, data: { isPrimary: true } });
        }
      }
    });

    return NextResponse.json(
      { deleted: true },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
