'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  Users,
  CalendarCheck,
  BadgePercent,
  TrendingUp,
  TrendingDown,
  Search,
  Share2,
  Mail,
  Link2,
  Loader2,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { STATUS_LABEL, formatListingPrice } from '@/lib/listings';
import type { ListingStatsResponse, StatsPeriod } from '@/lib/listing-stats';

type Period = StatsPeriod;
type StatsResponse = ListingStatsResponse;

const PERIODS: { id: Period; label: string }[] = [
  { id: '7j', label: '7 jours' },
  { id: '30j', label: '30 jours' },
  { id: '3m', label: '3 mois' },
  { id: '1a', label: '1 an' },
];

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#9CA3AF',
  PENDING: '#F59E0B',
  VERIFIED: '#376BFF',
  SOLD: '#10B981',
};

const DOCUMENTS_COLOR = ['#10B981', '#F59E0B', '#EF4444', '#376BFF'];

const SOURCE_META: Record<
  string,
  { label: string; icon: typeof Search; bg: string; color: string }
> = {
  ORGANIC: { label: 'Recherche organique', icon: Search, bg: 'bg-brand/10', color: '#376BFF' },
  SOCIAL: { label: 'Réseaux sociaux', icon: Share2, bg: 'bg-emerald-50', color: '#10B981' },
  EMAIL: { label: 'Email / Newsletters', icon: Mail, bg: 'bg-amber-50', color: '#F59E0B' },
  DIRECT: { label: 'Liens directs', icon: Link2, bg: 'bg-violet-50', color: '#7C3AED' },
  OTHER: { label: 'Autres sources', icon: Link2, bg: 'bg-gray-100', color: '#9CA3AF' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

function donutSegments(data: { pct: number; color: string }[]) {
  const r = 15.9155;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return data.map((d) => {
    const dash = (d.pct / 100) * circumference;
    const seg = {
      color: d.color,
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offset,
    };
    offset += dash;
    return seg;
  });
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white">
      <div className="border-b border-black/[0.06] p-5">
        <p className="font-sora text-[14px] font-semibold text-neutral-900">{title}</p>
        <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TrendBadge({ up, trendPct }: { up: boolean; trendPct: number }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-[11.5px] font-semibold',
        up ? 'text-emerald-600' : 'text-red-600',
      )}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" aria-hidden />
      ) : (
        <TrendingDown className="h-3 w-3" aria-hidden />
      )}
      {trendPct > 0 ? '+' : ''}
      {trendPct}%
    </span>
  );
}

function svgLinePath(
  values: number[],
  width: number,
  height: number,
): { line: string; area: string } {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - (v / max) * height;
    return { x, y };
  });
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area };
}

export default function StatistiquesPage() {
  const user = useUser();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('30j');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api<StatsResponse>(`/api/listings/stats?period=${period}`)
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch((e) => {
        if (cancelled) return;
        toast(
          e instanceof ApiError ? e.message : 'Impossible de charger les statistiques.',
          'error',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, period, toast]);

  const donut = useMemo(() => {
    if (!stats) return [];
    return stats.statusBreakdown.map((s) => ({
      label: STATUS_LABEL[s.status] ?? s.status,
      value: s.count,
      pct: s.pct,
      color: STATUS_COLOR[s.status] ?? '#9CA3AF',
    }));
  }, [stats]);

  const donutSegs = useMemo(() => donutSegments(donut), [donut]);
  const donutTotal = donut.reduce((sum, d) => sum + d.value, 0);
  const maxBar = Math.max(1, ...(stats?.contactsByDay.map((b) => b.value) ?? [0]));

  const chart = useMemo(() => {
    if (!stats || stats.viewsTimeseries.length === 0) return null;
    return svgLinePath(
      stats.viewsTimeseries.map((v) => v.count),
      480,
      130,
    );
  }, [stats]);

  const kpiCards = stats
    ? [
        {
          label: "Vues d'annonces",
          icon: Eye,
          kpi: stats.kpis.views,
          bg: 'bg-brand/10',
          color: 'text-brand',
        },
        {
          label: 'Contacts reçus',
          icon: Users,
          kpi: stats.kpis.contacts,
          bg: 'bg-emerald-100',
          color: 'text-emerald-600',
        },
        {
          label: 'Visites réalisées',
          icon: CalendarCheck,
          kpi: stats.kpis.visits,
          bg: 'bg-amber-100',
          color: 'text-amber-600',
        },
        {
          label: 'Taux de conversion',
          icon: BadgePercent,
          kpi: stats.kpis.conversionRate,
          bg: 'bg-violet-100',
          color: 'text-violet-600',
          suffix: '%',
        },
      ]
    : [];

  return (
    <DashboardShell active="stats" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Statistiques
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Analyse de la performance de vos annonces et de votre activité.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={cn(
                  'rounded-md px-3.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap',
                  period === p.id ? 'bg-brand font-semibold text-white' : 'text-gray-400',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-gray-400"
          >
            <Download className="h-[14px] w-[14px]" aria-hidden />
            <span className="hidden lg:inline">Exporter</span>
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        </div>
      ) : !stats ? null : (
        <>
          {/* KPI STATS */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpiCards.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.bg)}>
                    <s.icon className={cn('h-[18px] w-[18px]', s.color)} aria-hidden />
                  </span>
                  <TrendBadge up={s.kpi.up} trendPct={s.kpi.trendPct} />
                </div>
                <p className="font-sora text-2xl font-semibold text-neutral-900">
                  {s.kpi.value.toLocaleString('fr-FR')}
                  {s.suffix ?? ''}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ROW 1: LINE + DONUT */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard
              title="Évolution des vues"
              subtitle={`Vues quotidiennes sur la période sélectionnée`}
            >
              {chart ? (
                <svg viewBox="0 0 480 130" preserveAspectRatio="none" className="h-[130px] w-full">
                  <path d={chart.area} fill="#EEF3FF" opacity="0.7" />
                  <path
                    d={chart.line}
                    fill="none"
                    stroke="#376BFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <p className="py-10 text-center text-xs text-gray-400">Aucune vue enregistrée.</p>
              )}
              <div className="mt-1.5 flex justify-between">
                {stats.viewsTimeseries.length > 0 && (
                  <>
                    <span className="text-[10.5px] text-gray-400">
                      {stats.viewsTimeseries[0]!.date}
                    </span>
                    <span className="text-[10.5px] text-gray-400">
                      {stats.viewsTimeseries[stats.viewsTimeseries.length - 1]!.date}
                    </span>
                  </>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Répartition des annonces" subtitle="Par statut de publication">
              {donutTotal === 0 ? (
                <p className="py-10 text-center text-xs text-gray-400">Aucune annonce publiée.</p>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="relative h-[120px] w-[120px] flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke="#F3F4F6"
                        strokeWidth="4.8"
                      />
                      {donutSegs.map((seg, i) => (
                        <circle
                          key={donut[i]!.label}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="4.8"
                          strokeDasharray={seg.dasharray}
                          strokeDashoffset={seg.dashoffset}
                          strokeLinecap="round"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-sora text-xl font-semibold text-neutral-900">
                        {donutTotal}
                      </span>
                      <span className="text-[10px] text-gray-400">annonces</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5">
                    {donut.map((d) => (
                      <div key={d.label} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="flex-1 text-xs text-neutral-700">{d.label}</span>
                        <span className="text-xs font-semibold text-neutral-900">
                          {d.value} — {d.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          {/* ROW 2: BAR + PROGRESS + RANKING */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ChartCard title="Contacts reçus" subtitle="Par jour cette semaine">
              <div className="flex h-[140px] items-end gap-2.5">
                {stats.contactsByDay.map((b) => (
                  <div key={b.day} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-neutral-900">{b.value}</span>
                    <div className="flex h-[110px] w-full items-end justify-center">
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${(b.value / maxBar) * 100}%`,
                          backgroundColor: '#376BFF',
                          opacity: 0.35 + (b.value / maxBar) * 0.65,
                        }}
                      />
                    </div>
                    <span className="text-[10.5px] font-medium text-gray-400">{b.day}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Suivi des documents" subtitle="État des dossiers en cours">
              <div className="flex flex-col gap-4">
                {stats.documentsProgress.map((d, i) => (
                  <div key={d.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[12.5px] font-medium text-neutral-700">{d.label}</span>
                      <span className="text-xs font-semibold" style={{ color: DOCUMENTS_COLOR[i] }}>
                        {d.value}
                      </span>
                    </div>
                    <div className="h-[7px] w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${d.pct}%`, backgroundColor: DOCUMENTS_COLOR[i] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Top annonces" subtitle="Par nombre de contacts reçus">
              {stats.topListings.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-400">Aucun contact reçu.</p>
              ) : (
                <div className="flex flex-col">
                  {stats.topListings.map((l, i) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-3 border-b border-black/[0.05] py-2.5 last:border-0"
                    >
                      <span className="w-5 flex-shrink-0 text-center text-[13px] font-semibold text-gray-400">
                        {MEDALS[i] ?? i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-neutral-900">
                          {l.title}
                        </p>
                        <p className="truncate text-[11.5px] text-gray-400">
                          {l.city}, {l.country} · {formatListingPrice(l.price, l.currency)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[13px] font-semibold text-neutral-900">{l.contacts}</p>
                        <p className="text-[11px] text-gray-400">contacts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>

          {/* ROW 3: SOURCES */}
          <div className="grid grid-cols-1 gap-5">
            <ChartCard title="Sources de trafic" subtitle="D'où viennent vos visiteurs">
              {stats.trafficSources.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-400">
                  Pas encore assez de vues pour analyser les sources.
                </p>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {stats.trafficSources.map((s) => {
                    const meta = SOURCE_META[s.source] ?? SOURCE_META.OTHER!;
                    return (
                      <div key={s.source}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-md',
                                meta.bg,
                              )}
                            >
                              <meta.icon
                                className="h-[13px] w-[13px]"
                                style={{ color: meta.color }}
                                aria-hidden
                              />
                            </span>
                            <span className="text-[13px] font-medium text-neutral-900">
                              {meta.label}
                            </span>
                          </div>
                          <span className="text-[13px] font-semibold text-neutral-900">
                            {s.pct}%
                          </span>
                        </div>
                        <div className="h-[7px] w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${s.pct}%`, backgroundColor: meta.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
