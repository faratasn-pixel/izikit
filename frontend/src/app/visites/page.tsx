'use client';

import { useMemo, useState } from 'react';
import {
  Download,
  Plus,
  CalendarCheck,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Table2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Calendar,
  Eye,
  Pencil,
  X,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';

type VisitStatus = 'CONFIRMEE' | 'EN_ATTENTE' | 'ANNULEE';
type VisitType = 'PRESENTIEL' | 'VIRTUELLE';
type View = 'CALENDRIER' | 'LISTE';
type TodayFilter = 'TOUTES' | 'CONFIRMEE' | 'EN_ATTENTE';

interface CalendarEvent {
  label: string;
  status: VisitStatus;
}

interface CalendarDay {
  day: number;
  otherMonth?: boolean;
  today?: boolean;
  events?: CalendarEvent[];
  more?: number;
}

interface TodayVisit {
  id: string;
  day: string;
  month: string;
  title: string;
  time: string;
  client: string;
  status: VisitStatus;
}

interface UpcomingVisit extends TodayVisit {
  dateBlockClass: string;
  dayColor: string;
}

interface Visit {
  id: string;
  ref: string;
  property: string;
  price: string;
  clientName: string;
  clientAvatar: string;
  date: string;
  location: string;
  type: VisitType;
  status: VisitStatus;
}

const STATUS_BADGE: Record<VisitStatus, { label: string; className: string }> = {
  CONFIRMEE: { label: 'Confirmée', className: 'bg-emerald-100 text-emerald-800' },
  EN_ATTENTE: { label: 'En attente', className: 'bg-amber-100 text-amber-800' },
  ANNULEE: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
};

const TYPE_BADGE: Record<VisitType, { label: string; className: string }> = {
  PRESENTIEL: { label: 'Présentiel', className: 'bg-brand/10 text-brand' },
  VIRTUELLE: { label: 'Virtuelle', className: 'bg-purple-100 text-purple-700' },
};

const CALENDAR_EVENT_STYLE: Record<VisitStatus, string> = {
  CONFIRMEE: 'bg-emerald-100 text-emerald-800',
  EN_ATTENTE: 'bg-amber-100 text-amber-800',
  ANNULEE: 'bg-red-100 text-red-700',
};

// Static July 2025 month grid mirroring the Banani "Visites Programmées" mockup.
const CALENDAR_DAYS: CalendarDay[] = [
  { day: 30, otherMonth: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4, events: [{ label: 'Villa, Dakar', status: 'CONFIRMEE' }] },
  { day: 5 },
  { day: 6 },
  { day: 7, events: [{ label: 'App. Cotonou', status: 'EN_ATTENTE' }] },
  { day: 8 },
  { day: 9, events: [{ label: 'Bureau, Lomé', status: 'CONFIRMEE' }] },
  { day: 10 },
  { day: 11, events: [{ label: 'Maison, Abidjan', status: 'CONFIRMEE' }] },
  { day: 12 },
  { day: 13 },
  { day: 14 },
  {
    day: 15,
    today: true,
    events: [
      { label: 'Villa, Lomé', status: 'CONFIRMEE' },
      { label: 'App. Dakar', status: 'EN_ATTENTE' },
    ],
  },
  { day: 16, events: [{ label: 'Terrain, Cotonou', status: 'CONFIRMEE' }] },
  { day: 17 },
  { day: 18, events: [{ label: 'Bureau, Lomé', status: 'ANNULEE' }] },
  { day: 19 },
  { day: 20 },
  { day: 21, events: [{ label: 'Maison, Dakar', status: 'CONFIRMEE' }] },
  { day: 22 },
  { day: 23, events: [{ label: 'Villa, Abidjan', status: 'EN_ATTENTE' }], more: 1 },
  { day: 24 },
  { day: 25, events: [{ label: 'App. Lomé', status: 'CONFIRMEE' }] },
  { day: 26 },
  { day: 27 },
  { day: 28, events: [{ label: 'Bureau, Dakar', status: 'CONFIRMEE' }] },
  { day: 29 },
  { day: 30, events: [{ label: 'Terrain, Lomé', status: 'EN_ATTENTE' }] },
  { day: 31 },
  { day: 1, otherMonth: true },
  { day: 2, otherMonth: true },
  { day: 3, otherMonth: true },
];

const TODAY_VISITS: TodayVisit[] = [
  {
    id: 't1',
    day: '15',
    month: 'Juil',
    title: 'Villa à Lomé, Tokoin',
    time: '09h30',
    client: 'Ama Kodjovi',
    status: 'CONFIRMEE',
  },
  {
    id: 't2',
    day: '15',
    month: 'Juil',
    title: 'Appartement, Dakar Plateau',
    time: '14h00',
    client: 'Moussa Diallo',
    status: 'EN_ATTENTE',
  },
];

const UPCOMING_VISITS: UpcomingVisit[] = [
  {
    id: 'u1',
    day: '16',
    month: 'Juil',
    title: 'Terrain, Cotonou',
    time: '10h00',
    client: 'Sika Addo',
    status: 'CONFIRMEE',
    dateBlockClass: 'bg-[#F0FDF4]',
    dayColor: 'text-emerald-600',
  },
  {
    id: 'u2',
    day: '23',
    month: 'Juil',
    title: 'Villa, Abidjan Cocody',
    time: '11h30',
    client: "N'Golo Touré",
    status: 'EN_ATTENTE',
    dateBlockClass: 'bg-[#FEF9EE]',
    dayColor: 'text-amber-600',
  },
  {
    id: 'u3',
    day: '25',
    month: 'Juil',
    title: 'Appartement, Lomé',
    time: '16h00',
    client: 'Fatou Bâ',
    status: 'CONFIRMEE',
    dateBlockClass: 'bg-[#EEF3FF]',
    dayColor: 'text-brand',
  },
];

const ALL_VISITS: Visit[] = [
  {
    id: 'v1',
    ref: 'VIS-001',
    property: 'Villa Résidentielle Tokoin',
    price: '85 000 000 FCFA',
    clientName: 'Ama Kodjovi',
    clientAvatar:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F1',
    date: '15 Juil · 09h30',
    location: 'Lomé, Togo',
    type: 'PRESENTIEL',
    status: 'CONFIRMEE',
  },
  {
    id: 'v2',
    ref: 'VIS-002',
    property: 'Appartement Plateau Dakar',
    price: '45 000 000 FCFA',
    clientName: 'Moussa Diallo',
    clientAvatar:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F5',
    date: '15 Juil · 14h00',
    location: 'Dakar, Sénégal',
    type: 'PRESENTIEL',
    status: 'EN_ATTENTE',
  },
  {
    id: 'v3',
    ref: 'VIS-003',
    property: 'Terrain Cotonou Cadjèhoun',
    price: '28 000 000 FCFA',
    clientName: 'Sika Addo',
    clientAvatar:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F2',
    date: '16 Juil · 10h00',
    location: 'Cotonou, Bénin',
    type: 'PRESENTIEL',
    status: 'CONFIRMEE',
  },
  {
    id: 'v4',
    ref: 'VIS-004',
    property: 'Villa Cocody Abidjan',
    price: '120 000 000 FCFA',
    clientName: "N'Golo Touré",
    clientAvatar:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F7',
    date: '23 Juil · 11h30',
    location: 'Abidjan, C.I.',
    type: 'VIRTUELLE',
    status: 'EN_ATTENTE',
  },
  {
    id: 'v5',
    ref: 'VIS-005',
    property: 'Bureau Lomé Agoe',
    price: '55 000 000 FCFA',
    clientName: 'Fatou Bâ',
    clientAvatar:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F4',
    date: '18 Juil · 08h00',
    location: 'Lomé, Togo',
    type: 'PRESENTIEL',
    status: 'ANNULEE',
  },
];

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function VisitesPage() {
  const user = useUser();
  const [view, setView] = useState<View>('CALENDRIER');
  const [todayFilter, setTodayFilter] = useState<TodayFilter>('TOUTES');
  const [search, setSearch] = useState('');

  const filteredToday = useMemo(
    () => TODAY_VISITS.filter((v) => todayFilter === 'TOUTES' || v.status === todayFilter),
    [todayFilter],
  );

  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_VISITS;
    return ALL_VISITS.filter(
      (v) => v.property.toLowerCase().includes(q) || v.clientName.toLowerCase().includes(q),
    );
  }, [search]);

  if (!user) return null;

  return (
    <DashboardShell active="visits" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Visites programmées
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Gérez et suivez toutes vos visites de biens immobiliers.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-gray-400"
          >
            <Download className="h-[14px] w-[14px]" aria-hidden />
            <span className="hidden lg:inline">Exporter</span>
          </button>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Planifier</span>
            <span className="hidden lg:inline">Planifier une visite</span>
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: CalendarCheck,
            iconBg: 'bg-brand/10',
            iconColor: 'text-brand',
            value: 24,
            label: 'Visites ce mois',
            trend: '+12%',
          },
          {
            icon: CheckCircle,
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-700',
            value: 17,
            label: 'Confirmées',
            trend: '+5%',
          },
          {
            icon: Clock,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-700',
            value: 5,
            label: 'En attente',
            trend: null,
          },
          {
            icon: XCircle,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            value: 2,
            label: 'Annulées',
            trend: null,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.iconBg)}>
                <s.icon className={cn('h-[18px] w-[18px]', s.iconColor)} aria-hidden />
              </span>
              {s.trend ? (
                <span className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600">
                  <TrendingUp className="h-3 w-3" aria-hidden />
                  {s.trend}
                </span>
              ) : (
                <span className="text-[11.5px] text-gray-400">–</span>
              )}
            </div>
            <p className="font-sora mb-0.5 text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="text-[12.5px] font-medium text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* VIEW TABS */}
      <div className="flex w-fit items-center gap-1 rounded-2xl border border-black/[0.08] bg-white p-1.5">
        <button
          type="button"
          onClick={() => setView('LISTE')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium',
            view === 'LISTE' ? 'bg-brand font-semibold text-white' : 'text-gray-400',
          )}
        >
          <Table2 className="h-[14px] w-[14px]" aria-hidden />
          Liste
        </button>
        <button
          type="button"
          onClick={() => setView('CALENDRIER')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium',
            view === 'CALENDRIER' ? 'bg-brand font-semibold text-white' : 'text-gray-400',
          )}
        >
          <CalendarDays className="h-[14px] w-[14px]" aria-hidden />
          Calendrier
        </button>
      </div>

      {view === 'CALENDRIER' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* CALENDAR */}
          <div className="rounded-2xl bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] p-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-neutral-700"
                >
                  <ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
                </button>
                <span className="font-sora min-w-[140px] text-center text-base font-semibold text-neutral-900">
                  Juillet 2025
                </span>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-neutral-700"
                >
                  <ChevronRight className="h-[15px] w-[15px]" aria-hidden />
                </button>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-black/[0.08] bg-[#F9FAFB] p-1">
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="cursor-not-allowed rounded-md px-3.5 py-1 text-[12.5px] font-medium text-gray-400"
                >
                  Semaine
                </button>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="cursor-not-allowed rounded-md bg-white px-3.5 py-1 text-[12.5px] font-semibold text-neutral-900"
                >
                  Mois
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-1.5 grid grid-cols-7">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="py-1.5 text-center text-[11.5px] font-semibold tracking-wide text-gray-400 uppercase"
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {CALENDAR_DAYS.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      'min-h-14 rounded-lg p-1.5 lg:min-h-20 lg:p-2',
                      d.otherMonth && 'opacity-35',
                      d.today && 'bg-[#EEF3FF]',
                    )}
                  >
                    <div
                      className={cn(
                        'mb-1 text-[13px] font-medium text-neutral-900',
                        d.today &&
                          'flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white',
                      )}
                    >
                      {d.day}
                    </div>
                    {d.events?.map((e, ei) => (
                      <div
                        key={ei}
                        className={cn(
                          'mb-0.5 truncate rounded-sm px-1.5 py-0.5 text-[10px] font-medium lg:text-[10.5px]',
                          CALENDAR_EVENT_STYLE[e.status],
                        )}
                      >
                        {e.label}
                      </div>
                    ))}
                    {d.more && <div className="text-[10px] text-gray-400">+{d.more} autre</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="flex flex-col gap-5">
            {/* Today's visits */}
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between border-b border-black/[0.06] p-4">
                <p className="font-sora text-sm font-semibold text-neutral-900">Visites du jour</p>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="cursor-not-allowed text-xs font-semibold text-brand"
                >
                  Tout voir
                </button>
              </div>
              <div className="flex items-center gap-1.5 border-b border-black/[0.06] px-4 py-3">
                {(
                  [
                    { key: 'TOUTES', label: 'Toutes' },
                    { key: 'CONFIRMEE', label: 'Confirmées' },
                    { key: 'EN_ATTENTE', label: 'En attente' },
                  ] as { key: TodayFilter; label: string }[]
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTodayFilter(f.key)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                      todayFilter === f.key ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {filteredToday.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">
                  Aucune visite pour ce filtre.
                </p>
              ) : (
                filteredToday.map((v, i) => {
                  const s = STATUS_BADGE[v.status];
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        'flex gap-3 p-4',
                        i < filteredToday.length - 1 && 'border-b border-black/[0.06]',
                      )}
                    >
                      <div className="flex h-[46px] w-[42px] flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[#EEF3FF]">
                        <span className="font-sora text-[17px] leading-none font-semibold text-brand">
                          {v.day}
                        </span>
                        <span className="text-[9.5px] font-semibold tracking-wide text-brand uppercase">
                          {v.month}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 truncate text-[13px] font-semibold text-neutral-900">
                          {v.title}
                        </p>
                        <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-gray-400">
                          <Clock className="h-[11px] w-[11px]" aria-hidden />
                          {v.time} · {v.client}
                        </p>
                        <span
                          className={cn(
                            'mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                            s.className,
                          )}
                        >
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Upcoming */}
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between border-b border-black/[0.06] p-4">
                <p className="font-sora text-sm font-semibold text-neutral-900">
                  Prochaines visites
                </p>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="cursor-not-allowed text-xs font-semibold text-brand"
                >
                  Voir tout
                </button>
              </div>
              {UPCOMING_VISITS.map((v, i) => {
                const s = STATUS_BADGE[v.status];
                return (
                  <div
                    key={v.id}
                    className={cn(
                      'flex gap-3 p-4',
                      i < UPCOMING_VISITS.length - 1 && 'border-b border-black/[0.06]',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-[46px] w-[42px] flex-shrink-0 flex-col items-center justify-center rounded-lg',
                        v.dateBlockClass,
                      )}
                    >
                      <span
                        className={cn(
                          'font-sora text-[17px] leading-none font-semibold',
                          v.dayColor,
                        )}
                      >
                        {v.day}
                      </span>
                      <span
                        className={cn(
                          'text-[9.5px] font-semibold tracking-wide uppercase',
                          v.dayColor,
                        )}
                      >
                        {v.month}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 truncate text-[13px] font-semibold text-neutral-900">
                        {v.title}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11.5px] text-gray-400">
                        <Clock className="h-[11px] w-[11px]" aria-hidden />
                        {v.time} · {v.client}
                      </p>
                      <span
                        className={cn(
                          'mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                          s.className,
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISITS TABLE */}
      <div className="rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] p-5">
          <p className="font-sora text-[15px] font-semibold text-neutral-900">Toutes les visites</p>
          <div className="flex items-center gap-2.5">
            <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-1.5">
              <Search className="h-[13px] w-[13px] flex-shrink-0 text-gray-400" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full bg-transparent text-[12.5px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-gray-400"
            >
              <SlidersHorizontal className="h-[13px] w-[13px]" aria-hidden />
              Filtrer
            </button>
          </div>
        </div>

        {filteredVisits.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <CalendarCheck className="mb-1 h-8 w-8 text-gray-300" aria-hidden />
            <p className="text-sm font-medium text-neutral-700">
              Aucune visite pour cette recherche
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { label: '#', mobileHidden: true },
                    { label: 'Bien immobilier', mobileHidden: false },
                    { label: 'Client', mobileHidden: false },
                    { label: 'Date & heure', mobileHidden: false },
                    { label: 'Localisation', mobileHidden: true },
                    { label: 'Type', mobileHidden: true },
                    { label: 'Statut', mobileHidden: false },
                    { label: 'Actions', mobileHidden: false },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={cn(
                        'font-sora px-4 py-3 text-left text-[11.5px] font-semibold whitespace-nowrap text-gray-400 uppercase',
                        h.label === 'Actions' && 'text-center',
                        h.mobileHidden && 'hidden lg:table-cell',
                      )}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((v) => {
                  const status = STATUS_BADGE[v.status];
                  const type = TYPE_BADGE[v.type];
                  return (
                    <tr key={v.id} className="border-b border-black/[0.06] last:border-0">
                      <td className="hidden px-4 py-3.5 text-[12px] whitespace-nowrap text-gray-400 lg:table-cell">
                        {v.ref}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] font-semibold whitespace-nowrap text-neutral-900">
                          {v.property}
                        </p>
                        <p className="text-[12px] text-gray-400">{v.price}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={v.clientAvatar}
                            alt={v.clientName}
                            className="h-[30px] w-[30px] flex-shrink-0 rounded-full object-cover"
                          />
                          <span className="text-[13px] font-medium whitespace-nowrap text-neutral-900">
                            {v.clientName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-neutral-700">
                          <Calendar className="h-3 w-3 text-gray-400" aria-hidden />
                          {v.date}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3.5 text-xs whitespace-nowrap text-gray-400 lg:table-cell">
                        {v.location}
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            type.className,
                          )}
                        >
                          {type.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {[Eye, Pencil, X].map((Icon, i) => (
                            <button
                              key={i}
                              type="button"
                              disabled
                              title="Bientôt disponible"
                              className={cn(
                                'flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB]',
                                i === 2 ? 'text-red-300' : 'text-gray-400',
                              )}
                            >
                              <Icon className="h-[13px] w-[13px]" aria-hidden />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
