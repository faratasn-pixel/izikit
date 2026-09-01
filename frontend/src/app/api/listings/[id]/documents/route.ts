// LISTINGS-06 — POST /api/listings/[id]/documents
//
// Multipart upload for the 3 fixed listing-specific legal documents (Titre
// foncier, Mandat de vente, Plan cadastral — distinct from the user-level
// `LegalDocument` used by /settings). Same shape and trust boundary as
// `POST /api/legal-documents`, upserting by `(listingId, type)` instead of
// `(userId, type)`. Always resets `status` to PENDING on upload/replace —
// there is no admin verification workflow for these yet, same disclosed
// limitation as the user-level legal documents feature.
export const runtime = 'nodejs';

import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { StorageNotConfiguredError, uploadBuffer } from '@/lib/server/upload/cloudinary-client';
import { sanitizeFilename } from '@/lib/server/upload/sanitize-filename';
import { verifyMagicBytes } from '@/lib/server/upload/sniff';

export const LISTING_DOCUMENT_TYPES = ['LAND_TITLE', 'SALE_MANDATE', 'CADASTRAL_PLAN'] as const;
export type ListingDocumentType = (typeof LISTING_DOCUMENT_TYPES)[number];

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_BYTES = 10 * 1024 * 1024;

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

    const form = await req.formData();
    const type = form.get('type');
    if (typeof type !== 'string' || !LISTING_DOCUMENT_TYPES.includes(type as ListingDocumentType)) {
      return NextResponse.json(
        { code: 'INVALID_DOCUMENT_TYPE', message: 'type must be one of the fixed document types' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

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

    const existing = await prisma.listingDocument.findUnique({
      where: { listingId_type: { listingId: id, type } },
      select: { status: true },
    });
    if (existing?.status === 'VERIFIED') {
      return NextResponse.json(
        { code: 'DOCUMENT_VERIFIED', message: 'A verified document cannot be replaced' },
        { status: 409, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const filename = sanitizeFilename(file.name);
    const publicId = `listings/${id}/documents/${type}-${randomUUID()}`;

    let uploaded;
    try {
      uploaded = await uploadBuffer(publicId, buf, file.type);
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

    const row = await prisma.listingDocument.upsert({
      where: { listingId_type: { listingId: id, type } },
      create: {
        listingId: id,
        type,
        status: 'PENDING',
        key: uploaded.publicId,
        url: uploaded.secureUrl,
        filename,
        mimeType: file.type,
        sizeBytes: uploaded.bytes,
      },
      update: {
        status: 'PENDING',
        key: uploaded.publicId,
        url: uploaded.secureUrl,
        filename,
        mimeType: file.type,
        sizeBytes: uploaded.bytes,
        rejectionReason: null,
      },
      select: {
        type: true,
        status: true,
        url: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { document: row },
      { status: 201, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
