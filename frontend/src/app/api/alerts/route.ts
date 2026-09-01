// ALERTS-01 — GET /api/alerts
//
// Cursor-paginated list of the current user's own sector alerts
// ("Alerte secteur" grid on frontend/src/app/alertes/page.tsx). Scoped to
// `userId = auth.user.sub` — same convention as GET /api/requests.
//
// ALERTS-02 — POST /api/alerts
//
// Creates an Alert in one shot — same single-shot-create pattern as
// POST /api/requests (frontend/src/app/alertes/new/page.tsx).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { runMatchingForNewAlert } from '@/lib/server/alerts/matching';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const url = req.nextUrl;
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursor = decodeCursor(url.searchParams.get('cursor'));

    const [rows, total, active, inactive] = await Promise.all([
      prisma.alert.findMany({
        where: { userId: auth.user.sub, ...cursorWhere(cursor) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
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
        },
      }),
      prisma.alert.count({ where: { userId: auth.user.sub } }),
      prisma.alert.count({ where: { userId: auth.user.sub, active: true } }),
      prisma.alert.count({ where: { userId: auth.user.sub, active: false } }),
    ]);

    return NextResponse.json(
      {
        ...buildPage(rows, limit),
        counts: { total, active, inactive },
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const TRANSACTION_TYPES = ['VENTE', 'LOCATION', 'SEJOUR', 'AUBERGE'] as const;
const PROPERTY_TYPES = [
  'VILLA',
  'APPARTEMENT',
  'PARCELLE',
  'DOMAINE',
  'MAISON',
  'BOUTIQUE',
  'BUREAU',
  'SALLE_FETE',
  'SALLE_CONFERENCE',
  'IMMEUBLE',
] as const;
const FREQUENCIES = ['QUOTIDIENNE', 'HEBDOMADAIRE'] as const;

const CreateBody = z.object({
  name: z.string().trim().min(1).max(120),
  transactionType: z.enum(TRANSACTION_TYPES),
  propertyTypes: z.array(z.enum(PROPERTY_TYPES)).min(1).max(PROPERTY_TYPES.length),
  country: z.string().trim().min(1).max(120),
  cities: z.array(z.string().trim().min(1).max(120)).min(1).max(10),
  priceMin: z.number().int().nonnegative().optional(),
  priceMax: z.number().int().nonnegative().optional(),
  frequency: z.enum(FREQUENCIES).default('QUOTIDIENNE'),
  notifWhatsapp: z.boolean().default(true),
  notifEmail: z.boolean().default(true),
  notifSms: z.boolean().default(false),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const data = parsed.data;
    if (
      data.priceMin !== undefined &&
      data.priceMax !== undefined &&
      data.priceMin > data.priceMax
    ) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'priceMin must be <= priceMax' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    if (data.notifSms || data.notifWhatsapp) {
      const requester = await prisma.user.findUnique({
        where: { id: auth.user.sub },
        select: { phone: true },
      });
      if (!requester?.phone) {
        return NextResponse.json(
          {
            error: 'PHONE_REQUIRED',
            message: 'Add a phone number to your profile to enable SMS/WhatsApp alerts',
          },
          { status: 400, headers: { 'x-request-id': ctx.requestId } },
        );
      }
    }

    const alert = await prisma.alert.create({
      data: {
        userId: auth.user.sub,
        name: data.name,
        transactionType: data.transactionType,
        propertyTypes: data.propertyTypes,
        country: data.country,
        cities: data.cities,
        priceMin: data.priceMin ?? null,
        priceMax: data.priceMax ?? null,
        frequency: data.frequency,
        notifWhatsapp: data.notifWhatsapp,
        notifEmail: data.notifEmail,
        notifSms: data.notifSms,
      },
      select: { id: true, name: true, active: true, createdAt: true },
    });

    try {
      await runMatchingForNewAlert(prisma, {
        id: alert.id,
        userId: auth.user.sub,
        name: data.name,
        transactionType: data.transactionType,
        propertyTypes: data.propertyTypes,
        country: data.country,
        cities: data.cities,
        priceMin: data.priceMin ?? null,
        priceMax: data.priceMax ?? null,
        notifEmail: data.notifEmail,
        notifSms: data.notifSms,
        notifWhatsapp: data.notifWhatsapp,
      });
    } catch (err) {
      log.warn('alerts: matching failed for new alert', {
        alertId: alert.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json(
      { alert },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
