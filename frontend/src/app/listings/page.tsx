'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Download,
  MapPin,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Loader2,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  STATUS_LABEL,
  TRANSACTION_TYPE_LABEL,
  formatListingPrice,
  type Listing,
  type ListingCounts,
} from '@/lib/listings';
import { cn } from '@/lib/utils';

interface ListingsPageResult {
  items: Listing[];
  nextCursor: string | null;
  counts: ListingCounts;
}

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { value: '', label: 'Toutes' },
  { value: 'VERIFIED', label: 'Vérifiées' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'SOLD', label: 'Vendues' },
];

const STATUS_BADGE: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  VERIFIED: { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800' },
  PENDING: { icon: Clock, className: 'bg-amber-100 text-amber-800' },
  SOLD: { icon: XCircle, className: 'bg-red-100 text-red-800' },
};

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** `#ANN-<year>-<short id>` — visually matches the Banani mockup's ref code,
 * derived from the real id/date since there's no sequential counter in the schema. */
function formatListingRef(l: Listing): string {
  const year = new Date(l.createdAt).getFullYear();
  return `#ANN-${year}-${l.id.slice(-4).toUpperCase()}`;
}

async function fetchPage(cursor: string | null): Promise<ListingsPageResult> {
  const qs = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
  return api<ListingsPageResult>(`/api/listings?limit=${PAGE_SIZE}${qs}`);
}

export default function ListingsPage() {
  const user = useUser();

  const [fetchedPages, setFetchedPages] = useState<Listing[][]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [counts, setCounts] = useState<ListingCounts | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('');

  async function goToPage(index: number) {
    if (index < fetchedPages.length) {
      setCurrentPage(index);
      return;
    }
    setLoadingPage(true);
    try {
      let pages = fetchedPages;
      let cursor = nextCursor;
      let more = pages.length === 0 ? true : hasMore;
      while (pages.length <= index && more) {
        const page = await fetchPage(pages.length === 0 ? null : cursor);
        pages = [...pages, page.items];
        cursor = page.nextCursor;
        more = page.nextCursor !== null;
        setCounts(page.counts);
      }
      setFetchedPages(pages);
      setNextCursor(cursor);
      setHasMore(more);
      setCurrentPage(Math.min(index, pages.length - 1));
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    void goToPage(0);
    // Initial load only.
  }, []);

  const pageItems = fetchedPages[currentPage] ?? [];

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    for (const page of fetchedPages) for (const l of page) cities.add(l.city);
    return Array.from(cities).sort();
  }, [fetchedPages]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pageItems.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (cityFilter && l.city !== cityFilter) return false;
      if (transactionFilter && l.transactionType !== transactionFilter) return false;
      if (
        q &&
        !(
          l.title.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [pageItems, search, statusFilter, cityFilter, transactionFilter]);

  const filtersActive = Boolean(search || statusFilter || cityFilter || transactionFilter);

  const totalPages = counts
    ? Math.max(1, Math.ceil(counts.total / PAGE_SIZE))
    : fetchedPages.length;
  const rangeStart = counts && counts.total > 0 ? currentPage * PAGE_SIZE + 1 : 0;
  const rangeEnd = currentPage * PAGE_SIZE + pageItems.length;

  if (!user) return null;

  return (
    <DashboardShell active="listings">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Mes annonces
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Gérez l&apos;ensemble de vos biens immobiliers publiés sur la plateforme.
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
            href="/listings/new"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Publier</span>
            <span className="hidden lg:inline">Publier une annonce</span>
          </Link>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total annonces',
            value: counts?.total,
            dot: '#376BFF',
            sub: 'Toutes catégories',
          },
          {
            label: 'Annonces vérifiées',
            value: counts?.verified,
            dot: '#10B981',
            sub:
              counts && counts.total > 0
                ? `${Math.round((counts.verified / counts.total) * 100)}% du total`
                : '—',
          },
          {
            label: 'En attente',
            value: counts?.pending,
            dot: '#F59E0B',
            sub: 'Vérification en cours',
          },
          { label: 'Biens vendus', value: counts?.sold, dot: '#EF4444', sub: '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <p className="mb-2 text-xs font-medium text-gray-400">{s.label}</p>
            <p className="font-sora mb-1 text-2xl font-semibold text-neutral-900">
              {s.value ?? '–'}
            </p>
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
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-black/[0.08] bg-gray-50 px-3.5 py-2 lg:max-w-[320px]">
            <Search className="h-[14px] w-[14px] flex-shrink-0 text-gray-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une annonce…"
              className="w-full truncate bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-[3px]">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'rounded-md px-3.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap',
                  statusFilter === tab.value
                    ? 'bg-white font-semibold text-neutral-900 shadow-sm'
                    : 'text-gray-400',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[13px] text-neutral-700"
            >
              <option value="">Toutes villes</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={transactionFilter}
              onChange={(e) => setTransactionFilter(e.target.value)}
              className="rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[13px] text-neutral-700"
            >
              <option value="">Tous types</option>
              {Object.entries(TRANSACTION_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-2xl bg-white">
        {loadingPage ? (
          <p className="py-8 text-center text-sm text-gray-400">Chargement…</p>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <p className="text-sm font-medium text-neutral-700">
              Aucune annonce pour l&apos;instant
            </p>
            <p className="max-w-xs text-xs text-gray-400">
              L&apos;écran de publication n&apos;est pas encore construit — cette table
              s&apos;affichera dès qu&apos;une annonce existera pour votre compte.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <p className="text-sm font-medium text-neutral-700">Aucun résultat pour ces critères</p>
            <p className="max-w-xs text-xs text-gray-400">
              Filtres appliqués sur cette page uniquement — changez de page ou réinitialisez pour
              voir d&apos;autres résultats.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-5 py-3">
                    <div
                      className="h-4 w-4 rounded border border-black/[0.12] bg-white"
                      aria-hidden
                    />
                  </th>
                  {[
                    { label: 'Annonce', mobileHidden: false },
                    { label: 'Localisation', mobileHidden: false },
                    { label: 'Type', mobileHidden: true },
                    { label: 'Prix (FCFA)', mobileHidden: false },
                    { label: 'Contacts', mobileHidden: true },
                    { label: 'Statut', mobileHidden: false },
                    { label: 'Publié le', mobileHidden: true },
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
                {filteredItems.map((l) => {
                  const badge = STATUS_BADGE[l.status] ?? STATUS_BADGE.PENDING!;
                  const BadgeIcon = badge.icon;
                  return (
                    <tr key={l.id} className="border-b border-black/[0.06] last:border-0">
                      <td className="px-5 py-4">
                        <div
                          className="h-4 w-4 rounded border border-black/[0.12] bg-white"
                          aria-hidden
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-[52px] flex-shrink-0 items-center justify-center rounded-md bg-gray-100">
                            <Building2 className="h-4 w-4 text-gray-300" aria-hidden />
                          </div>
                          <div>
                            <p className="max-w-[180px] truncate text-[13.5px] font-semibold text-neutral-900 lg:max-w-[220px]">
                              {l.title}
                            </p>
                            <p className="text-[11.5px] text-gray-400">{formatListingRef(l)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-neutral-700">
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <MapPin className="h-3 w-3 text-gray-400" aria-hidden />
                          {l.city}, {l.country}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 lg:table-cell">
                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-neutral-700">
                          {TRANSACTION_TYPE_LABEL[l.transactionType] ?? l.transactionType}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[13.5px] font-semibold whitespace-nowrap text-neutral-900">
                        {formatListingPrice(l.price, l.currency)}
                        {l.transactionType === 'RENT' && (
                          <span className="font-normal text-gray-400"> / mois</span>
                        )}
                      </td>
                      <td className="hidden px-5 py-4 text-[13px] text-neutral-700 lg:table-cell">
                        —
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            badge.className,
                          )}
                        >
                          <BadgeIcon className="h-2.5 w-2.5" aria-hidden />
                          {STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 text-[12.5px] whitespace-nowrap text-gray-400 lg:table-cell">
                        {DATE_FORMATTER.format(new Date(l.createdAt))}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
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
                            className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-400"
                          >
                            <Pencil className="h-[13px] w-[13px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled
                            title="Bientôt disponible"
                            className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-red-100 bg-gray-50 text-red-300"
                          >
                            <Trash2 className="h-[13px] w-[13px]" aria-hidden />
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
                Filtres appliqués sur cette page uniquement.
              </p>
            )}

            {/* PAGINATION */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] px-5 py-3.5">
              <p className="text-[12.5px] text-gray-400">
                {counts && counts.total > 0
                  ? `Affichage de ${rangeStart} à ${rangeEnd} sur ${counts.total} annonces`
                  : 'Aucune annonce'}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void goToPage(currentPage - 1)}
                  disabled={currentPage === 0 || loadingPage}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-[14px] w-[14px]" aria-hidden />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => void goToPage(i)}
                    disabled={loadingPage}
                    className={cn(
                      'flex h-[30px] w-[30px] items-center justify-center rounded-md text-[13px] font-medium',
                      i === currentPage
                        ? 'bg-brand font-semibold text-white'
                        : 'text-neutral-700 hover:bg-gray-50',
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void goToPage(currentPage + 1)}
                  disabled={(!hasMore && currentPage >= fetchedPages.length - 1) || loadingPage}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loadingPage ? (
                    <Loader2 className="h-[14px] w-[14px] animate-spin" aria-hidden />
                  ) : (
                    <ChevronRight className="h-[14px] w-[14px]" aria-hidden />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
