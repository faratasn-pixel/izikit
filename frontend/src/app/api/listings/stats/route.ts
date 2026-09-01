// LISTINGS-STATS-01 — GET /api/listings/stats
//
// Aggregated dashboard data for the "/statistiques" page (KPIs, views
// timeseries, listing-status breakdown, contacts-by-weekday, document
// verification progress, top listings, and traffic-source split), scoped
// to the current user's own listings. `?period=7j|30j|3m|1a` (default 30j)
// controls the window; KPI trends compare against the immediately
// preceding period of equal length.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const PERIOD_DAYS: Record<string, number> = { '7j': 7, '30j': 30, '3m': 90, '1a': 365 };

const DOCUMENT_TYPES = ['LAND_TITLE', 'SALE_MANDATE', 'CADASTRAL_PLAN'] as const;
const LISTING_STATUSES = ['DRAFT', 'PENDING', 'VERIFIED', 'SOLD'] as const;
const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function trend(current: number, previous: number): { trendPct: number; up: boolean } {
  if (previous === 0) return { trendPct: current > 0 ? 100 : 0, up: current >= 0 };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { trendPct: pct, up: pct >= 0 };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const userId = auth.user.sub;

    const periodParam = req.nextUrl.searchParams.get('period') ?? '30j';
    const days = PERIOD_DAYS[periodParam] ?? PERIOD_DAYS['30j']!;

    const now = new Date();
    const start = new Date(now.getTime() - days * 86_400_000);
    const prevStart = new Date(start.getTime() - days * 86_400_000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    const listingScope = { listing: { userId } } as const;

    const [
      viewsCurrent,
      viewsPrevious,
      contactsCurrent,
      contactsPrevious,
      visitsCurrent,
      visitsPrevious,
      statusCounts,
      totalListings,
      docsByType,
      pendingDocs,
      listingsWithDocs,
      topListingsRaw,
      viewRows,
      inquiryDaysRaw,
      newListingsInPeriod,
      upcomingVisitsCount,
    ] = await Promise.all([
      prisma.listingView.count({ where: { ...listingScope, createdAt: { gte: start } } }),
      prisma.listingView.count({
        where: { ...listingScope, createdAt: { gte: prevStart, lt: start } },
      }),
      prisma.listingInquiry.count({ where: { ...listingScope, createdAt: { gte: start } } }),
      prisma.listingInquiry.count({
        where: { ...listingScope, createdAt: { gte: prevStart, lt: start } },
      }),
      prisma.visit.count({
        where: {
          inquiry: { listing: { userId } },
          status: 'CONFIRMEE',
          scheduledAt: { gte: start },
        },
      }),
      prisma.visit.count({
        where: {
          inquiry: { listing: { userId } },
          status: 'CONFIRMEE',
          scheduledAt: { gte: prevStart, lt: start },
        },
      }),
      Promise.all(
        LISTING_STATUSES.map((status) => prisma.listing.count({ where: { userId, status } })),
      ),
      prisma.listing.count({ where: { userId, status: { not: 'DRAFT' } } }),
      Promise.all(
        DOCUMENT_TYPES.map((type) =>
          prisma.listingDocument.count({
            where: { listing: { userId }, type, status: 'VERIFIED' },
          }),
        ),
      ),
      prisma.listingDocument.count({ where: { listing: { userId }, status: 'PENDING' } }),
      prisma.listing.findMany({
        where: { userId, status: { not: 'DRAFT' }, documents: { some: {} } },
        select: { id: true },
      }),
      prisma.listing.findMany({
        where: { userId, status: { not: 'DRAFT' } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          title: true,
          city: true,
          country: true,
          propertyType: true,
          transactionType: true,
          price: true,
          currency: true,
          _count: { select: { inquiries: { where: { createdAt: { gte: start } } } } },
        },
      }),
      prisma.listingView.findMany({
        where: { ...listingScope, createdAt: { gte: start } },
        select: { createdAt: true, source: true },
      }),
      prisma.listingInquiry.findMany({
        where: { ...listingScope, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.listing.count({
        where: { userId, status: { not: 'DRAFT' }, createdAt: { gte: start } },
      }),
      prisma.visit.count({
        where: {
          inquiry: { listing: { userId } },
          status: { in: ['EN_ATTENTE', 'CONFIRMEE'] },
          scheduledAt: { gte: now },
        },
      }),
    ]);

    const conversionCurrent = viewsCurrent > 0 ? (contactsCurrent / viewsCurrent) * 100 : 0;
    const conversionPrevious = viewsPrevious > 0 ? (contactsPrevious / viewsPrevious) * 100 : 0;

    const statusBreakdown = LISTING_STATUSES.map((status, i) => ({
      status,
      count: statusCounts[i]!,
      pct: totalListings > 0 ? Math.round((statusCounts[i]! / totalListings) * 100) : 0,
    })).filter((s) => s.count > 0);

    const missingDocuments = totalListings - listingsWithDocs.length;
    const documentsProgress = [
      {
        label: 'Titres fonciers validés',
        value: `${docsByType[0]} ann.`,
        pct: totalListings > 0 ? Math.round((docsByType[0]! / totalListings) * 100) : 0,
      },
      {
        label: 'En cours de vérification',
        value: `${pendingDocs} ann.`,
        pct: totalListings > 0 ? Math.round((pendingDocs / totalListings) * 100) : 0,
      },
      {
        label: 'Documents manquants',
        value: `${missingDocuments} ann.`,
        pct: totalListings > 0 ? Math.round((missingDocuments / totalListings) * 100) : 0,
      },
      {
        label: 'Mandats signés',
        value: `${docsByType[1]} ann.`,
        pct: totalListings > 0 ? Math.round((docsByType[1]! / totalListings) * 100) : 0,
      },
    ];

    const topListings = topListingsRaw
      .map((l) => ({
        id: l.id,
        title: l.title,
        city: l.city,
        country: l.country,
        propertyType: l.propertyType,
        transactionType: l.transactionType,
        price: l.price,
        currency: l.currency,
        contacts: l._count.inquiries,
      }))
      .sort((a, b) => b.contacts - a.contacts)
      .slice(0, 5);

    const viewsByDay = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    for (const v of viewRows) {
      const key = dateKey(v.createdAt);
      viewsByDay.set(key, (viewsByDay.get(key) ?? 0) + 1);
      sourceCounts.set(v.source, (sourceCounts.get(v.source) ?? 0) + 1);
    }
    const viewsTimeseries: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      const key = dateKey(d);
      viewsTimeseries.push({ date: key, count: viewsByDay.get(key) ?? 0 });
    }

    const totalViewsForSources = viewRows.length;
    const trafficSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({
        source,
        pct: totalViewsForSources > 0 ? Math.round((count / totalViewsForSources) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    const contactsByDayCounts = new Array(7).fill(0) as number[];
    for (const inq of inquiryDaysRaw) {
      contactsByDayCounts[inq.createdAt.getDay()]! += 1;
    }
    const contactsByDay: { day: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      contactsByDay.push({
        day: WEEKDAY_LABELS[d.getDay()]!,
        value: contactsByDayCounts[d.getDay()]!,
      });
    }

    return NextResponse.json(
      {
        period: periodParam,
        kpis: {
          views: { value: viewsCurrent, ...trend(viewsCurrent, viewsPrevious) },
          contacts: { value: contactsCurrent, ...trend(contactsCurrent, contactsPrevious) },
          visits: { value: visitsCurrent, ...trend(visitsCurrent, visitsPrevious) },
          conversionRate: {
            value: Math.round(conversionCurrent * 10) / 10,
            ...trend(conversionCurrent, conversionPrevious),
          },
        },
        viewsTimeseries,
        statusBreakdown,
        contactsByDay,
        documentsProgress,
        topListings,
        trafficSources,
        totalListingsCount: totalListings,
        newListingsInPeriod,
        upcomingVisitsCount,
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
