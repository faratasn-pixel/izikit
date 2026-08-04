'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
  Tag,
  Calendar,
  Zap,
  Pencil,
  Trash2,
  Sparkles,
  BellRing,
  Eye,
  Bookmark,
  SlidersHorizontal,
  ChevronDown,
  Download,
  MapPin,
  Maximize2,
  BedDouble,
  Clock,
  MoreHorizontal,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { MOCK_ALERTS, TRANSACTION_BADGE } from '@/lib/alerts-data';

const PAGE_SIZE = 6;

export default function AlerteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = useUser();
  const { id } = use(params);
  const [active, setActive] = useState(true);

  const alert = MOCK_ALERTS.find((a) => a.id === id);

  if (!user) return null;

  if (!alert) {
    return (
      <DashboardShell active="alerts" searchPlaceholder="Rechercher une annonce, un contact…">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-12 text-center">
          <p className="text-sm font-semibold text-neutral-900">Alerte introuvable</p>
          <p className="text-xs text-gray-400">
            Cette alerte n&apos;existe pas ou a été supprimée.
          </p>
          <Link href="/alertes" className="text-[13px] font-semibold text-brand">
            Retour à Alerte secteur
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const shownMatches = alert.matches.slice(0, PAGE_SIZE);
  const newCount = alert.matches.filter((m) => m.isNew).length;
  const totalPages = Math.max(1, Math.ceil(alert.stats.totalMatches / PAGE_SIZE));

  return (
    <DashboardShell active="alerts" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* BREADCRUMB */}
      <div className="mb-4 flex items-center gap-1.5 text-[13px]">
        <Link href="/alertes" className="text-gray-400 hover:text-neutral-700">
          Alerte secteur
        </Link>
        <ChevronRight className="h-[13px] w-[13px] text-gray-400" aria-hidden />
        <span className="font-semibold text-neutral-900">{alert.title}</span>
      </div>

      {/* HEADER CARD */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-sora mb-1.5 text-xl font-semibold text-neutral-900">{alert.title}</h1>
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5 text-[13px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="text-base">{alert.flag}</span> {alert.country}
            </span>
            <span className="text-gray-200">•</span>
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" aria-hidden />
              {TRANSACTION_BADGE[alert.transaction].label}
            </span>
            <span className="text-gray-200">•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden />
              {alert.createdLabel}
            </span>
            <span className="text-gray-200">•</span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" aria-hidden />
              Fréquence : {alert.frequencyLabel}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {alert.criteria.map((c, i) => (
              <span
                key={i}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                  c.highlight ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-neutral-700',
                )}
              >
                {c.icon && <c.icon className="h-2.5 w-2.5" aria-hidden />}
                {c.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700',
              )}
            >
              {active ? 'Active' : 'Inactive'}
            </span>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              aria-pressed={active}
              aria-label="Activer/Désactiver l'alerte"
              className={cn(
                'relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors',
                active ? 'bg-brand' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all',
                  active ? 'right-[3px]' : 'left-[3px]',
                )}
              />
            </button>
            <span
              className={cn(
                'text-[13px] font-medium',
                active ? 'text-emerald-700' : 'text-gray-400',
              )}
            >
              {active ? 'Activée' : 'Désactivée'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-[13px] font-semibold text-gray-400"
            >
              <Pencil className="h-[13px] w-[13px]" aria-hidden />
              Modifier
            </button>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-4 py-2 text-[13px] font-semibold text-red-300"
            >
              <Trash2 className="h-[13px] w-[13px]" aria-hidden />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* MINI STATS */}
      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          {
            icon: Sparkles,
            iconBg: 'bg-brand/10',
            iconColor: 'text-brand',
            value: alert.stats.newToday,
            label: "Nouvelles aujourd'hui",
            trend: alert.stats.newToday > 0 ? `+${alert.stats.newToday} vs hier` : '—',
          },
          {
            icon: BellRing,
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-800',
            value: alert.stats.totalMatches,
            label: 'Total correspondances',
            trend: 'Ce mois',
          },
          {
            icon: Eye,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-700',
            value: alert.stats.viewed,
            label: 'Annonces consultées',
            trend:
              alert.stats.totalMatches > 0
                ? `${Math.round((alert.stats.viewed / alert.stats.totalMatches) * 100)}% des matches`
                : '—',
          },
          {
            icon: Bookmark,
            iconBg: 'bg-brand/10',
            iconColor: 'text-brand',
            value: alert.stats.saved,
            label: 'Annonces sauvegardées',
            trend: 'Sur cette alerte',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <div
              className={cn(
                'mb-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-lg',
                s.iconBg,
              )}
            >
              <s.icon className={cn('h-4 w-4', s.iconColor)} aria-hidden />
            </div>
            <p className="font-sora mb-0.5 text-[22px] font-semibold text-neutral-900">{s.value}</p>
            <p className="mb-1.5 text-xs text-gray-400">{s.label}</p>
            <p className="text-[11.5px] font-semibold text-gray-400">{s.trend}</p>
          </div>
        ))}
      </div>

      {/* FILTERS BAR */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-2xl bg-white px-5 py-3.5">
        <SlidersHorizontal className="h-[15px] w-[15px] text-gray-400" aria-hidden />
        <span className="mr-1 text-[13px] font-medium text-neutral-700">Filtrer :</span>
        {['Toutes les annonces', 'Prix croissant', 'Ce mois'].map((f) => (
          <button
            key={f}
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-1.5 text-[12.5px] font-medium text-gray-400"
          >
            {f}
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
        ))}
        <div className="h-5 w-px bg-black/[0.08]" />
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand">
          <Sparkles className="h-[13px] w-[13px]" aria-hidden />
          {newCount} nouvelles
        </span>
        <span className="ml-auto text-[12.5px] text-gray-400">
          {alert.stats.totalMatches} correspondances au total
        </span>
        <button
          type="button"
          disabled
          title="Bientôt disponible"
          className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-gray-400"
        >
          <Download className="h-[13px] w-[13px]" aria-hidden />
          Exporter
        </button>
      </div>

      {/* MATCHES SECTION */}
      <div className="rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-sora text-[15px] font-semibold text-neutral-900">
              Correspondances — {alert.title}
            </span>
            <span className="text-[12.5px] text-gray-400">
              {alert.stats.totalMatches} résultats · {newCount} nouvelles
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] text-gray-400"
            >
              <LayoutList className="h-[14px] w-[14px]" aria-hidden />
            </button>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-brand bg-brand/10 text-brand"
            >
              <LayoutGrid className="h-[14px] w-[14px]" aria-hidden />
            </button>
          </div>
        </div>

        {shownMatches.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-[13.5px] font-medium text-neutral-700">
              Aucune correspondance pour le moment
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Vous serez notifié dès qu&apos;une annonce correspondra à vos critères.
            </p>
          </div>
        ) : (
          <div>
            {shownMatches.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-wrap items-center gap-3.5 border-t border-black/[0.06] px-5 py-3.5 first:border-t-0 lg:flex-nowrap',
                  i % 2 === 1 && 'bg-[#FAFBFD]',
                )}
              >
                <img
                  src={m.imageUrl}
                  alt={m.title}
                  className="h-[52px] w-16 flex-shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-neutral-900">{m.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <MapPin className="h-2.5 w-2.5" aria-hidden />
                      {m.zoneFlag} {m.zone}
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Maximize2 className="h-2.5 w-2.5" aria-hidden />
                      {m.size}
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <BedDouble className="h-2.5 w-2.5" aria-hidden />
                      {m.detail}
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Clock className="h-2.5 w-2.5" aria-hidden />
                      {m.timeLabel}
                    </span>
                    {m.isNew && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-brand">
                        Nouvelle
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                  <span className="font-sora text-sm font-semibold whitespace-nowrap text-neutral-900">
                    {m.price}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                      TRANSACTION_BADGE[m.transaction].className,
                    )}
                  >
                    {TRANSACTION_BADGE[m.transaction].label}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled
                    title="Bientôt disponible"
                    className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-400"
                  >
                    <Eye className="h-[13px] w-[13px]" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Bientôt disponible"
                    className={cn(
                      'flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border bg-gray-50',
                      m.saved ? 'border-brand text-brand' : 'border-black/[0.08] text-gray-400',
                    )}
                  >
                    <Bookmark className="h-[13px] w-[13px]" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Bientôt disponible"
                    className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-400"
                  >
                    <MoreHorizontal className="h-[13px] w-[13px]" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {alert.stats.totalMatches > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-black/[0.06] px-5 py-3.5">
            <span className="text-[12.5px] text-gray-400">
              1–{shownMatches.length} sur {alert.stats.totalMatches} correspondances
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] text-gray-400"
              >
                <ChevronLeft className="h-[14px] w-[14px]" aria-hidden />
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className={cn(
                    'flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border text-[12.5px] font-medium',
                    p === 1
                      ? 'border-brand bg-brand text-white'
                      : 'border-black/[0.08] text-neutral-700',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] text-gray-400"
              >
                <ChevronRight className="h-[14px] w-[14px]" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
