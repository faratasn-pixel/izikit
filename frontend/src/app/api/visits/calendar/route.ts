// VISITS-04 — GET /api/visits/calendar
//
// Feeds the /visites "Calendrier" tab: the month grid (`days`, keyed by
// `?year`/`?month`, defaulting to the current month) plus `today` and
// `upcoming` agendas. `today`/`upcoming` are always computed against the
// real current date regardless of which month is displayed — navigating
// the grid must not move the side panel. Cancelled visits (`ANNULEE`) are
// excluded from `today`/`upcoming` (they're not something to act on today)
// but still shown in the month grid (still useful history there).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { PROPERTY_TYPE_LABEL } from '@/lib/listings';

function parseYearMonth(url: URL): { year: number; month: number } {
  const now = new Date();
  const yearParam = Number.parseInt(url.searchParams.get('year') ?? '', 10);
  const monthParam = Number.parseInt(url.searchParams.get('month') ?? '', 10);
  const year = Number.isInteger(yearParam) && yearParam > 0 ? yearParam : now.getFullYear();
  const month =
    Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : now.getMonth() + 1;
  return { year, month };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { year, month } = parseYearMonth(req.nextUrl);
    const scope = { inquiry: { listing: { userId: auth.user.sub } } } as const;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const agendaSelect = {
      id: true,
      scheduledAt: true,
      status: true,
      inquiry: { select: { name: true, listing: { select: { title: true } } } },
    } as const;

    const [monthVisits, todayVisits, upcomingVisits] = await Promise.all([
      prisma.visit.findMany({
        where: { ...scope, scheduledAt: { gte: monthStart, lt: monthEnd } },
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          inquiry: { select: { listing: { select: { city: true, propertyType: true } } } },
        },
      }),
      prisma.visit.findMany({
        where: {
          ...scope,
          status: { not: 'ANNULEE' },
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
        orderBy: { scheduledAt: 'asc' },
        select: agendaSelect,
      }),
      prisma.visit.findMany({
        where: { ...scope, status: { not: 'ANNULEE' }, scheduledAt: { gt: now } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: agendaSelect,
      }),
    ]);

    const dayMap = new Map<string, { id: string; label: string; status: string }[]>();
    for (const v of monthVisits) {
      const key = dateKey(v.scheduledAt);
      const propertyType = v.inquiry.listing.propertyType;
      const label = `${PROPERTY_TYPE_LABEL[propertyType] ?? propertyType}, ${v.inquiry.listing.city}`;
      const events = dayMap.get(key) ?? [];
      events.push({ id: v.id, label, status: v.status });
      dayMap.set(key, events);
    }
    const days = Array.from(dayMap.entries()).map(([date, events]) => ({ date, events }));

    const toAgenda = (rows: typeof todayVisits) =>
      rows.map((v) => ({
        id: v.id,
        listingTitle: v.inquiry.listing.title,
        scheduledAt: v.scheduledAt.toISOString(),
        clientName: v.inquiry.name,
        status: v.status,
      }));

    return NextResponse.json(
      { days, today: toAgenda(todayVisits), upcoming: toAgenda(upcomingVisits) },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
