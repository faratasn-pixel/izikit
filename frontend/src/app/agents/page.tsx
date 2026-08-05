'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BadgeCheck,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Globe2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

type CountryCode = 'BJ' | 'TG' | 'CI' | 'SN';
type Transaction = 'vente' | 'location' | 'terrain';

interface Agent {
  id: string;
  name: string;
  role: string;
  country: CountryCode;
  countryLabel: string;
  city: string;
  avatar: string;
  cert: string;
  certIcon: typeof BadgeCheck;
  bio: string;
  transaction: Transaction;
  stats: { value: string; label: string }[];
  featured?: {
    quote: string;
    responseTime: string;
    availability: string;
    rating: string;
    stats: { value: string; label: string }[];
  };
}

const COUNTRIES: { code: CountryCode | 'all'; flag: string; label: string; count: number }[] = [
  { code: 'all', flag: '🌍', label: 'Tous les pays', count: 124 },
  { code: 'BJ', flag: '🇧🇯', label: 'Bénin', count: 38 },
  { code: 'TG', flag: '🇹🇬', label: 'Togo', count: 22 },
  { code: 'CI', flag: '🇨🇮', label: "Côte d'Ivoire", count: 41 },
  { code: 'SN', flag: '🇸🇳', label: 'Sénégal', count: 23 },
];

const SPECIALTIES = [
  { label: 'Villa & Maison', count: 54 },
  { label: 'Appartement', count: 38 },
  { label: 'Terrain foncier', count: 20 },
  { label: 'Bureau & commercial', count: 12 },
];

const TABS: { key: 'tous' | Transaction; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'vente', label: 'Vente' },
  { key: 'location', label: 'Location' },
  { key: 'terrain', label: 'Terrain' },
];

const AGENTS: Agent[] = [
  {
    id: 'kofi-atta',
    name: 'Kofi Atta',
    role: 'Consultant premium · Abidjan',
    country: 'CI',
    countryLabel: "Côte d'Ivoire",
    city: 'Abidjan',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F2',
    cert: 'Certifié',
    certIcon: BadgeCheck,
    bio: 'Expert des villas haut de gamme à Cocody et Marcory. Accompagnement complet de la visite à la signature pour les familles et investisseurs exigeants.',
    transaction: 'vente',
    stats: [],
    featured: {
      quote:
        'Expert des villas haut de gamme à Cocody et Marcory. Accompagnement complet de la visite à la signature pour les familles et investisseurs exigeants.',
      responseTime: 'Répond en 12 min',
      availability: 'Disponible cette semaine',
      rating: '4,8/5 (143 avis)',
      stats: [
        { value: '18', label: 'Annonces actives' },
        { value: '94', label: 'Ventes conclues' },
        { value: '4,8', label: 'Note globale' },
      ],
    },
  },
  {
    id: 'aminata-sarr',
    name: 'Aminata Sarr',
    role: 'Agent locatif · Dakar',
    country: 'SN',
    countryLabel: 'Sénégal',
    city: 'Dakar',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F4',
    cert: 'KYC validé',
    certIcon: ShieldCheck,
    bio: 'Spécialiste des appartements, résidences et bureaux pour expatriés et jeunes actifs à Dakar et Plateau.',
    transaction: 'location',
    stats: [
      { value: '24', label: 'Annonces' },
      { value: '4,9/5', label: 'Note' },
      { value: '<1h', label: 'Réponse' },
    ],
  },
  {
    id: 'kodjo-mensah',
    name: 'Kodjo Mensah',
    role: 'Terrain & investissement · Lomé',
    country: 'TG',
    countryLabel: 'Togo',
    city: 'Lomé',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F6',
    cert: 'Docs fonciers vérifiés',
    certIcon: ShieldCheck,
    bio: "Expert des terrains titrés et opportunités d'investissement à fort potentiel autour de Lomé.",
    transaction: 'terrain',
    stats: [
      { value: '12', label: 'Annonces' },
      { value: '4,7/5', label: 'Note' },
      { value: '36h', label: 'Délai moyen' },
    ],
  },
  {
    id: 'nadege-ahouanvoebla',
    name: 'Nadège Ahouanvoébla',
    role: 'Résidentiel · Cotonou',
    country: 'BJ',
    countryLabel: 'Bénin',
    city: 'Cotonou',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F1',
    cert: 'Certification 2025',
    certIcon: ShieldCheck,
    bio: 'Conseil patrimonial et accompagnement des familles sur Cotonou et Abomey-Calavi.',
    transaction: 'vente',
    stats: [
      { value: '16', label: 'Annonces' },
      { value: '4,8/5', label: 'Note' },
      { value: '2j', label: 'Visite dispo' },
    ],
  },
  {
    id: 'issouf-traore',
    name: 'Issouf Traoré',
    role: 'Villa & prestige · Abidjan',
    country: 'CI',
    countryLabel: "Côte d'Ivoire",
    city: 'Abidjan',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F7',
    cert: 'Certifié',
    certIcon: BadgeCheck,
    bio: 'Spécialiste des villas prestige à Marcory, Deux Plateaux et Zone 4 à Abidjan.',
    transaction: 'vente',
    stats: [
      { value: '31', label: 'Annonces' },
      { value: '4,6/5', label: 'Note' },
      { value: '3h', label: 'Réponse' },
    ],
  },
  {
    id: 'fatou-diallo',
    name: 'Fatou Diallo',
    role: 'Location longue durée · Dakar',
    country: 'SN',
    countryLabel: 'Sénégal',
    city: 'Dakar',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F3',
    cert: 'Profil vérifié',
    certIcon: ShieldCheck,
    bio: 'Spécialiste des locations longue durée et gestion locative pour résidents et investisseurs.',
    transaction: 'location',
    stats: [
      { value: '19', label: 'Annonces' },
      { value: '4,7/5', label: 'Note' },
      { value: '2h', label: 'Réponse' },
    ],
  },
  {
    id: 'theodore-agossou',
    name: 'Théodore Agossou',
    role: 'Bureau & commercial · Cotonou',
    country: 'BJ',
    countryLabel: 'Bénin',
    city: 'Cotonou',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F3',
    cert: 'Certifié 2025',
    certIcon: BadgeCheck,
    bio: 'Expert en immobilier commercial, bureaux et entrepôts à Cotonou et Porto-Novo.',
    transaction: 'vente',
    stats: [
      { value: '9', label: 'Annonces' },
      { value: '4,5/5', label: 'Note' },
      { value: '24h', label: 'Réponse' },
    ],
  },
  {
    id: 'afi-kossivi',
    name: 'Afi Kossivi',
    role: 'Résidentiel · Lomé',
    country: 'TG',
    countryLabel: 'Togo',
    city: 'Lomé',
    avatar: 'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F5',
    cert: 'KYC validé',
    certIcon: ShieldCheck,
    bio: "Accompagnement familial pour l'acquisition de maisons et villas dans les quartiers résidentiels de Lomé.",
    transaction: 'vente',
    stats: [
      { value: '14', label: 'Annonces' },
      { value: '4,6/5', label: 'Note' },
      { value: '6h', label: 'Réponse' },
    ],
  },
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
  const [country, setCountry] = useState<CountryCode | 'all'>('all');
  const [tab, setTab] = useState<'tous' | Transaction>('tous');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return AGENTS.filter((a) => {
      if (country !== 'all' && a.country !== country) return false;
      if (tab !== 'tous' && a.transaction !== tab) return false;
      if (q && !`${a.name} ${a.role} ${a.bio}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, country, tab]);

  const featured = filtered.find((a) => a.featured);
  const regular = filtered.filter((a) => !a.featured);

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
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
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
                { value: '120+', label: 'Agents certifiés' },
                { value: '4', label: 'Pays couverts' },
                { value: '4,8/5', label: 'Note moyenne' },
                { value: '100%', label: 'KYC validé' },
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
            {AGENTS.slice(0, 5).map((a, i) => (
              <img
                key={a.id}
                src={a.avatar}
                alt={a.name}
                className={cn(
                  'h-[60px] w-[60px] rounded-full border-[3px] border-white/60 object-cover',
                  i > 0 && '-ml-3.5',
                )}
              />
            ))}
            <div className="-ml-3.5 flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-white/60 bg-white/18 text-[13px] font-bold whitespace-nowrap text-white">
              +115
            </div>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un agent…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="h-6 w-px bg-black/[0.08]" />
          <InertRow>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand bg-brand/[0.08] px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap text-brand">
              <Globe2 className="h-3.5 w-3.5" aria-hidden />
              Tous les pays
              <ChevronDown className="h-[13px] w-[13px]" aria-hidden />
            </span>
          </InertRow>
          <InertRow>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.1] px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap text-gray-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Ville
              <ChevronDown className="h-[13px] w-[13px]" aria-hidden />
            </span>
          </InertRow>
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
                onClick={() => setTab(t.key)}
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
            {filtered.length} agent{filtered.length > 1 ? 's' : ''} trouvé
            {filtered.length > 1 ? 's' : ''}
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
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountry(c.code)}
                    className={cn(
                      'flex items-center justify-between gap-2.5 rounded-[10px] px-3 py-2.5 text-left',
                      country === c.code && 'bg-brand/10',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{c.flag}</span>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          country === c.code ? 'font-semibold text-brand' : 'text-neutral-900',
                        )}
                      >
                        {c.label}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs whitespace-nowrap',
                        country === c.code ? 'bg-brand/15 text-brand' : 'bg-gray-100 text-gray-500',
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
                Spécialité
              </p>
              <div className="flex flex-col gap-1.5">
                {SPECIALTIES.map((s) => (
                  <InertRow key={s.label}>
                    <span className="flex items-center justify-between gap-2.5 rounded-[10px] px-3 py-2.5">
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs whitespace-nowrap text-gray-500">
                        {s.count}
                      </span>
                    </span>
                  </InertRow>
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
                  {filtered.length} agent{filtered.length > 1 ? 's' : ''}
                </strong>{' '}
                certifié{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}
              </span>
              <InertRow>
                <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.1] px-3.5 py-2.5 text-[13px] whitespace-nowrap text-neutral-900">
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                  Trier : Mieux notés
                  <ChevronDown className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                </span>
              </InertRow>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.06] bg-gray-50 p-10 text-center text-sm text-gray-500">
                Aucun agent ne correspond à ces critères.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {featured && (
                  <div className="flex flex-col overflow-hidden rounded-[20px] border border-black/[0.06] sm:col-span-2 xl:col-span-3 xl:flex-row">
                    <div
                      className="flex min-h-[240px] w-full flex-shrink-0 flex-col items-center justify-center gap-3.5 px-5 py-6 text-center xl:w-[280px]"
                      style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #E0F2FE 100%)' }}
                    >
                      <div className="mb-2 self-end xl:mb-0 xl:absolute xl:top-3 xl:right-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-[5px] text-[11px] font-bold whitespace-nowrap text-white">
                          <Zap className="h-[11px] w-[11px]" aria-hidden />
                          Agent du mois
                        </span>
                      </div>
                      <img
                        src={featured.avatar}
                        alt={featured.name}
                        className="h-[84px] w-[84px] rounded-full border-[3px] border-white object-cover"
                      />
                      <div className="text-[17px] font-bold">{featured.name}</div>
                      <div className="text-[13px] text-gray-500">{featured.role}</div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-[5px] text-xs font-bold text-brand">
                        <featured.certIcon className="h-3 w-3" aria-hidden />
                        {featured.cert}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col items-start gap-6 p-7 xl:flex-row xl:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="font-sora mb-1.5 text-[22px] font-extrabold tracking-[-0.03em]">
                          {featured.name}
                        </p>
                        <p className="mb-3.5 text-sm text-gray-500">
                          {featured.role} · {featured.countryLabel}{' '}
                          {COUNTRIES.find((c) => c.code === featured.country)?.flag}
                        </p>
                        <p className="mb-4 max-w-[480px] text-sm leading-relaxed">
                          &quot;{featured.featured?.quote}&quot;
                        </p>
                        <div className="flex flex-wrap items-center gap-5 text-[13px] text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-[13px] w-[13px] text-brand" aria-hidden />
                            {featured.featured?.responseTime}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                            {featured.featured?.availability}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Star className="h-[13px] w-[13px] text-amber-500" aria-hidden />
                            {featured.featured?.rating}
                          </span>
                        </div>
                      </div>
                      <div className="grid flex-shrink-0 grid-cols-3 gap-3">
                        {featured.featured?.stats.map((s) => (
                          <div key={s.label} className="flex flex-col items-center text-center">
                            <strong className="font-sora text-[28px] font-extrabold tracking-[-0.04em] text-brand">
                              {s.value}
                            </strong>
                            <span className="text-[11px] whitespace-nowrap text-gray-500">
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex w-full flex-shrink-0 flex-col gap-2 xl:w-[140px]">
                        <InertRow>
                          <span className="flex items-center justify-center gap-2 rounded-[10px] bg-brand px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap text-white">
                            <Phone className="h-3.5 w-3.5" aria-hidden />
                            Contacter
                          </span>
                        </InertRow>
                        <InertRow>
                          <span className="flex items-center justify-center gap-2 rounded-[10px] bg-gray-100 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap text-neutral-900">
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            Voir le profil
                          </span>
                        </InertRow>
                      </div>
                    </div>
                  </div>
                )}

                {regular.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col overflow-hidden rounded-[20px] border border-black/[0.06]"
                  >
                    <div
                      className="flex flex-col items-center gap-1 px-5 pt-6 pb-4 text-center"
                      style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #E0F2FE 100%)' }}
                    >
                      <img
                        src={a.avatar}
                        alt={a.name}
                        className="mb-3.5 h-[72px] w-[72px] rounded-full border-[3px] border-white object-cover"
                      />
                      <div className="text-[17px] font-bold">{a.name}</div>
                      <div className="mb-2.5 text-[13px] text-gray-500">{a.role}</div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-[5px] text-xs font-bold text-brand">
                        <a.certIcon className="h-3 w-3" aria-hidden />
                        {a.cert}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3.5 p-5">
                      <div className="grid grid-cols-3 gap-2">
                        {a.stats.map((s) => (
                          <div
                            key={s.label}
                            className="rounded-[10px] bg-gray-50 px-2 py-2.5 text-center"
                          >
                            <strong className="block text-[16px] font-extrabold tracking-[-0.03em]">
                              {s.value}
                            </strong>
                            <span className="block truncate text-[11px] whitespace-nowrap text-gray-500">
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[13px] leading-relaxed">{a.bio}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <InertRow>
                          <span className="flex items-center justify-center gap-1.5 rounded-[10px] bg-gray-100 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap">
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            Profil
                          </span>
                        </InertRow>
                        <InertRow>
                          <span className="flex items-center justify-center gap-1.5 rounded-[10px] bg-brand px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap text-white">
                            <Phone className="h-3.5 w-3.5" aria-hidden />
                            Contacter
                          </span>
                        </InertRow>
                      </div>
                      <span className="text-[13px] whitespace-nowrap text-gray-500">
                        {COUNTRIES.find((c) => c.code === a.country)?.flag} {a.countryLabel} ·{' '}
                        {a.city}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            <div className="flex items-center justify-center gap-1.5">
              <InertRow>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.1] text-gray-400">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </span>
              </InertRow>
              {[1, 2, 3].map((n) => (
                <InertRow key={n}>
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium',
                      n === 1
                        ? 'border-brand bg-brand text-white'
                        : 'border-black/[0.1] text-neutral-900',
                    )}
                  >
                    {n}
                  </span>
                </InertRow>
              ))}
              <span className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">
                …
              </span>
              <InertRow>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.1] text-sm font-medium">
                  13
                </span>
              </InertRow>
              <InertRow>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.1] text-gray-400">
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </span>
              </InertRow>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
