// PUBLIC-PROPERTY-REQUEST-01 — POST /api/public/property-requests
//
// Unauthenticated "demande immobilière" submission from the public wizard
// (frontend/src/app/demande-immobiliere/nouvelle). Same pre-session
// carve-out as the listing inquiry/report/contact routes: no CSRF check,
// per-IP rate limit. Creates a real PropertyRequest with userId=null
// (unowned — an agent can pick it up later) and feeds it into the
// existing alert-matching engine, same as the agent-authored flow at
// POST /api/requests.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { runMatchingForNewRequest } from '@/lib/server/alerts/matching';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

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
const FINANCINGS = ['Comptant', 'Crédit', 'Les deux'] as const;
const DELAYS = ['Immédiat', '1–3 mois', '3–6 mois', 'Flexible'] as const;

const Body = z.object({
  transactionType: z.enum(TRANSACTION_TYPES),
  propertyType: z.enum(PROPERTY_TYPES),
  country: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  landmark: z.string().trim().max(200).optional(),
  bedrooms: z.string().trim().min(1).max(40).optional(),
  surfaceMin: z.number().int().positive().optional(),
  surfaceMax: z.number().int().positive().optional(),
  amenities: z.array(z.string().max(40)).max(30).default([]),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  financing: z.enum(FINANCINGS),
  delay: z.enum(DELAYS),
  clientName: z.string().trim().min(1).max(200),
  clientPhone: z.string().trim().min(1).max(40),
  clientEmail: z.string().trim().email().max(200).optional(),
  notes: z.string().trim().max(4000).optional(),
});

const limiter = createEmailLimiter(redis ? { redis } : {}, {
  bucket: 'public-property-request',
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: 'TOO_MANY_REQUESTS',
  message: 'Too many requests. Try again later.',
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const limited = await limiter.check(req, null);
    if (limited) return limited;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const data = parsed.data;
    // surfaceMin/surfaceMax on the wizard collapse to the single
    // PropertyRequest.surfaceM2 column — store the minimum as the
    // baseline requirement (max lives on in `notes` if provided).
    const surfaceM2 = data.surfaceMin ?? data.surfaceMax ?? undefined;

    const notesParts: string[] = [];
    if (data.surfaceMin !== undefined && data.surfaceMax !== undefined) {
      notesParts.push(`Superficie souhaitée : ${data.surfaceMin} – ${data.surfaceMax} m²`);
    }
    if (data.notes) notesParts.push(data.notes);

    const propertyRequest = await prisma.propertyRequest.create({
      data: {
        userId: null,
        transactionType: data.transactionType,
        propertyType: data.propertyType,
        country: data.country,
        city: data.city,
        ...(data.landmark !== undefined && { landmark: data.landmark }),
        ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
        ...(surfaceM2 !== undefined && { surfaceM2 }),
        amenities: data.amenities,
        ...(data.budgetMin !== undefined && { budgetMin: data.budgetMin }),
        ...(data.budgetMax !== undefined && { budgetMax: data.budgetMax }),
        financing: data.financing,
        delay: data.delay,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail }),
        source: 'Site web',
        ...(notesParts.length > 0 && { notes: notesParts.join('\n\n') }),
      },
      select: { id: true, status: true, createdAt: true },
    });

    try {
      await runMatchingForNewRequest(prisma, {
        id: propertyRequest.id,
        userId: null,
        transactionType: data.transactionType,
        propertyType: data.propertyType,
        country: data.country,
        city: data.city,
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        clientName: data.clientName,
      });
    } catch (err) {
      log.warn('public-property-request: matching failed for new request', {
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
