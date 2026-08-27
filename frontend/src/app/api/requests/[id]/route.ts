// REQUESTS-03 — GET /api/requests/[id]
//
// Single PropertyRequest detail (frontend/src/app/demandes/[id]/page.tsx).
// Only the owning agent can view their own request — 404 (not 403) on
// mismatch/missing, same convention as GET /api/listings/[id] would use.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const REQUEST_SELECT = {
  id: true,
  userId: true,
  transactionType: true,
  propertyType: true,
  country: true,
  city: true,
  bedrooms: true,
  salons: true,
  surfaceM2: true,
  capacity: true,
  amenities: true,
  priority: true,
  budgetMin: true,
  budgetMax: true,
  financing: true,
  delay: true,
  clientName: true,
  clientPhone: true,
  clientEmail: true,
  clientType: true,
  source: true,
  status: true,
  createdAt: true,
  updatedAt: true,
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

    const propertyRequest = await prisma.propertyRequest.findUnique({
      where: { id },
      select: REQUEST_SELECT,
    });
    if (!propertyRequest || propertyRequest.userId !== auth.user.sub) {
      return NextResponse.json(
        { error: 'REQUEST_NOT_FOUND', message: 'Property request not found' },
        { status: 404, headers: { 'x-request-id': reqCtx.requestId } },
      );
    }

    return NextResponse.json(
      { propertyRequest },
      { status: 200, headers: { 'x-request-id': reqCtx.requestId } },
    );
  });
}
