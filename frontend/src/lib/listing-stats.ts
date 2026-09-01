// Shared response shape for GET /api/listings/stats — consumed by both
// /statistiques and /dashboard so the two pages never drift out of sync
// with the API contract.

export type StatsPeriod = '7j' | '30j' | '3m' | '1a';

export interface StatsKpi {
  value: number;
  trendPct: number;
  up: boolean;
}

export interface ListingStatsResponse {
  period: StatsPeriod;
  kpis: {
    views: StatsKpi;
    contacts: StatsKpi;
    visits: StatsKpi;
    conversionRate: StatsKpi;
  };
  viewsTimeseries: { date: string; count: number }[];
  statusBreakdown: { status: string; count: number; pct: number }[];
  contactsByDay: { day: string; value: number }[];
  documentsProgress: { label: string; value: string; pct: number }[];
  topListings: {
    id: string;
    title: string;
    city: string;
    country: string;
    propertyType: string;
    transactionType: string;
    price: number;
    currency: string;
    contacts: number;
  }[];
  trafficSources: { source: string; pct: number }[];
  totalListingsCount: number;
  newListingsInPeriod: number;
  upcomingVisitsCount: number;
}
