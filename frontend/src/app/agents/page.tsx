'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe2,
  Loader2,
  Phone,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { InitialsAvatar } from '@/components/dashboard/InitialsAvatar';
import { COUNTRY_FLAG } from '@/lib/alerts';

interface PublicAgentItem {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  createdAt: string;
  listingCount: number;
  verifiedDocCount: number;
  verifiedDocTotal: number;
}

interface Facet {
  value: string;
  count: number;
}

interface PublicAgentsResponse {
  items: PublicAgentItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: { countries: Facet[] };
  stats: { totalAgents: number; countriesCount: number; fullyVerifiedPercent: number };
}

const LIMIT = 9;

type TabKey = 'tous' | 'vente' | 'location' | 'terrain';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'vente', label: 'Vente' },
  { key: 'location', label: 'Location' },
  { key: 'terrain', label: 'Terrain' },
];

function InertRow({ children }: { children: React.ReactNode }) {
  return (
    <div title="Bientôt disponible" className="cursor-not-allowed select-none">
      {children}
    </div>
  );
}

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [country, setCountry] = useState('');
  const [tab, setTab] = useState<TabKey>('tous');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PublicAgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (country) params.set('country', country);
    if (tab === 'vente') params.set('transactionType', 'VENTE');
    if (tab === 'location') params.set('transactionType', 'LOCATION');
    if (tab === 'terrain') params.set('propertyType', 'PARCELLE');
    params.set('page', String(page));
    params.set('limit', String(LIMIT));

    api<PublicAgentsResponse>(`/api/public/agents?${params.toString()}`)
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
  }, [debouncedSearch, country, tab, page]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const countries = data?.facets.countries ?? [];
  const stats = data?.stats ?? { totalAgents: 0, countriesCount: 0, fullyVerifiedPercent: 0 };

  function selectCountry(value: string) {
    setCountry(value);
    setPage(1);
  }

  function selectTab(value: TabKey) {
    setTab(value);
    setPage(1);
  }

  return (
    <div className="bg-white text-neutral-900">
      <PublicNavbar active="agents" />

      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-16 lg:px-7 lg:py-[64px]"
        style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 60%, #0F172A 100%)' }}
      >
        <div className="pointer-events-none absolute -top-[120px] -right-20 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="relative z-[1] mx-auto flex max-w-[1280px] flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[640px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-[7px] text-xs font-semibold tracking-[0.14em] text-white/90 uppercase">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Agents certifiés Habitat-Afrik
            </div>
            <h1 className="font-sora mb-4 text-[34px] leading-[1.06] font-extrabold tracking-[-0.05em] text-white lg:text-[56px]">
              Des experts locaux{' '}
              <em className="text-white/80 not-italic italic">à votre service</em>
            </h1>
            <p className="mb-7 max-w-[520px] text-[15px] leading-relaxed text-white/82 lg:text-base">
              Tous nos agents sont vérifiés, certifiés et formés. Trouvez le professionnel idéal
              pour votre projet immobilier au Bénin, Togo, Côte d&apos;Ivoire ou Sénégal.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              {[
                { value: `${stats.totalAgents}`, label: 'Agents certifiés' },
                { value: `${stats.countriesCount}`, label: 'Pays couverts' },
                { value: `${stats.fullyVerifiedPercent}%`, label: 'KYC validé' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  {i > 0 && <div className="h-9 w-px bg-white/18" />}
                  <div className="flex flex-col gap-0.5">
                    <strong className="font-sora text-[28px] font-extrabold tracking-[-0.04em] text-white">
                      {s.value}
                    </strong>
                    <span className="text-xs whitespace-nowrap text-white/70">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            {items.slice(0, 5).map((a, i) => (
              <InitialsAvatar
                key={a.id}
                name={a.name}
                email=""
                seed={a.id}
                avatarUrl={a.avatarUrl}
                size={60}
                className={cn('border-[3px] border-white/60', i > 0 && '-ml-3.5')}
              />
            ))}
            {stats.totalAgents > 5 && (
              <div className="-ml-3.5 flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-white/60 bg-white/18 text-[13px] font-bold whitespace-nowrap text-white">
                +{stats.totalAgents - 5}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="sticky top-0 z-10 border-b border-black/[0.06] bg-white px-4 py-4 lg:px-7">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3">
          <div className="flex min-w-[200px] max-w-[320px] flex-1 items-center gap-2.5 rounded-full border border-black/[0.1] px-3.5 py-2.5">
            <Search className="h-[15px] w-[15px] flex-shrink-0 text-gray-400" aria-hidden />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher un agent…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="h-6 w-px bg-black/[0.08]" />
          <InertRow>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.1] px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap text-gray-500">
              <Star className="h-3.5 w-3.5" aria-hidden />
              Note minimale
              <ChevronDown className="h-[13px] w-[13px]" aria-hidden />
            </span>
          </InertRow>
          <InertRow>
            <span className="hidden items-center gap-2 rounded-full border border-black/[0.1] px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap text-gray-500 sm:inline-flex">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              Spécialité
              <ChevronDown className="h-[13px] w-[13px]" aria-hidden />
            </span>
          </InertRow>
          <div className="ml-auto flex items-center gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => selectTab(t.key)}
                className={cn(
                  'rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap',
                  tab === t.key ? 'bg-brand text-white' : 'border border-black/[0.1] text-gray-500',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[13px] whitespace-nowrap text-gray-500">
            {total} agent{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* MAIN */}
      <section className="px-4 py-10 pb-20 lg:px-7">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          {/* SIDEBAR */}
          <aside className="flex flex-col gap-7 lg:sticky lg:top-[90px] lg:self-start lg:rounded-2xl lg:border lg:border-black/[0.06] lg:bg-white lg:p-6">
            <div>
              <p className="mb-3 text-xs font-bold tracking-[0.12em] text-gray-500 uppercase">
                Par pays
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => selectCountry('')}
                  className={cn(
                    'flex items-center justify-between gap-2.5 rounded-[10px] px-3 py-2.5 text-left',
                    country === '' && 'bg-brand/10',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Globe2 className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        country === '' ? 'font-semibold text-brand' : 'text-neutral-900',
                      )}
                    >
                      Tous les pays
                    </span>
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs whitespace-nowrap',
                      country === '' ? 'bg-brand/15 text-brand' : 'bg-gray-100 text-gray-500',
                    )}
                  >
                    {stats.totalAgents}
                  </span>
                </button>
                {countries.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => selectCountry(c.value)}
                    className={cn(
                      'flex items-center justify-between gap-2.5 rounded-[10px] px-3 py-2.5 text-left',
                      country === c.value && 'bg-brand/10',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{COUNTRY_FLAG[c.value] ?? '🌍'}</span>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          country === c.value ? 'font-semibold text-brand' : 'text-neutral-900',
                        )}
                      >
                        {c.value}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs whitespace-nowrap',
                        country === c.value
                          ? 'bg-brand/15 text-brand'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {c.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold tracking-[0.12em] text-gray-500 uppercase">
                Note minimale
              </p>
              <div className="flex flex-col gap-1.5">
                {['4,5+ ★★★★★', '4,0+ ★★★★☆', '3,5+ ★★★☆☆'].map((s) => (
                  <InertRow key={s}>
                    <span className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5">
                      <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                      <span className="text-sm font-medium">{s}</span>
                    </span>
                  </InertRow>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold tracking-[0.12em] text-gray-500 uppercase">
                Disponibilité
              </p>
              <div className="flex flex-col gap-1.5">
                {['Disponible maintenant', 'Répond en < 1h'].map((s) => (
                  <InertRow key={s}>
                    <span className="rounded-[10px] px-3 py-2.5 text-sm font-medium">{s}</span>
                  </InertRow>
                ))}
              </div>
            </div>
          </aside>

          {/* CONTENT */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-500">
                <strong className="font-bold text-neutral-900">
                  {total} agent{total > 1 ? 's' : ''}
                </strong>{' '}
                certifié{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-black/[0.06] bg-gray-50 p-10 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Chargement des agents…
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.06] bg-gray-50 p-10 text-center text-sm text-gray-500">
                Aucun agent ne correspond à ces critères.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col overflow-hidden rounded-[20px] border border-black/[0.06]"
                  >
                    <div
                      className="flex flex-col items-center gap-1 px-5 pt-6 pb-4 text-center"
                      style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #E0F2FE 100%)' }}
                    >
                      <InitialsAvatar
                        name={a.name}
                        email=""
                        seed={a.id}
                        avatarUrl={a.avatarUrl}
                        size={72}
                        className="mb-3.5 border-[3px] border-white"
                      />
                      <div className="text-[17px] font-bold">{a.name ?? 'Agent Habitat-Afrik'}</div>
                      <div className="mb-2.5 text-[13px] text-gray-500">
                        Agent immobilier{a.city ? ` · ${a.city}` : ''}
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-xs font-bold',
                          a.verifiedDocCount >= a.verifiedDocTotal
                            ? 'bg-brand/10 text-brand'
                            : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        <ShieldCheck className="h-3 w-3" aria-hidden />
                        {a.verifiedDocCount >= a.verifiedDocTotal
                          ? 'KYC validé'
                          : `KYC ${a.verifiedDocCount}/${a.verifiedDocTotal}`}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3.5 p-5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-[10px] bg-gray-50 px-2 py-2.5 text-center">
                          <strong className="block text-[16px] font-extrabold tracking-[-0.03em]">
                            {a.listingCount}
                          </strong>
                          <span className="block truncate text-[11px] whitespace-nowrap text-gray-500">
                            Annonces
                          </span>
                        </div>
                        <div className="rounded-[10px] bg-gray-50 px-2 py-2.5 text-center">
                          <strong className="block text-[16px] font-extrabold tracking-[-0.03em] text-gray-300">
                            —
                          </strong>
                          <span className="block truncate text-[11px] whitespace-nowrap text-gray-500">
                            Note
                          </span>
                        </div>
                      </div>
                      <p className="text-[13px] leading-relaxed">
                        {a.bio ?? 'Cet agent n’a pas encore ajouté de description.'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/agents/${a.id}`}
                          className="flex items-center justify-center gap-1.5 rounded-[10px] bg-gray-100 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          Profil
                        </Link>
                        <Link
                          href={`/agents/${a.id}`}
                          className="flex items-center justify-center gap-1.5 rounded-[10px] bg-brand px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap text-white"
                        >
                          <Phone className="h-3.5 w-3.5" aria-hidden />
                          Contacter
                        </Link>
                      </div>
                      <span className="text-[13px] whitespace-nowrap text-gray-500">
                        {a.country ? `${COUNTRY_FLAG[a.country] ?? ''} ${a.country}` : ''}
                        {a.country && a.city ? ' · ' : ''}
                        {a.city ?? ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.1] text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === totalPages)
                  .reduce<number[]>((acc, n) => {
                    if (acc.length && n - acc[acc.length - 1]! > 1) acc.push(-1);
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === -1 ? (
                      <span
                        key={`gap-${i}`}
                        className="flex h-9 w-9 items-center justify-center text-sm text-gray-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium',
                          n === page
                            ? 'border-brand bg-brand text-white'
                            : 'border-black/[0.1] text-neutral-900',
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.1] text-gray-500 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
