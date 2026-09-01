// PUBLIC-LISTING-INQUIRY-01 — POST /api/public/listings/[id]/inquiries
//
// Unauthenticated lead-capture: a visitor on the public listing detail
// page sends a message or requests a VR visit. No CSRF check — same
// pre-session carve-out as /api/auth/signup (an anonymous visitor has no
// CSRF cookie). Rate-limited per-IP (no email/account to key the limiter
// on — `createEmailLimiter` falls back to the IP bucket when passed
// `email: null`). The notification/email side-effects never block or
// fail the 201 — a lead is still captured even if Brevo/notifications
// are down.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { createNotification } from '@/lib/server/notifications';
import { listingInquiryNotification } from '@/lib/server/notifications/templates';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';
import { log } from '@/lib/server/observability/log';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  type: z.enum(['MESSAGE', 'VR_VISIT']),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(30),
  email: z.string().trim().email().optional(),
  message: z.string().trim().min(1).max(2000),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'listing-inquiry',
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: 'TOO_MANY_INQUIRIES',
  message: 'Too many requests. Try again later.',
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const limited = await limiter.check(req, null);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, userId: true },
    });
    if (!listing || listing.status !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'LISTING_NOT_FOUND', message: 'Listing not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const inquiry = await prisma.listingInquiry.create({
      data: {
        listingId: id,
        type: parsed.data.type,
        name: parsed.data.name,
        phone: parsed.data.phone,
        // exactOptionalPropertyTypes: only set the key when defined —
        // assigning `email: undefined` explicitly is a type error against
        // Prisma's `email?: string | null` input shape.
        ...(parsed.data.email !== undefined && { email: parsed.data.email }),
        message: parsed.data.message,
      },
    });

    try {
      await createNotification(
        prisma,
        listingInquiryNotification(
          listing.userId,
          id,
          listing.title,
          inquiry.id,
          parsed.data.type,
          parsed.data.name,
        ),
      );

      const owner = await prisma.user.findUnique({
        where: { id: listing.userId },
        select: { email: true },
      });
      const queue = getEmailQueue();
      if (owner && queue) {
        const subject =
          parsed.data.type === 'VR_VISIT'
            ? `Demande de visite VR — ${listing.title}`
            : `Nouveau message — ${listing.title}`;
        await queue.enqueue({
          to: owner.email,
          subject,
          html: `<p>${parsed.data.name} (${parsed.data.phone}) : ${parsed.data.message}</p>`,
          text: `${parsed.data.name} (${parsed.data.phone}): ${parsed.data.message}`,
        });
      }
    } catch (err) {
      log.warn('listing-inquiry: notification/email dispatch failed', {
        listingId: id,
        inquiryId: inquiry.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
