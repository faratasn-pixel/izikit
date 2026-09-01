// ALERTS-03 — GET /api/alerts/[id]
//
// Single Alert detail (frontend/src/app/alertes/[id]/page.tsx). Only the
// owning user can view their own alert — 404 (not 403) on mismatch/missing,
// same convention as GET /api/requests/[id].
//
// ALERTS-04 — PATCH /api/alerts/[id]
//
// Toggles `active` (Activer/Désactiver switch on the detail page). No other
// field is editable through this route yet — there is no "modifier alerte"
// flow (separate future screen), same posture as listings PATCH being
// DRAFT-only.
//
// ALERTS-05 — DELETE /api/alerts/[id]
//
// Deletes an owned alert ("Supprimer" button on the detail page).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const ALERT_SELECT = {
  id: true,
  userId: true,
  name: true,
  transactionType: true,
  propertyTypes: true,
  country: true,
  cities: true,
  priceMin: true,
  priceMax: true,
  frequency: true,
  notifWhatsapp: true,
  notifEmail: true,
  notifSms: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ALERT_WITH_MATCHES_SELECT = {
  ...ALERT_SELECT,
  matches: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      createdAt: true,
      propertyRequest: {
        select: {
          id: true,
          transactionType: true,
          propertyType: true,
          country: true,
          city: true,
          budgetMin: true,
          budgetMax: true,
          clientName: true,
          createdAt: true,
        },
      },
    },
  },
} as const;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await ctx.params;

    const alert = await prisma.alert.findUnique({
      where: { id },
      select: ALERT_WITH_MATCHES_SELECT,
    });
    if (!alert || alert.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'ALERT_NOT_FOUND', message: 'Alert not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    return NextResponse.json(
      { alert },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}

const PatchBody = z.object({
  active: z.boolean(),
});

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

    const existing = await prisma.alert.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'ALERT_NOT_FOUND', message: 'Alert not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: { active: parsed.data.active },
      select: ALERT_SELECT,
    });

    return NextResponse.json(
      { alert },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}

export async function DELETE(
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

    const existing = await prisma.alert.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'ALERT_NOT_FOUND', message: 'Alert not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    await prisma.alert.delete({ where: { id } });

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
