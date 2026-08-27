// REQUESTS-01 — GET /api/requests
//
// Cursor-paginated list of the current user's own property requests
// ("Demande Immobilière" table on the Agent Dashboard). Scoped to
// `userId = auth.user.sub` — same convention as GET /api/listings.
//
// REQUESTS-02 — POST /api/requests
//
// Creates a PropertyRequest ("demande immobilière") in one shot — unlike
// Listing, this form has no photo-upload step, so there is no draft/patch
// flow: the client submits the full wizard state once, on "Créer la
// demande" (frontend/src/app/demandes/new/page.tsx).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { clampLimit, cursorWhere, decodeCursor, buildPage } from '@/lib/server/pagination/paginate';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { runMatchingForNewRequest } from '@/lib/server/alerts/matching';
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

    const [rows, total, enAttente, enCours, cloturee, enAttenteUrgent] = await Promise.all([
      prisma.propertyRequest.findMany({
        where: { userId: auth.user.sub, ...cursorWhere(cursor) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          transactionType: true,
          propertyType: true,
          country: true,
          city: true,
          budgetMin: true,
          budgetMax: true,
          priority: true,
          status: true,
          clientName: true,
          clientPhone: true,
          createdAt: true,
        },
      }),
      prisma.propertyRequest.count({ where: { userId: auth.user.sub } }),
      prisma.propertyRequest.count({ where: { userId: auth.user.sub, status: 'EN_ATTENTE' } }),
      prisma.propertyRequest.count({ where: { userId: auth.user.sub, status: 'EN_COURS' } }),
      prisma.propertyRequest.count({ where: { userId: auth.user.sub, status: 'CLOTUREE' } }),
      prisma.propertyRequest.count({
        where: { userId: auth.user.sub, status: 'EN_ATTENTE', priority: 'Urgent' },
      }),
    ]);

    return NextResponse.json(
      {
        ...buildPage(rows, limit),
        counts: { total, enAttente, enCours, cloturee, enAttenteUrgent },
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

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
const TRANSACTION_TYPES = ['VENTE', 'LOCATION', 'SEJOUR', 'AUBERGE'] as const;
const PRIORITIES = ['Urgent', 'Normale', 'Basse'] as const;
const FINANCINGS = ['Comptant', 'Crédit', 'Les deux'] as const;
const DELAYS = ['Immédiat', '1–3 mois', '3–6 mois', 'Flexible'] as const;
const CLIENT_TYPES = ['Particulier', 'Entreprise'] as const;

const CreateBody = z.object({
  transactionType: z.enum(TRANSACTION_TYPES),
  propertyType: z.enum(PROPERTY_TYPES),
  country: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  bedrooms: z.string().trim().min(1).max(40).optional(),
  salons: z.string().trim().min(1).max(40).optional(),
  surfaceM2: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  amenities: z.array(z.string().max(40)).max(30).default([]),
  priority: z.enum(PRIORITIES).default('Normale'),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  financing: z.enum(FINANCINGS),
  delay: z.enum(DELAYS),
  clientName: z.string().trim().min(1).max(200),
  clientPhone: z.string().trim().min(1).max(40),
  clientEmail: z.string().trim().email().max(200).optional(),
  clientType: z.enum(CLIENT_TYPES).default('Particulier'),
  source: z.string().trim().max(80).optional(),
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
    const propertyRequest = await prisma.propertyRequest.create({
      data: {
        userId: auth.user.sub,
        transactionType: data.transactionType,
        propertyType: data.propertyType,
        country: data.country,
        city: data.city,
        bedrooms: data.bedrooms ?? null,
        salons: data.salons ?? null,
        surfaceM2: data.surfaceM2 ?? null,
        capacity: data.capacity ?? null,
        amenities: data.amenities,
        priority: data.priority,
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        financing: data.financing,
        delay: data.delay,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail ?? null,
        clientType: data.clientType,
        source: data.source ?? null,
      },
      select: { id: true, status: true, createdAt: true },
    });

    try {
      await runMatchingForNewRequest(prisma, {
        id: propertyRequest.id,
        userId: auth.user.sub,
        transactionType: data.transactionType,
        propertyType: data.propertyType,
        country: data.country,
        city: data.city,
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        clientName: data.clientName,
      });
    } catch (err) {
      log.warn('requests: matching failed for new request', {
        requestId: propertyRequest.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json(
      { propertyRequest },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
