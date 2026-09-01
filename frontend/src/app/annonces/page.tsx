'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Check,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { InitialsAvatar } from '@/components/dashboard/InitialsAvatar';
import {
  PROPERTY_TYPE_LABEL,
  TRANSACTION_TYPE_LABEL,
  formatListingPrice,
  cloudinaryOptimize,
} from '@/lib/listings';
import { COUNTRY_FLAG, formatDate } from '@/lib/alerts';

interface PublicListingItem {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  transactionType: string;
  price: number;
  currency: string;
  createdAt: string;
  primaryPhotoUrl: string | null;
  photoCount: number;
  agent: { name: string | null; avatarUrl: string | null; seed: string };
}

interface Facet {
  value: string;
  count: number;
}

interface PublicListingsResponse {
  items: PublicListingItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: {
    countries: Facet[];
    propertyTypes: Facet[];
    transactionTypes: Facet[];
  };
}

const LIMIT = 9;

function InertPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      title="Bientôt disponible"
      className={cn(
        'inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-black/[0.08] px-3.5 py-2 text-[13px] font-medium whitespace-nowrap text-gray-500 select-none',
        className,
      )}
    >
      {children}
    </span>
  );
}

export default function AnnoncesPage() {
  return (
    <Suspense fallback={null}>
      <AnnoncesPageContent />
    </Suspense>
  );
}

function AnnoncesPageContent() {
  // Seeded once from the URL on first render — e.g. the homepage search
  // bar linking in with ?country=...&city=...&propertyType=...&transactionType=.
  // Subsequent filter changes update local state only (no URL sync back),
  // same as every other filter here.
  const searchParams = useSearchParams();

  const [view, setView] = useState<'grid' | 'list'>('grid');

  const [country, setCountry] = useState(() => searchParams.get('country') ?? '');
  const [city, setCity] = useState(() => searchParams.get('city') ?? '');
  const [propertyType, setPropertyType] = useState(() => searchParams.get('propertyType') ?? '');
  const [transactionType, setTransactionType] = useState(
    () => searchParams.get('transactionType') ?? '',
  );
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PublicListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (city) params.set('city', city);
    if (propertyType) params.set('propertyType', propertyType);
    if (transactionType) params.set('transactionType', transactionType);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    params.set('page', String(page));
    params.set('limit', String(LIMIT));

    api<PublicListingsResponse>(`/api/public/listings?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country, city, propertyType, transactionType, priceMin, priceMax, page]);

  function resetFilters() {
    setCountry('');
    setCity('');
    setPropertyType('');
    setTransactionType('');
    setPriceMin('');
    setPriceMax('');
    setPage(1);
  }

  function setFilterAndResetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const setCountryFiltered = setFilterAndResetPage(setCountry);
  const setCityFiltered = setFilterAndResetPage(setCity);
  const setPropertyTypeFiltered = setFilterAndResetPage(setPropertyType);
  const setTransactionTypeFiltered = setFilterAndResetPage(setTransactionType);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const countries = data?.facets.countries ?? [];
  const propertyTypes = data?.facets.propertyTypes ?? [];
  const transactionTypes = data?.facets.transactionTypes ?? [];

  const countryLabel = countries.length
    ? countries.map((c) => c.value).join(', ')
    : 'Bénin, Togo, Côte d’Ivoire, Sénégal';

  return (
    <div className="bg-white text-neutral-900">
      <PublicNavbar active="annonces" />

      {/* PAGE HEADER */}
      <div className="border-b border-black/[0.06]">
        <div className="mx-auto max-w-[1280px] px-4 py-8 lg:px-7">
          <p className="mb-2.5 flex items-center gap-2 text-[13px] text-gray-500">
            <span>Accueil</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-neutral-900">Toutes les annonces</span>
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-sora text-[26px] font-extrabold tracking-[-0.04em] lg:text-[32px]">
                Toutes les annonces
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                <span className="font-semibold text-brand">
                  {total} annonce{total === 1 ? '' : 's'}
                </span>{' '}
                trouvée{total === 1 ? '' : 's'} · {countryLabel}
              </p>
            </div>
            <div className="flex items-center gap-0.5 rounded-lg border border-black/[0.08] p-1">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md',
                  view === 'grid' ? 'bg-gray-100 text-neutral-900' : 'text-gray-400',
                )}
                aria-label="Vue grille"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md',
                  view === 'list' ? 'bg-gray-100 text-neutral-900' : 'text-gray-400',
                )}
                aria-label="Vue liste"
              >
                <List className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="sticky top-0 z-10 border-b border-black/[0.06] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1280px] overflow-x-auto px-4 py-3.5 lg:px-7">
          <div className="flex items-center gap-2.5">
            <InertPill className="border-brand bg-brand/[0.06] text-brand">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Tous les pays
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <div className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] px-3.5 py-2 text-[13px] font-medium text-gray-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              <input
                value={city}
                onChange={(e) => setCityFiltered(e.target.value)}
                placeholder="Toutes les villes"
                className="w-[120px] bg-transparent text-neutral-900 outline-none placeholder:text-gray-500"
              />
            </div>
            <InertPill>
              Type de bien
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <InertPill>
              Transaction
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <InertPill>
              Prix
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
            <span className="h-7 w-px flex-shrink-0 bg-black/[0.08]" />
            <InertPill>
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Plus de filtres
            </InertPill>
            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <span className="text-[13px] whitespace-nowrap text-gray-500">Trier par :</span>
              <InertPill>
                Date (récent)
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </InertPill>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-[1280px] px-4 py-8 lg:px-7">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[260px_1fr]">
          {/* SIDEBAR FILTERS — desktop only, no mobile off-canvas built this pass */}
          <aside className="hidden rounded-2xl border border-black/[0.06] bg-white p-[22px] lg:sticky lg:top-[88px] lg:block lg:self-start">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[15px] font-bold">Filtres</p>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-brand"
              >
                Réinitialiser
              </button>
            </div>

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Type de bien
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setPropertyTypeFiltered('')}
                  className="flex items-center gap-2.5 text-left text-[13px]"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                      propertyType === '' ? 'bg-brand' : 'border border-black/[0.15]',
                    )}
                  >
                    {propertyType === '' && (
                      <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                    )}
                  </span>
                  Tous les types
                </button>
                {propertyTypes.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setPropertyTypeFiltered(f.value)}
                    className="flex items-center gap-2.5 text-left text-[13px] text-gray-600"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                        propertyType === f.value ? 'bg-brand' : 'border border-black/[0.15]',
                      )}
                    >
                      {propertyType === f.value && (
                        <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                      )}
                    </span>
                    <span className="flex-1">{PROPERTY_TYPE_LABEL[f.value] ?? f.value}</span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Fourchette de prix
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min (FCFA)"
                  value={priceMin}
                  onChange={(e) => {
                    setPriceMin(e.target.value.replace(/\D/g, ''));
                    setPage(1);
                  }}
                  className="rounded-lg border border-black/[0.08] bg-gray-50 px-2.5 py-2 text-xs text-neutral-900 focus:border-brand focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max (FCFA)"
                  value={priceMax}
                  onChange={(e) => {
                    setPriceMax(e.target.value.replace(/\D/g, ''));
                    setPage(1);
                  }}
                  className="rounded-lg border border-black/[0.08] bg-gray-50 px-2.5 py-2 text-xs text-neutral-900 focus:border-brand focus:outline-none"
                />
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Pays
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setCountryFiltered('')}
                  className="flex items-center gap-2.5 text-left text-[13px]"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                      country === '' ? 'bg-brand' : 'border border-black/[0.15]',
                    )}
                  >
                    {country === '' && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                  </span>
                  Tous les pays
                </button>
                {countries.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setCountryFiltered(f.value)}
                    className="flex items-center gap-2.5 text-left text-[13px] text-gray-600"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                        country === f.value ? 'bg-brand' : 'border border-black/[0.15]',
                      )}
                    >
                      {country === f.value && (
                        <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                      )}
                    </span>
                    <span className="flex-1">
                      {COUNTRY_FLAG[f.value] ?? ''} {f.value}
                    </span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-5">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Surface minimale
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-brand">
                    <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                  </span>
                  Toutes surfaces
                </div>
                {['50 m² +', '100 m² +', '200 m² +', '500 m² +'].map((s) => (
                  <div key={s} className="flex items-center gap-2.5 text-[13px] text-gray-600">
                    <span className="h-4 w-4 flex-shrink-0 rounded border border-black/[0.15]" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* LISTINGS AREA */}
          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTransactionTypeFiltered('')}
                className={cn(
                  'rounded-full border px-4 py-2 text-[13px] font-medium whitespace-nowrap',
                  transactionType === ''
                    ? 'border-brand bg-brand text-white'
                    : 'border-black/[0.08] text-gray-500',
                )}
              >
                Toutes ({total})
              </button>
              {transactionTypes.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setTransactionTypeFiltered(f.value)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-[13px] font-medium whitespace-nowrap',
                    transactionType === f.value
                      ? 'border-brand bg-brand text-white'
                      : 'border-black/[0.08] text-gray-500',
                  )}
                >
                  {TRANSACTION_TYPE_LABEL[f.value] ?? f.value} ({f.count})
                </button>
              ))}
            </div>

            {loading && !data ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.06] py-14 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
                <p className="text-xs text-gray-400">Chargement des annonces…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.06] py-14 text-center">
                <p className="text-sm font-medium text-neutral-700">Aucune annonce ne correspond</p>
                <p className="text-xs text-gray-400">Essayez d&apos;élargir vos filtres.</p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
                {items.map((listing) => (
                  <div
                    key={listing.id}
                    className="overflow-hidden rounded-2xl border border-black/[0.06]"
                  >
                    <div className="relative h-[200px] bg-gray-100">
                      {listing.primaryPhotoUrl ? (
                        <img
                          src={cloudinaryOptimize(listing.primaryPhotoUrl, 700)}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-300" aria-hidden />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-black/78 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                          {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
                        </span>
                        <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                          {TRANSACTION_TYPE_LABEL[listing.transactionType] ??
                            listing.transactionType}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 p-4">
                      <p className="mb-1.5 text-[15px] leading-snug font-bold">{listing.title}</p>
                      <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                        {listing.city} · {COUNTRY_FLAG[listing.country] ?? ''} {listing.country}
                      </p>
                      <div className="mb-3 flex items-center gap-2">
                        <InitialsAvatar
                          name={listing.agent.name}
                          email=""
                          avatarUrl={listing.agent.avatarUrl}
                          seed={listing.agent.seed}
                          size={22}
                        />
                        <span className="text-xs text-gray-500">
                          {listing.agent.name ?? 'Agent'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                          <BadgeCheck className="h-3 w-3" aria-hidden />
                          Vérifié
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] pt-2.5">
                        <p className="text-lg font-extrabold tracking-[-0.03em] text-brand">
                          {formatListingPrice(listing.price, listing.currency)}
                        </p>
                        <Link
                          href={`/annonces/${listing.id}`}
                          className="flex items-center gap-1 text-[13px] font-medium text-brand"
                        >
                          Voir <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {items.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] sm:flex-row"
                  >
                    <div className="relative h-[200px] flex-shrink-0 bg-gray-100 sm:h-auto sm:w-[220px]">
                      {listing.primaryPhotoUrl ? (
                        <img
                          src={cloudinaryOptimize(listing.primaryPhotoUrl, 440)}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-300" aria-hidden />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="rounded-full bg-black/78 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                          {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
                        </span>
                        <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                          {TRANSACTION_TYPE_LABEL[listing.transactionType] ??
                            listing.transactionType}
                        </span>
                      </div>
                      <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-black/70 px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap text-white">
                        <ImageIcon className="h-[11px] w-[11px]" aria-hidden />
                        {listing.photoCount}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-3 p-[18px] sm:p-5">
                      <div>
                        <div className="mb-2 flex items-start justify-between gap-4">
                          <p className="max-w-[480px] truncate text-[17px] font-bold tracking-[-0.02em]">
                            {listing.title}
                          </p>
                          <p className="flex-shrink-0 text-right text-xl font-extrabold whitespace-nowrap text-brand">
                            {formatListingPrice(listing.price, listing.currency)}
                          </p>
                        </div>
                        <p className="mb-2.5 flex items-center gap-1.5 text-[13px] text-gray-500">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                          {listing.city} · {COUNTRY_FLAG[listing.country] ?? ''} {listing.country}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-3">
                        <div className="flex items-center gap-2">
                          <InitialsAvatar
                            name={listing.agent.name}
                            email=""
                            avatarUrl={listing.agent.avatarUrl}
                            seed={listing.agent.seed}
                            size={26}
                          />
                          <span className="text-[13px] text-gray-500">
                            {listing.agent.name ?? 'Agent'}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                            <BadgeCheck className="h-3 w-3" aria-hidden />
                            Vérifié
                          </span>
                          <span className="text-xs whitespace-nowrap text-gray-400">
                            · Publié le {formatDate(listing.createdAt)}
                          </span>
                        </div>
                        <Link
                          href={`/annonces/${listing.id}`}
                          className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[13px] font-medium whitespace-nowrap text-white"
                        >
                          Voir le détail
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<number[]>((acc, n) => {
                    if (acc.length && n - acc[acc.length - 1]! > 1) acc.push(-1); // ellipsis marker
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === -1 ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg border text-[13px] font-medium',
                          n === page
                            ? 'border-brand bg-brand text-white'
                            : 'border-black/[0.08] text-neutral-700',
                        )}
                      >
                        {n}
                      </button>
                    ),
                  )}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
