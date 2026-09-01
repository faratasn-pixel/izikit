/**
 * GET/POST /api/legal-documents — /settings "Documents légaux" tab.
 *
 * GET returns all 6 fixed document types merged with the caller's uploaded
 * rows (missing types come back as `document: null`) plus derived stats.
 *
 * POST is a multipart upload (fields: `type`, `file`, optional `expiresAt`)
 * that upserts by `(userId, type)`. Mirrors the /api/upload trust boundary
 * (CSRF → auth → Cloudinary probe → size/MIME gates → magic-byte sniff →
 * Cloudinary) but restricts MIME to pdf/jpeg/png regardless of
 * UPLOAD_ALLOWED_MIME (legal docs are scans/photos/PDFs only) and always
 * resets `status` to PENDING — there is no self-verification path. Admin
 * verification (PENDING → VERIFIED/REJECTED) is phase 2, see
 * .planning/banani/documents-legaux.md.
 *
 * A VERIFIED document cannot be replaced through this route (409
 * DOCUMENT_VERIFIED) — avoids silently invalidating a verified doc.
 */
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

export const LEGAL_DOCUMENT_TYPES = [
  'ID_CARD',
  'PRO_CARD',
  'RCCM',
  'TAX_CERTIFICATE',
  'MANAGEMENT_MANDATE',
  'LIABILITY_INSURANCE',
] as const;

export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_BYTES = 10 * 1024 * 1024;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    const rows = await prisma.legalDocument.findMany({
      where: { userId: auth.user.sub },
      select: {
        type: true,
        status: true,
        url: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        expiresAt: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
    const byType = new Map(rows.map((r) => [r.type, r]));

    const documents = LEGAL_DOCUMENT_TYPES.map((type) => ({
      type,
      document: byType.get(type) ?? null,
    }));

    const stats = {
      verified: rows.filter((r) => r.status === 'VERIFIED').length,
      pending: rows.filter((r) => r.status === 'PENDING').length,
      missing: LEGAL_DOCUMENT_TYPES.length - rows.length,
      total: LEGAL_DOCUMENT_TYPES.length,
    };

    return NextResponse.json(
      { documents, stats },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) {
      csrfFail.headers.set('x-request-id', ctx.requestId);
      return csrfFail;
    }

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) {
      auth.headers.set('x-request-id', ctx.requestId);
      return auth;
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { code: 'STORAGE_NOT_CONFIGURED', message: 'Storage not configured' },
        { status: 503, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const form = await req.formData();
    const type = form.get('type');
    if (typeof type !== 'string' || !LEGAL_DOCUMENT_TYPES.includes(type as LegalDocumentType)) {
      return NextResponse.json(
        { code: 'INVALID_DOCUMENT_TYPE', message: 'type must be one of the fixed document types' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { code: 'UPLOAD_MISSING_FILE', message: 'file field is required' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { code: 'FILE_TOO_LARGE', message: `Max ${MAX_BYTES} bytes` },
        { status: 413, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { code: 'INVALID_MIME', message: `MIME ${file.type} not allowed` },
        { status: 415, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const existing = await prisma.legalDocument.findUnique({
      where: { userId_type: { userId: auth.user.sub, type } },
      select: { status: true },
    });
    if (existing?.status === 'VERIFIED') {
      return NextResponse.json(
        { code: 'DOCUMENT_VERIFIED', message: 'A verified document cannot be replaced' },
        { status: 409, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { match, sniffed } = verifyMagicBytes(buf, file.type);
    if (sniffed && !match) {
      return NextResponse.json(
        { code: 'MAGIC_BYTE_MISMATCH', message: 'File bytes do not match declared MIME' },
        { status: 415, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const expiresAtRaw = form.get('expiresAt');
    let expiresAt: Date | null = null;
    if (typeof expiresAtRaw === 'string' && expiresAtRaw.trim()) {
      const parsed = new Date(expiresAtRaw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { code: 'VALIDATION_FAILED', message: 'expiresAt must be a valid date' },
          { status: 400, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      expiresAt = parsed;
    }

    const filename = sanitizeFilename(file.name);
    const publicId = `legal-documents/${auth.user.sub}/${type}-${randomUUID()}`;

    let uploaded;
    try {
      uploaded = await uploadBuffer(publicId, buf, file.type);
    } catch (e) {
      if (e instanceof StorageNotConfiguredError) {
        return NextResponse.json(
          { code: 'STORAGE_NOT_CONFIGURED', message: 'Storage not configured' },
          { status: 503, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      return NextResponse.json(
        { code: 'UPLOAD_FAILED', message: 'Storage write failed' },
        { status: 502, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const row = await prisma.legalDocument.upsert({
      where: { userId_type: { userId: auth.user.sub, type } },
      create: {
        userId: auth.user.sub,
        type,
        status: 'PENDING',
        key: uploaded.publicId,
        url: uploaded.secureUrl,
        filename,
        mimeType: file.type,
        sizeBytes: uploaded.bytes,
        expiresAt,
      },
      update: {
        status: 'PENDING',
        key: uploaded.publicId,
        url: uploaded.secureUrl,
        filename,
        mimeType: file.type,
        sizeBytes: uploaded.bytes,
        expiresAt,
        rejectionReason: null,
      },
      select: {
        type: true,
        status: true,
        url: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        expiresAt: true,
        rejectionReason: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { document: row },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
