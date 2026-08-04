'use client';

import { useState } from 'react';
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
  MapPin,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';

type Period = '7j' | '30j' | '3m' | '1a';

const PERIODS: { id: Period; label: string }[] = [
  { id: '7j', label: '7 jours' },
  { id: '30j', label: '30 jours' },
  { id: '3m', label: '3 mois' },
  { id: '1a', label: '1 an' },
];

const KPI_STATS = [
  {
    label: "Vues d'annonces",
    icon: Eye,
    value: '2 847',
    trend: '+18%',
    up: true,
    bg: 'bg-brand/10',
    color: 'text-brand',
  },
  {
    label: 'Contacts reçus',
    icon: Users,
    value: '134',
    trend: '+12%',
    up: true,
    bg: 'bg-emerald-100',
    color: 'text-emerald-600',
  },
  {
    label: 'Visites réalisées',
    icon: CalendarCheck,
    value: '24',
    trend: '+5%',
    up: true,
    bg: 'bg-amber-100',
    color: 'text-amber-600',
  },
  {
    label: 'Taux de conversion',
    icon: BadgePercent,
    value: '4,7%',
    trend: '-2%',
    up: false,
    bg: 'bg-violet-100',
    color: 'text-violet-600',
  },
];

const DONUT = [
  { label: 'Vérifié', value: 24, pct: 58, color: '#376BFF' },
  { label: 'En attente', value: 12, pct: 28, color: '#F59E0B' },
  { label: 'Vendu', value: 6, pct: 14, color: '#10B981' },
];

const BARS = [
  { day: 'Lun', value: 8, height: 65 },
  { day: 'Mar', value: 14, height: 100 },
  { day: 'Mer', value: 11, height: 79 },
  { day: 'Jeu', value: 19, height: 100 },
  { day: 'Ven', value: 16, height: 84 },
  { day: 'Sam', value: 7, height: 37 },
  { day: 'Dim', value: 4, height: 21 },
];

const DOCUMENTS_PROGRESS = [
  { label: 'Titres fonciers validés', value: '18 ann.', pct: 72, color: '#10B981' },
  { label: 'En cours de vérification', value: '9 ann.', pct: 36, color: '#F59E0B' },
  { label: 'Documents manquants', value: '5 ann.', pct: 20, color: '#EF4444' },
  { label: 'Mandats signés', value: '14 ann.', pct: 56, color: '#376BFF' },
];

const TOP_LISTINGS = [
  {
    rank: 1,
    medal: '🥇',
    name: 'Villa Tokoin, Lomé',
    meta: 'Résidentiel · 85 M FCFA',
    contacts: 34,
  },
  {
    rank: 2,
    medal: '🥈',
    name: 'App. Plateau, Dakar',
    meta: 'Appartement · 45 M FCFA',
    contacts: 27,
  },
  {
    rank: 3,
    medal: '🥉',
    name: 'Bureau Cocody, Abidjan',
    meta: 'Commercial · 120 M FCFA',
    contacts: 21,
  },
  {
    rank: 4,
    medal: null,
    name: 'Terrain Cadjèhoun, Cotonou',
    meta: 'Terrain · 28 M FCFA',
    contacts: 18,
  },
  {
    rank: 5,
    medal: null,
    name: 'Maison Adidogomé, Lomé',
    meta: 'Résidentiel · 62 M FCFA',
    contacts: 15,
  },
];

const TRAFFIC_SOURCES = [
  { label: 'Recherche organique', icon: Search, pct: 42, bg: 'bg-brand/10', color: '#376BFF' },
  { label: 'Réseaux sociaux', icon: Share2, pct: 31, bg: 'bg-emerald-50', color: '#10B981' },
  { label: 'Email / Newsletters', icon: Mail, pct: 17, bg: 'bg-amber-50', color: '#F59E0B' },
  { label: 'Liens directs', icon: Link2, pct: 10, bg: 'bg-violet-50', color: '#7C3AED' },
];

const GEO_BREAKDOWN = [
  { city: 'Lomé, Togo', pct: 68, color: '#376BFF' },
  { city: 'Dakar, Sénégal', pct: 52, color: '#10B981' },
  { city: 'Abidjan, C.I.', pct: 44, color: '#F59E0B' },
  { city: 'Cotonou, Bénin', pct: 35, color: '#EF4444' },
  { city: 'Accra, Ghana', pct: 22, color: '#7C3AED' },
  { city: 'Autres villes', pct: 15, color: '#9CA3AF' },
];

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

export default function StatistiquesPage() {
  const [period, setPeriod] = useState<Period>('30j');
  const donutSegs = donutSegments(DONUT);
  const donutTotal = DONUT.reduce((sum, d) => sum + d.value, 0);
  const maxBar = Math.max(...BARS.map((b) => b.value));

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

      {/* KPI STATS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI_STATS.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.bg)}>
                <s.icon className={cn('h-[18px] w-[18px]', s.color)} aria-hidden />
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 text-[11.5px] font-semibold',
                  s.up ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {s.up ? (
                  <TrendingUp className="h-3 w-3" aria-hidden />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden />
                )}
                {s.trend}
              </span>
            </div>
            <p className="font-sora text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ROW 1: LINE + DONUT */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Évolution des vues"
          subtitle="Vues quotidiennes sur les 30 derniers jours"
        >
          <svg viewBox="0 0 480 150" preserveAspectRatio="none" className="h-[150px] w-full">
            <line x1="0" y1="150" x2="480" y2="150" stroke="#E5E7EB" strokeWidth="1" />
            <line
              x1="0"
              y1="112"
              x2="480"
              y2="112"
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <line
              x1="0"
              y1="75"
              x2="480"
              y2="75"
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <line
              x1="0"
              y1="37"
              x2="480"
              y2="37"
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <path
              d="M0,120 C20,118 40,110 60,105 C80,100 100,95 120,88 C140,80 160,85 180,78 C200,70 220,65 240,58 C260,50 280,55 300,45 C320,35 340,40 360,30 C380,22 400,28 420,20 C440,14 460,18 480,12 L480,150 L0,150 Z"
              fill="#EEF3FF"
              opacity="0.7"
            />
            <path
              d="M0,120 C20,118 40,110 60,105 C80,100 100,95 120,88 C140,80 160,85 180,78 C200,70 220,65 240,58 C260,50 280,55 300,45 C320,35 340,40 360,30 C380,22 400,28 420,20 C440,14 460,18 480,12"
              fill="none"
              stroke="#376BFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="240" cy="58" r="4" fill="#376BFF" />
            <circle cx="480" cy="12" r="4" fill="#376BFF" />
          </svg>
          <div className="mt-1.5 flex justify-between">
            {['1 Jun', '8 Jun', '15 Jun', '22 Jun', '30 Jun'].map((l) => (
              <span key={l} className="text-[10.5px] text-gray-400">
                {l}
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Répartition des annonces" subtitle="Par statut de publication">
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
                    key={DONUT[i]!.label}
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
              {DONUT.map((d) => (
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
        </ChartCard>
      </div>

      {/* ROW 2: BAR + PROGRESS + RANKING */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Contacts reçus" subtitle="Par jour cette semaine">
          <div className="flex h-[140px] items-end gap-2.5">
            {BARS.map((b) => (
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
            {DOCUMENTS_PROGRESS.map((d) => (
              <div key={d.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-neutral-700">{d.label}</span>
                  <span className="text-xs font-semibold" style={{ color: d.color }}>
                    {d.value}
                  </span>
                </div>
                <div className="h-[7px] w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top annonces" subtitle="Par nombre de contacts reçus">
          <div className="flex flex-col">
            {TOP_LISTINGS.map((l) => (
              <div
                key={l.rank}
                className="flex items-center gap-3 border-b border-black/[0.05] py-2.5 last:border-0"
              >
                <span className="w-5 flex-shrink-0 text-center text-[13px] font-semibold text-gray-400">
                  {l.medal ?? l.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-neutral-900">{l.name}</p>
                  <p className="truncate text-[11.5px] text-gray-400">{l.meta}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[13px] font-semibold text-neutral-900">{l.contacts}</p>
                  <p className="text-[11px] text-gray-400">contacts</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ROW 3: SOURCES + GEO */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Sources de trafic" subtitle="D'où viennent vos visiteurs">
          <div className="flex flex-col gap-3.5">
            {TRAFFIC_SOURCES.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn('flex h-7 w-7 items-center justify-center rounded-md', s.bg)}
                    >
                      <s.icon
                        className="h-[13px] w-[13px]"
                        style={{ color: s.color }}
                        aria-hidden
                      />
                    </span>
                    <span className="text-[13px] font-medium text-neutral-900">{s.label}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-neutral-900">{s.pct}%</span>
                </div>
                <div className="h-[7px] w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Répartition géographique" subtitle="Contacts par ville">
          <div className="flex flex-col gap-3">
            {GEO_BREAKDOWN.map((g) => (
              <div key={g.city} className="flex items-center gap-3">
                <div className="flex min-w-[130px] items-center gap-1.5">
                  <MapPin className="h-[13px] w-[13px]" style={{ color: g.color }} aria-hidden />
                  <span className="text-[13px] font-medium text-neutral-900">{g.city}</span>
                </div>
                <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${g.pct}%`, backgroundColor: g.color }}
                  />
                </div>
                <span className="w-8 flex-shrink-0 text-right text-xs font-semibold text-neutral-900">
                  {g.pct}%
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
