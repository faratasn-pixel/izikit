'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Download,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  Pencil,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileSearch,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import {
  MOCK_REQUESTS,
  PROPERTY_TYPE_ICON,
  PRIORITY_STYLE,
  TRANSACTION_BADGE,
  type Transaction,
  type Status,
} from '@/lib/requests-data';

const STATUS_BADGE: Record<Status, { label: string; icon: typeof Clock; className: string }> = {
  EN_ATTENTE: { label: 'En attente', icon: Clock, className: 'bg-amber-100 text-amber-800' },
  EN_COURS: { label: 'En cours', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800' },
  CLOTUREE: { label: 'Clôturée', icon: XCircle, className: 'bg-gray-200 text-gray-700' },
};

const STATUS_TABS: { value: Status | ''; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'CLOTUREE', label: 'Clôturées' },
];

export default function DemandesPage() {
  const user = useUser();

  const [statusFilter, setStatusFilter] = useState<Status | ''>('');
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<Transaction | ''>('');

  const countryOptions = useMemo(
    () => Array.from(new Set(MOCK_REQUESTS.map((r) => r.country))).sort(),
    [],
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(MOCK_REQUESTS.map((r) => r.propertyType))).sort(),
    [],
  );

  const counts = useMemo(
    () => ({
      total: MOCK_REQUESTS.length,
      pending: MOCK_REQUESTS.filter((r) => r.status === 'EN_ATTENTE').length,
      pendingUrgent: MOCK_REQUESTS.filter(
        (r) => r.status === 'EN_ATTENTE' && r.priority === 'URGENT',
      ).length,
      inProgress: MOCK_REQUESTS.filter((r) => r.status === 'EN_COURS').length,
      closed: MOCK_REQUESTS.filter((r) => r.status === 'CLOTUREE').length,
    }),
    [],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_REQUESTS.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (countryFilter && r.country !== countryFilter) return false;
      if (typeFilter && r.propertyType !== typeFilter) return false;
      if (transactionFilter && r.transaction !== transactionFilter) return false;
      if (q && !(r.clientName.toLowerCase().includes(q) || r.zone.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [statusFilter, countryFilter, typeFilter, transactionFilter, search]);

  const filtersActive = Boolean(search || countryFilter || typeFilter || transactionFilter);

  function resetFilters() {
    setSearch('');
    setCountryFilter('');
    setTypeFilter('');
    setTransactionFilter('');
  }

  if (!user) return null;

  return (
    <DashboardShell active="requests" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Demande Immobilière
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Gérez les demandes de recherche immobilière de vos clients et prospects.
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
          <Link
            href="/demandes/new"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Nouvelle</span>
            <span className="hidden lg:inline">Nouvelle demande</span>
          </Link>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Demandes totales',
            value: counts.total,
            dot: '#376BFF',
            sub: (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden />
                +4 ce mois
              </span>
            ),
          },
          {
            label: 'En attente de traitement',
            value: counts.pending,
            dot: '#F59E0B',
            sub: (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-500" aria-hidden />
                {counts.pendingUrgent} urgentes
              </span>
            ),
          },
          {
            label: 'Demandes traitées',
            value: counts.inProgress,
            dot: '#10B981',
            sub: (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden />
                +2 ce mois
              </span>
            ),
          },
          { label: 'Demandes clôturées', value: counts.closed, dot: '#EF4444', sub: '—' },
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

      {/* FILTER BAR */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SlidersHorizontal
            className="h-[15px] w-[15px] flex-shrink-0 text-gray-400"
            aria-hidden
          />
          <span className="text-[12.5px] font-semibold whitespace-nowrap text-gray-400">
            Filtres :
          </span>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[12.5px] text-neutral-700"
          >
            <option value="">Tous les pays</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[12.5px] text-neutral-700"
          >
            <option value="">Type de bien</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={transactionFilter}
            onChange={(e) => setTransactionFilter(e.target.value as Transaction | '')}
            className="rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[12.5px] text-neutral-700"
          >
            <option value="">Transaction</option>
            <option value="VENTE">Vente</option>
            <option value="LOCATION">Location</option>
          </select>

          <div className="hidden h-5 w-px bg-black/[0.08] lg:block" aria-hidden />

          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-black/[0.08] bg-gray-50 px-3.5 py-2 lg:max-w-[220px]">
            <Search className="h-[13px] w-[13px] flex-shrink-0 text-gray-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client, une ville…"
              className="w-full truncate bg-transparent text-[12.5px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-[12.5px] font-medium text-gray-400 hover:text-neutral-700"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-2xl bg-white">
        <div className="flex items-center justify-between gap-2 px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className="font-sora text-[15px] font-semibold text-neutral-900">
              Liste des demandes
            </span>
            <span className="text-[12.5px] text-gray-400">{filteredItems.length} demandes</span>
          </div>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-gray-400"
          >
            <ArrowUpDown className="h-[13px] w-[13px]" aria-hidden />
            Trier
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-b border-black/[0.06] px-5">
          {STATUS_TABS.map((tab) => {
            const tabCount =
              tab.value === ''
                ? MOCK_REQUESTS.length
                : MOCK_REQUESTS.filter((r) => r.status === tab.value).length;
            return (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap',
                  statusFilter === tab.value
                    ? 'border-brand font-semibold text-brand'
                    : 'border-transparent text-gray-400',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[10.5px] font-semibold',
                    statusFilter === tab.value
                      ? 'bg-brand/10 text-brand'
                      : 'bg-gray-100 text-gray-400',
                  )}
                >
                  {tabCount}
                </span>
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <FileSearch className="mb-1 h-8 w-8 text-gray-300" aria-hidden />
            <p className="text-sm font-medium text-neutral-700">Aucun résultat pour ces critères</p>
            <p className="max-w-xs text-xs text-gray-400">
              Modifiez ou réinitialisez les filtres pour voir d&apos;autres demandes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-5 py-3">
                    <div
                      className="h-4 w-4 rounded border border-black/[0.12] bg-white"
                      aria-hidden
                    />
                  </th>
                  {[
                    { label: 'Client', mobileHidden: false },
                    { label: 'Type de bien', mobileHidden: true },
                    { label: 'Zone / Ville', mobileHidden: false },
                    { label: 'Budget', mobileHidden: false },
                    { label: 'Transaction', mobileHidden: true },
                    { label: 'Priorité', mobileHidden: true },
                    { label: 'Statut', mobileHidden: false },
                    { label: 'Date', mobileHidden: true },
                    { label: 'Actions', mobileHidden: false },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={cn(
                        'font-sora px-5 py-3 text-left text-[11.5px] font-semibold whitespace-nowrap text-gray-400 uppercase',
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
                {filteredItems.map((r) => {
                  const TypeIcon = PROPERTY_TYPE_ICON[r.propertyType];
                  const priority = PRIORITY_STYLE[r.priority];
                  const status = STATUS_BADGE[r.status];
                  const StatusIcon = status.icon;
                  const transaction = TRANSACTION_BADGE[r.transaction];
                  return (
                    <tr key={r.id} className="border-b border-black/[0.06] last:border-0">
                      <td className="px-5 py-4">
                        <div
                          className="h-4 w-4 rounded border border-black/[0.12] bg-white"
                          aria-hidden
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={r.avatarUrl}
                            alt={r.clientName}
                            className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-[13px] font-medium whitespace-nowrap text-neutral-900">
                              {r.clientName}
                            </p>
                            <p className="text-[11.5px] whitespace-nowrap text-gray-400">
                              {r.clientPhone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 lg:table-cell">
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11.5px] font-medium whitespace-nowrap text-neutral-700">
                          <TypeIcon className="h-3 w-3" aria-hidden />
                          {r.propertyType}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[13px] whitespace-nowrap text-neutral-700">
                        <span>{r.flag}</span> {r.zone}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium whitespace-nowrap text-neutral-900">
                        {r.budget}
                      </td>
                      <td className="hidden px-5 py-4 lg:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            transaction.className,
                          )}
                        >
                          {transaction.label}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 lg:table-cell">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className={cn('h-2 w-2 rounded-full', priority.dot)} aria-hidden />
                          <span className={cn('text-[12px] font-medium', priority.text)}>
                            {priority.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            status.className,
                          )}
                        >
                          <StatusIcon className="h-2.5 w-2.5" aria-hidden />
                          {status.label}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 text-[12.5px] whitespace-nowrap text-gray-400 lg:table-cell">
                        {r.date}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/demandes/${r.id}`}
                            title="Voir le détail"
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-neutral-700"
                          >
                            <Eye className="h-[13px] w-[13px]" aria-hidden />
                          </Link>
                          <button
                            type="button"
                            disabled
                            title="Bientôt disponible"
                            className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-400"
                          >
                            <Pencil className="h-[13px] w-[13px]" aria-hidden />
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtersActive && (
              <p className="border-t border-black/[0.06] px-5 py-2 text-center text-[11px] text-gray-400">
                Filtres appliqués — {filteredItems.length} sur {MOCK_REQUESTS.length} demandes.
              </p>
            )}

            {/* PAGINATION — inert, static dataset fits on one page */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] px-5 py-3.5">
              <p className="text-[12.5px] text-gray-400">
                Affichage 1–{filteredItems.length} sur {MOCK_REQUESTS.length} demandes
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-300 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-[14px] w-[14px]" aria-hidden />
                </button>
                <button
                  type="button"
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-brand text-[13px] font-semibold text-white"
                >
                  1
                </button>
                <button
                  type="button"
                  disabled
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-300 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-[14px] w-[14px]" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
