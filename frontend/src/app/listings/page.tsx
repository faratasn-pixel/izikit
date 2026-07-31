'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Plus, MapPin, Eye, Pencil, Loader2, X } from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  PROPERTY_TYPE_LABEL,
  STATUS_STYLE,
  STATUS_LABEL,
  formatListingPrice,
  type Listing,
} from '@/lib/listings';
import { cn } from '@/lib/utils';

interface ListingsPageResult {
  items: Listing[];
  nextCursor: string | null;
}

const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));
const TYPE_OPTIONS = Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

export default function ListingsPage() {
  const user = useUser();
  const { data: firstPage, loading } = useApi<ListingsPageResult>('/api/listings?limit=20');

  const [extraPages, setExtraPages] = useState<Listing[][]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [filterOpen]);

  // Resets accumulated extra pages whenever the first page is (re)fetched —
  // e.g. on mount, or on useApi's background stale-while-revalidate refresh.
  useEffect(() => {
    setExtraPages([]);
    setNextCursor(firstPage?.nextCursor ?? null);
  }, [firstPage]);

  const listings = useMemo(
    () => [...(firstPage?.items ?? []), ...extraPages.flat()],
    [firstPage, extraPages],
  );

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api<ListingsPageResult>(
        `/api/listings?limit=20&cursor=${encodeURIComponent(nextCursor)}`,
      );
      setExtraPages((prev) => [...prev, page.items]);
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  const activeFilterCount = (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (typeFilter && l.propertyType !== typeFilter) return false;
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
  }, [listings, search, statusFilter, typeFilter]);

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
  }

  if (!user) return null;

  return (
    <DashboardShell active="listings">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap lg:gap-3">
          <div className="w-full lg:mr-auto lg:w-auto">
            <h1 className="font-sora text-[15px] font-semibold text-neutral-900">Mes annonces</h1>
            <p className="text-xs text-gray-400">
              {filteredListings.length} annonce{filteredListings.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-1.5 lg:min-w-[200px] lg:flex-none">
            <Search className="h-[14px] w-[14px] flex-shrink-0 text-gray-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une annonce…"
              className="w-full truncate bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          <div className="relative flex-shrink-0" ref={filterPanelRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:bg-gray-50 lg:px-3.5"
            >
              <SlidersHorizontal className="h-[14px] w-[14px]" aria-hidden />
              <span className="hidden lg:inline">Filtrer</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-black/[0.06] bg-white p-4 shadow-lg">
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase">
                      Statut
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-[13px] text-neutral-900"
                    >
                      <option value="">Tous</option>
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase">
                      Type
                    </span>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-[13px] text-neutral-900"
                    >
                      <option value="">Tous</option>
                      {TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="flex items-center gap-1 self-start text-[12px] font-medium text-brand hover:underline"
                    >
                      <X className="h-3 w-3" aria-hidden />
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled
            title="Bientôt disponible — l'écran de publication n'est pas encore implémenté"
            className="flex flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-3.5 py-1.5 text-[13px] font-semibold text-white lg:px-4"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Publier</span>
            <span className="hidden lg:inline">Publier une annonce</span>
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Chargement…</p>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <p className="text-sm font-medium text-neutral-700">
              Aucune annonce pour l&apos;instant
            </p>
            <p className="max-w-xs text-xs text-gray-400">
              L&apos;écran de publication n&apos;est pas encore construit — cette table
              s&apos;affichera dès qu&apos;une annonce existera pour votre compte.
            </p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <p className="text-sm font-medium text-neutral-700">Aucun résultat pour ces critères</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-brand hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {[
                      { label: 'ID', mobileHidden: true },
                      { label: "Titre de l'annonce", mobileHidden: false },
                      { label: 'Localisation', mobileHidden: false },
                      { label: 'Type', mobileHidden: true },
                      { label: 'Prix', mobileHidden: false },
                      { label: 'Statut', mobileHidden: false },
                      { label: '', mobileHidden: false },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={cn(
                          'font-sora border-b border-black/[0.06] px-3.5 py-2 text-left text-[11px] font-semibold whitespace-nowrap text-gray-400 uppercase',
                          h.mobileHidden && 'hidden lg:table-cell',
                        )}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((l) => {
                    const st = STATUS_STYLE[l.status] ?? STATUS_STYLE.PENDING!;
                    return (
                      <tr key={l.id} className="border-b border-black/[0.06] last:border-0">
                        <td className="hidden px-3.5 py-3 text-xs text-gray-400 lg:table-cell">
                          #{l.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="max-w-[160px] truncate px-3.5 py-3 text-[13.5px] font-medium text-neutral-900 lg:max-w-[220px]">
                          {l.title}
                        </td>
                        <td className="px-3.5 py-3 text-[13px] text-neutral-700">
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <MapPin className="h-3 w-3 text-gray-400" aria-hidden />
                            {l.city}, {l.country}
                          </span>
                        </td>
                        <td className="hidden px-3.5 py-3 lg:table-cell">
                          <span className="rounded bg-gray-100 px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap text-neutral-700">
                            {PROPERTY_TYPE_LABEL[l.propertyType] ?? l.propertyType}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-[13.5px] font-semibold whitespace-nowrap text-neutral-900">
                          {formatListingPrice(l.price, l.currency)}
                        </td>
                        <td className="px-3.5 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                              st.className,
                            )}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled
                              title="Bientôt disponible"
                              className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md bg-gray-100 text-gray-400"
                            >
                              <Eye className="h-[13px] w-[13px]" aria-hidden />
                            </button>
                            <button
                              type="button"
                              disabled
                              title="Bientôt disponible"
                              className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md bg-gray-100 text-gray-400"
                            >
                              <Pencil className="h-[13px] w-[13px]" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(search || activeFilterCount > 0) && nextCursor && (
              <p className="px-1 text-center text-[11px] text-gray-400">
                Résultats filtrés parmi les annonces chargées — cliquez sur Charger plus pour
                élargir la recherche.
              </p>
            )}

            {nextCursor && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  {loadingMore ? 'Chargement…' : 'Charger plus'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
