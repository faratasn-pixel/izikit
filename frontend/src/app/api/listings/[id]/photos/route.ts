// LISTINGS-04 — POST /api/listings/[id]/photos
//
// Multipart photo upload attached to a DRAFT listing, uploaded immediately
// on selection in the "Publier une annonce" form (not staged client-side —
// simpler than juggling unsaved File objects across the whole multi-section
// form). Mirrors the /api/upload + /api/legal-documents trust boundary
// (CSRF → auth → ownership/DRAFT check → Cloudinary probe → size/MIME gates
// → magic-byte sniff → Cloudinary → DB row), restricted to image MIME types
// and a 20-photo cap per the Banani mockup ("jusqu'à 20 photos").
//
// The first photo uploaded is auto-marked primary; later uploads can pass
// `isPrimary=true` to take over the cover-photo slot (see DELETE in
// `./[photoId]/route.ts` for what happens to `isPrimary` on removal).
export const runtime = 'nodejs';

import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { StorageNotConfiguredError, uploadBuffer } from '@/lib/server/upload/cloudinary-client';
import { verifyMagicBytes } from '@/lib/server/upload/sniff';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 20;

export async function POST(
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

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { code: 'STORAGE_NOT_CONFIGURED', message: 'Storage not configured' },
        { status: 503, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const photoCount = await prisma.listingPhoto.count({ where: { listingId: id } });
    if (photoCount >= MAX_PHOTOS) {
      return NextResponse.json(
        { error: 'TOO_MANY_PHOTOS', message: `Maximum ${MAX_PHOTOS} photos per listing` },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { code: 'UPLOAD_MISSING_FILE', message: 'file field is required' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { code: 'FILE_TOO_LARGE', message: `Max ${MAX_BYTES} bytes` },
        { status: 413, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { code: 'INVALID_MIME', message: `MIME ${file.type} not allowed` },
        { status: 415, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { match, sniffed } = verifyMagicBytes(buf, file.type);
    if (sniffed && !match) {
      return NextResponse.json(
        { code: 'MAGIC_BYTE_MISMATCH', message: 'File bytes do not match declared MIME' },
        { status: 415, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const wantsPrimary = form.get('isPrimary') === 'true' || photoCount === 0;

    let uploaded;
    try {
      uploaded = await uploadBuffer(`listings/${id}/${randomUUID()}`, buf, file.type);
    } catch (e) {
      if (e instanceof StorageNotConfiguredError) {
        return NextResponse.json(
          { code: 'STORAGE_NOT_CONFIGURED', message: 'Storage not configured' },
          { status: 503, headers: { 'x-request-id': reqCtx.requestId } },
        );
      }
      return NextResponse.json(
        { code: 'UPLOAD_FAILED', message: 'Storage write failed' },
        { status: 502, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const photo = await prisma.$transaction(async (tx) => {
      if (wantsPrimary) {
        await tx.listingPhoto.updateMany({
          where: { listingId: id, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.listingPhoto.create({
        data: {
          listingId: id,
          key: uploaded.publicId,
          url: uploaded.secureUrl,
          isPrimary: wantsPrimary,
          position: photoCount,
        },
        select: { id: true, url: true, isPrimary: true, position: true, createdAt: true },
      });
    });

    return NextResponse.json(
      { photo },
      { status: 201, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
