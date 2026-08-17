'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Settings2,
  TrendingUp,
  Eye,
  Sparkles,
  List,
  LayoutGrid,
  MapPin,
  Clock,
  ArrowRight,
  Download,
  Loader2,
  BellPlus,
  FileSearch,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL } from '@/lib/listings';
import {
  COUNTRY_FLAG,
  FREQUENCY_LABEL,
  formatBudget,
  formatDate,
  isMatchToday,
  type AlertListItem,
  type Frequency,
  type RecentAlertMatch,
} from '@/lib/alerts';

interface Counts {
  total: number;
  active: number;
  inactive: number;
}

export default function AlertesPage() {
  const user = useUser();
  const { toast } = useToast();

  const [items, setItems] = useState<AlertListItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  const [recentItems, setRecentItems] = useState<RecentAlertMatch[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api<{ items: AlertListItem[]; counts: Counts }>('/api/alerts?limit=50')
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setCounts(res.counts);
      })
      .catch((e) => {
        if (cancelled) return;
        toast(e instanceof ApiError ? e.message : 'Impossible de charger les alertes.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<{ items: RecentAlertMatch[]; monthlyCount: number; viewedCount: number }>(
      '/api/alerts/matches/recent?limit=5',
    )
      .then((res) => {
        if (cancelled) return;
        setRecentItems(res.items);
        setMonthlyCount(res.monthlyCount);
        setViewedCount(res.viewedCount);
      })
      .catch(() => {
        // best-effort — the rest of the page still works without this section
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function markMatchViewed(alertId: string, matchId: string) {
    void api(`/api/alerts/${alertId}/matches/${matchId}`, {
      method: 'PATCH',
      body: { viewed: true },
    }).catch(() => {
      // best-effort — never blocks navigation to the request detail page
    });
  }

  if (!user) return null;

  return (
    <DashboardShell active="alerts" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Alerte Secteur
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Suivez les nouvelles annonces correspondant à vos critères de recherche par zone.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-gray-400"
          >
            <Settings2 className="h-[14px] w-[14px]" aria-hidden />
            <span className="hidden lg:inline">Gérer les alertes</span>
          </button>
          <Link
            href="/alertes/new"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Nouvelle</span>
            <span className="hidden lg:inline">Nouvelle alerte</span>
          </Link>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Alertes actives',
            value: counts.active,
            dot: '#376BFF',
            sub: (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden />
                +2 ce mois
              </span>
            ),
          },
          {
            label: 'Correspondances ce mois',
            value: monthlyCount,
            dot: '#F59E0B',
            sub: (
              <span className="flex items-center gap-1 text-brand">
                <Sparkles className="h-3 w-3" aria-hidden />
                Nouvelles
              </span>
            ),
          },
          {
            label: 'Demandes consultées',
            value: viewedCount,
            dot: '#10B981',
            sub: (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden />
                Total
              </span>
            ),
          },
          { label: 'Alertes désactivées', value: counts.inactive, dot: '#EF4444', sub: '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <p className="mb-2 text-xs font-medium text-gray-400">{s.label}</p>
            <p className="font-sora mb-1 text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="flex items-center text-[11.5px] text-gray-400">
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{ background: s.dot }}
              />
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* SECTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sora mb-0.5 text-[15px] font-semibold text-neutral-900">
            Mes alertes secteur
          </h2>
          <p className="text-[13px] text-gray-400">
            Cliquez sur une alerte pour voir les correspondances récentes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-gray-400"
          >
            <List className="h-[13px] w-[13px]" aria-hidden />
            Vue liste
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-brand bg-brand/10 px-3.5 py-1.5 text-[12.5px] font-medium text-brand"
          >
            <LayoutGrid className="h-[13px] w-[13px]" aria-hidden />
            Vue grille
          </button>
        </div>
      </div>

      {/* ALERT CARDS GRID */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-14 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
          <p className="text-xs text-gray-400">Chargement des alertes…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((alert) => {
            const transactionLabel =
              TRANSACTION_TYPE_LABEL[alert.transactionType] ?? alert.transactionType;
            const frequencyLabel = FREQUENCY_LABEL[alert.frequency as Frequency] ?? alert.frequency;
            const criteria: { label: string; highlight?: boolean }[] = [
              ...alert.propertyTypes.map((t) => ({ label: PROPERTY_TYPE_LABEL[t] ?? t })),
              { label: formatBudget(alert.priceMin, alert.priceMax), highlight: true },
            ];
            return (
              <Link
                key={alert.id}
                href={`/alertes/${alert.id}`}
                className="flex flex-col gap-3.5 rounded-2xl bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{alert.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                      <span>{COUNTRY_FLAG[alert.country] ?? ''}</span>
                      <span>{alert.country}</span>
                      <span className="text-gray-200">•</span>
                      <span>{transactionLabel}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex-shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                      alert.active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-200 text-gray-700',
                    )}
                  >
                    {alert.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {criteria.map((c, i) => (
                    <span
                      key={i}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium whitespace-nowrap',
                        c.highlight ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-neutral-700',
                      )}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">
                    Dernière correspondance :{' '}
                    <span className="font-medium text-gray-400">Aucune</span>
                  </p>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <span
                      className={cn(
                        'relative inline-block h-[18px] w-8 rounded-full',
                        alert.active ? 'bg-brand' : 'bg-gray-300',
                      )}
                      aria-hidden
                    >
                      <span
                        className={cn(
                          'absolute top-[3px] h-3 w-3 rounded-full bg-white',
                          alert.active ? 'right-[3px]' : 'left-[3px]',
                        )}
                      />
                    </span>
                    <span
                      className={cn(
                        'text-xs whitespace-nowrap',
                        alert.active ? 'text-emerald-700' : 'text-gray-400',
                      )}
                    >
                      {alert.active ? 'Activée' : 'Désactivée'}
                    </span>
                  </div>
                </div>

                <p className="text-[11.5px] text-gray-400">
                  Créée le {formatDate(alert.createdAt)} · Fréquence : {frequencyLabel}
                </p>
              </Link>
            );
          })}

          {items.length === 0 && (
            <div className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-6 text-center md:col-span-2 lg:col-span-2">
              <BellPlus className="mb-1 h-7 w-7 text-gray-300" aria-hidden />
              <p className="text-sm font-medium text-neutral-700">Aucune alerte pour le moment</p>
              <p className="max-w-xs text-xs text-gray-400">
                Créez votre première alerte secteur pour être notifié des nouvelles opportunités.
              </p>
            </div>
          )}

          {/* New alert card */}
          <Link
            href="/alertes/new"
            className="flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-black/[0.08] bg-white p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
              <Plus className="h-5 w-5 text-brand" aria-hidden />
            </div>
            <p className="text-[13.5px] font-semibold text-brand">Créer une nouvelle alerte</p>
            <p className="text-center text-xs text-gray-400">
              Définissez vos critères et recevez
              <br />
              des correspondances en temps réel.
            </p>
          </Link>
        </div>
      )}

      {/* RECENT MATCHES */}
      <div className="rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className="font-sora text-[15px] font-semibold text-neutral-900">
              Correspondances récentes
            </span>
            <span className="text-[12.5px] text-gray-400">
              {monthlyCount} ce mois · {recentItems.filter((m) => isMatchToday(m.createdAt)).length}{' '}
              nouvelles aujourd&apos;hui
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-1.5 text-[12.5px] font-medium text-gray-400"
            >
              Toutes les alertes
            </button>
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
        </div>

        <div>
          {recentItems.map((m, i) => {
            const r = m.propertyRequest;
            const transactionLabel = TRANSACTION_TYPE_LABEL[r.transactionType] ?? r.transactionType;
            const propertyLabel = PROPERTY_TYPE_LABEL[r.propertyType] ?? r.propertyType;
            const isNew = isMatchToday(m.createdAt);
            return (
              <div
                key={m.id}
                className={cn(
                  'flex flex-wrap items-center gap-3.5 border-t border-black/[0.06] px-5 py-3.5 lg:flex-nowrap',
                  i % 2 === 1 && 'bg-[#FAFBFD]',
                )}
              >
                <div className="flex h-12 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <FileSearch className="h-5 w-5 text-brand" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-neutral-900">
                    Demande de {r.clientName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <MapPin className="h-2.5 w-2.5" aria-hidden />
                      {r.city}
                    </span>
                    <span className="whitespace-nowrap">{propertyLabel}</span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Clock className="h-2.5 w-2.5" aria-hidden />
                      {formatDate(m.createdAt)}
                    </span>
                    {isNew && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-brand">
                        Nouvelle
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                  <span className="font-sora text-sm font-semibold whitespace-nowrap text-neutral-900">
                    {formatBudget(r.budgetMin, r.budgetMax)}
                  </span>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-brand">
                    {transactionLabel}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <Link
                    href={`/demandes/${r.id}`}
                    title="Voir la demande"
                    onClick={() => markMatchViewed(m.alertId, m.id)}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-neutral-700"
                  >
                    <Eye className="h-[13px] w-[13px]" aria-hidden />
                  </Link>
                </div>
              </div>
            );
          })}

          {recentItems.length === 0 && (
            <div className="px-5 py-10 text-center text-xs text-gray-400">
              Aucune correspondance pour le moment.
            </div>
          )}
        </div>

        <div className="border-t border-black/[0.06] px-5 py-4 text-center">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="inline-flex cursor-not-allowed items-center gap-1.5 text-[13px] font-semibold text-brand"
          >
            Voir toutes les correspondances
            <ArrowRight className="h-[14px] w-[14px]" aria-hidden />
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
