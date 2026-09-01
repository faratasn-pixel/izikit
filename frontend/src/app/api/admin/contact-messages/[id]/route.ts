// ADMIN-CONTACT-MESSAGES-02 — PATCH /api/admin/contact-messages/[id]
//
// Marks a contact message READ (admin looked at it) or ARCHIVED (handled,
// no longer actionable). Unlike /api/admin/users/[id]/status, there's no
// same-value no-op suppression — re-marking a message (e.g. re-opening an
// ARCHIVED one back to READ) is a legitimate action here, not audit-log
// noise.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  status: z.enum(['READ', 'ARCHIVED']),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const existing = await prisma.contactMessage.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'CONTACT_MESSAGE_NOT_FOUND', message: 'Contact message not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    await logAdminAction(prisma, {
      actorId: auth.admin.id,
      action: 'contact-message.resolve',
      targetType: 'ContactMessage',
      targetId: id,
      metadata: { from: existing.status, to: parsed.data.status },
    });

    return NextResponse.json(
      { contactMessage: updated },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
