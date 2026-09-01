// PUBLIC-CONTACT-01 — POST /api/public/contact
//
// Unauthenticated contact-form submission from /contact. Same pre-session
// CSRF carve-out and per-IP rate-limit pattern as the listing inquiry/
// report endpoints — an anonymous visitor has no CSRF cookie and no
// account to key the limiter on. The row is always persisted for admin
// review even if the best-effort email to CONTACT_INBOX_EMAIL fails or
// the env var is unset (graceful degradation, same as every other
// optional provider in this starter).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';
import { log } from '@/lib/server/observability/log';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1).max(30).optional(),
  country: z.string().trim().min(1).max(120).optional(),
  subject: z.enum(['GENERAL', 'SUPPORT', 'PARTNERSHIP', 'AGENT', 'PRESS', 'OTHER']),
  message: z.string().trim().min(1).max(2000),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'contact-message',
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: 'TOO_MANY_MESSAGES',
  message: 'Too many requests. Try again later.',
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const limited = await limiter.check(req, null);
    if (limited) return limited;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        // exactOptionalPropertyTypes: only set the key when defined —
        // assigning `phone: undefined` explicitly is a type error against
        // Prisma's `phone?: string | null` input shape.
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
        ...(parsed.data.country !== undefined && { country: parsed.data.country }),
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });

    try {
      const inboxEmail = process.env.CONTACT_INBOX_EMAIL;
      const queue = getEmailQueue();
      if (inboxEmail && queue) {
        await queue.enqueue({
          to: inboxEmail,
          subject: `Nouveau message de contact — ${parsed.data.subject}`,
          html: `<p>${parsed.data.firstName} ${parsed.data.lastName} (${parsed.data.email}) : ${parsed.data.message}</p>`,
          text: `${parsed.data.firstName} ${parsed.data.lastName} (${parsed.data.email}): ${parsed.data.message}`,
        });
      }
    } catch (err) {
      log.warn('contact-message: email dispatch failed', {
        contactMessageId: contactMessage.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
