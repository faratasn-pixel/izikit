// ALERTS-07 — GET /api/alerts/matches/recent
//
// Aggregates the current user's most recent AlertMatch rows across ALL of
// their alerts (not scoped to one alert — that's GET /api/alerts/[id]).
// Powers the "Correspondances récentes" section + the "Correspondances ce
// mois" / "Demandes consultées" stats on /alertes.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

function clampLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(20, Math.max(1, parsed));
}

function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const MATCH_SELECT = {
  id: true,
  alertId: true,
  alert: { select: { name: true } },
  createdAt: true,
  viewedAt: true,
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
} as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const limit = clampLimit(req.nextUrl.searchParams.get('limit'));
    const userScope = { alert: { userId: auth.user.sub } };

    const [rows, monthlyCount, viewedCount] = await Promise.all([
      prisma.alertMatch.findMany({
        where: userScope,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        select: MATCH_SELECT,
      }),
      prisma.alertMatch.count({
        where: { ...userScope, createdAt: { gte: startOfCurrentMonthUtc() } },
      }),
      prisma.alertMatch.count({
        where: { ...userScope, viewedAt: { not: null } },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      alertId: r.alertId,
      alertName: r.alert.name,
      createdAt: r.createdAt,
      viewedAt: r.viewedAt,
      propertyRequest: r.propertyRequest,
    }));

    return NextResponse.json(
      { items, monthlyCount, viewedCount },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
