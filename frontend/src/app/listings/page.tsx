'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, MapPin, Eye, Pencil, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PROPERTY_TYPE_LABEL, STATUS_STYLE, formatListingPrice, type Listing } from '@/lib/listings';
import { cn } from '@/lib/utils';

interface ListingsPageResult {
  items: Listing[];
  nextCursor: string | null;
}

export default function ListingsPage() {
  const user = useUser();
  const { data: firstPage, loading } = useApi<ListingsPageResult>('/api/listings?limit=20');

  const [extraPages, setExtraPages] = useState<Listing[][]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

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

  if (!user) return null;

  return (
    <DashboardShell active="listings">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap lg:gap-3">
          <div className="w-full lg:mr-auto lg:w-auto">
            <h1 className="font-sora text-[15px] font-semibold text-neutral-900">Mes annonces</h1>
            <p className="text-xs text-gray-400">
              {listings.length} annonce{listings.length === 1 ? '' : 's'}
            </p>
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
                  {listings.map((l) => {
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
