'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  ChevronDown,
  Globe2,
  Building2,
  Globe,
  BadgeCheck,
  ArrowRight,
  ShieldCheck,
  CalendarCheck2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

type ListingCategory = 'maisons' | 'appartements' | 'terrains';
type Transaction = 'vente' | 'location';

interface Listing {
  id: string;
  imageUrl: string;
  title: string;
  location: string;
  features: string[];
  price: string;
  priceUnit: string;
  badges: { label: string; variant: 'light' | 'dark' | 'amber' }[];
  category: ListingCategory;
  transaction: Transaction;
}

const LISTINGS: Listing[] = [
  {
    id: 'l1',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/24f1e71c-0e9a-4c65-b85a-2e80421b5a2d.jpg',
    title: 'Villa duplex standing haut de gamme',
    location: 'Abidjan, Cocody Riviera',
    features: ['5 ch.', '4 sdb', '320 m²'],
    price: '185 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'À vendre', variant: 'light' },
      { label: 'Vente', variant: 'dark' },
    ],
    category: 'maisons',
    transaction: 'vente',
  },
  {
    id: 'l2',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/c8a876cf-772d-49fd-8059-2d5df2839ecf.jpg',
    title: 'Appartement neuf vue mer',
    location: 'Dakar, Plateau',
    features: ['3 ch.', '2 sdb', '150 m²'],
    price: '750 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'Vérifié', variant: 'light' },
      { label: 'Location', variant: 'dark' },
    ],
    category: 'appartements',
    transaction: 'location',
  },
  {
    id: 'l3',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/ad134f4f-d400-4653-9cc2-eeb2135c335e.jpg',
    title: 'Maison R+1 avec jardin',
    location: 'Cotonou, Cadjehoun',
    features: ['3 ch.', '3 sdb', '210 m²'],
    price: '72 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'Exclusif', variant: 'amber' },
      { label: 'Neuf', variant: 'dark' },
    ],
    category: 'maisons',
    transaction: 'vente',
  },
  {
    id: 'l4',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/2c6fadc7-9f9f-4fbd-a83d-2bc1481ad9f3.jpg',
    title: 'Terrain constructible viabilisé',
    location: 'Calavi, Bénin',
    features: ['800 m²', 'Titré', 'Plat'],
    price: '24 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'Viabilisé', variant: 'light' },
      { label: 'Terrain', variant: 'dark' },
    ],
    category: 'terrains',
    transaction: 'vente',
  },
  {
    id: 'l5',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/0c6b3885-ddbb-40ea-a2a2-cd58c15b27b2.jpg',
    title: 'Studio meublé résidence sécurisée',
    location: 'Abomey-Calavi, Bénin',
    features: ['1 ch.', '1 sdb', '45 m²'],
    price: '180 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'Sécurisé', variant: 'light' },
      { label: 'Location', variant: 'dark' },
    ],
    category: 'appartements',
    transaction: 'location',
  },
  {
    id: 'l6',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/bab59132-dafe-43c7-a35e-7e9b5ed022c3.jpg',
    title: 'Villa basse sécurisée avec piscine',
    location: 'Cotonou, Haie Vive',
    features: ['5 ch.', '5 sdb', '450 m²'],
    price: '320 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'Coup de cœur', variant: 'light' },
      { label: 'Vente', variant: 'dark' },
    ],
    category: 'maisons',
    transaction: 'vente',
  },
];

type ListingFilter = 'toutes' | ListingCategory | 'location';

const LISTING_FILTERS: { id: ListingFilter; label: string }[] = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'maisons', label: 'Maisons' },
  { id: 'appartements', label: 'Appartements' },
  { id: 'terrains', label: 'Terrains' },
  { id: 'location', label: 'Location' },
];

interface Country {
  id: string;
  flag: string;
  name: string;
  cities: string;
  imageUrl: string;
  copy: string;
  stats: [string, string][];
}

const COUNTRIES: Country[] = [
  {
    id: 'benin',
    flag: '🇧🇯',
    name: 'Bénin',
    cities: 'Cotonou · Abomey-Calavi · Porto-Novo',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/c8389639-8363-4a79-9c55-cea7463cdb76.jpg',
    copy: 'Un marché dynamique porté par les villas familiales, résidences sécurisées et terrains à fort potentiel autour de Cotonou.',
    stats: [
      ['530+', 'Annonces actives'],
      ['Dès 18M', "Budget d'entrée"],
    ],
  },
  {
    id: 'togo',
    flag: '🇹🇬',
    name: 'Togo',
    cities: 'Lomé · Agoè-Nyivé · Kpalimé',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/7ebb9db1-34d5-45ed-91db-d424a2312f78.jpg',
    copy: 'Une offre concentrée autour de Lomé, idéale pour les terrains, immeubles de rapport et projets résidentiels bien situés.',
    stats: [
      ['185+', 'Biens premium'],
      ['Dès 28M', 'Biens à vendre'],
    ],
  },
  {
    id: 'ci',
    flag: '🇨🇮',
    name: "Côte d'Ivoire",
    cities: 'Abidjan · Yamoussoukro · Grand-Bassam',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/bb426b40-a88a-45e0-a37c-0021748f695c.jpg',
    copy: 'Le marché le plus actif de la plateforme, dominé par Abidjan et une forte demande sur les villas haut de gamme.',
    stats: [
      ['540+', 'Annonces actives'],
      ['Dès 80M', 'Villas premium'],
    ],
  },
  {
    id: 'senegal',
    flag: '🇸🇳',
    name: 'Sénégal',
    cities: 'Dakar · Saly · Thiès',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/7c7bae4b-fef7-4187-9493-0e89947ae7bc.jpg',
    copy: 'Un marché recherché pour la location longue durée, les résidences modernes et les investissements sécurisés.',
    stats: [
      ['275+', 'Annonces actives'],
      ['Dès 750K', 'Location mensuelle'],
    ],
  },
];

interface AgentCard {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  cert: string;
  stats: [string, string][];
  bio: string;
  country: string;
}

const AGENT_CARDS: AgentCard[] = [
  {
    id: 'aminata',
    name: 'Aminata Sarr',
    role: 'Agent locatif · Dakar',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F4',
    cert: 'Profil vérifié · KYC validé',
    stats: [
      ['24', 'Annonces'],
      ['4,9/5', 'Note'],
      ['1h', 'Réponse max'],
    ],
    bio: 'Spécialiste des appartements, résidences et bureaux pour expatriés et jeunes actifs.',
    country: '🇸🇳 Sénégal',
  },
  {
    id: 'kodjo',
    name: 'Kodjo Mensah',
    role: 'Terrain & investissement · Lomé',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F6',
    cert: 'Documents fonciers vérifiés',
    stats: [
      ['12', 'Annonces'],
      ['4,7/5', 'Note'],
      ['36h', 'Délai moyen'],
    ],
    bio: "Expert des terrains titrés et opportunités d'investissement à fort potentiel.",
    country: '🇹🇬 Togo',
  },
  {
    id: 'nadege',
    name: 'Nadège Ahouanvoébla',
    role: 'Résidentiel · Cotonou',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F1',
    cert: 'Certification active 2025',
    stats: [
      ['16', 'Annonces'],
      ['4,8/5', 'Note'],
      ['2j', 'Disponibilité visite'],
    ],
    bio: 'Conseil patrimonial et accompagnement des familles sur Cotonou et Abomey-Calavi.',
    country: '🇧🇯 Bénin',
  },
];

const HOW_IT_WORKS = [
  {
    icon: Search,
    number: '01',
    title: 'Cherchez un bien',
    text: 'Parcourez des villas, appartements, terrains et bureaux selon votre ville, votre budget et vos critères.',
  },
  {
    icon: CalendarCheck2,
    number: '02',
    title: "Contactez l'agent",
    text: 'Échangez directement avec un agent vérifié et planifiez une visite avec un accompagnement local.',
  },
  {
    icon: ShieldCheck,
    number: '03',
    title: 'Concluez en confiance',
    text: 'Tous les documents essentiels sont vérifiés pour vous aider à avancer plus sereinement.',
  },
];

function InertLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span title="Bientôt disponible" className={cn('cursor-not-allowed select-none', className)}>
      {children}
    </span>
  );
}

export default function LandingPage() {
  const [filter, setFilter] = useState<ListingFilter>('toutes');

  const filteredListings = LISTINGS.filter((l) => {
    if (filter === 'toutes') return true;
    if (filter === 'location') return l.transaction === 'location';
    return l.category === filter;
  });

  return (
    <div className="bg-white text-neutral-900">
      <PublicNavbar active="accueil" />

      {/* HERO */}
      <section className="px-4 pt-4 pb-14 lg:px-7 lg:pt-[18px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="relative min-h-[420px] overflow-hidden rounded-[28px] lg:min-h-[520px]">
            <img
              src="https://storage.googleapis.com/banani-generated-images/generated-images/86caad36-d7d3-4c45-974f-554d1e16d0d1.jpg"
              alt="Villa premium en Afrique de l'Ouest"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(15,23,42,0.34) 0%, rgba(15,23,42,0.18) 45%, rgba(15,23,42,0.28) 100%)',
              }}
            />
            <div className="relative z-[2] mx-auto max-w-[840px] px-6 pt-10 pb-[100px] text-center text-white lg:pb-[134px]">
              <p className="mb-4 text-[11px] tracking-[0.34em] text-white/82 uppercase">
                Votre nouveau chez-vous en Afrique de l&apos;Ouest
              </p>
              <h1 className="mb-4 font-sora text-[36px] leading-[1.06] font-extrabold tracking-[-0.05em] lg:text-[60px]">
                Trouvez le bien <span className="text-brand italic">idéal</span> qui vous ressemble
              </h1>
              <p className="mx-auto max-w-[620px] text-[15px] text-white/88 lg:text-[16px]">
                Des opportunités immobilières au Bénin, Togo, Côte d&apos;Ivoire et Sénégal,
                publiées par des agents indépendants et certifiés.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                {[
                  ['🇧🇯', 'Bénin'],
                  ['🇹🇬', 'Togo'],
                  ['🇨🇮', "Côte d'Ivoire"],
                  ['🇸🇳', 'Sénégal'],
                ].map(([flag, name]) => (
                  <InertLink
                    key={name}
                    className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-2.5 text-[13px] font-semibold text-white backdrop-blur-sm"
                  >
                    <span>{flag}</span>
                    {name}
                  </InertLink>
                ))}
              </div>
            </div>

            {/* Search panel */}
            <div className="absolute bottom-[14px] left-1/2 z-[3] hidden w-[calc(100%-40px)] max-w-[1060px] -translate-x-1/2 grid-cols-[1.05fr_1.2fr_1fr_1fr_auto] items-center gap-2.5 rounded-full bg-white p-3 shadow-[0_20px_40px_rgba(15,23,42,0.12)] lg:grid">
              <InertLink className="flex items-center gap-2.5 rounded-full bg-brand/[0.08] px-4 py-3">
                <Globe2 className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden />
                <span className="flex min-w-0 flex-col text-left">
                  <span className="text-[10px] font-semibold text-brand uppercase">Pays</span>
                  <span className="truncate text-[13px] font-semibold text-neutral-900">
                    Bénin, Togo, Côte d&apos;Ivoire…
                  </span>
                </span>
              </InertLink>
              <InertLink className="flex items-center gap-2.5 rounded-full bg-gray-50 px-4 py-3">
                <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
                <span className="flex min-w-0 flex-col text-left">
                  <span className="text-[10px] text-gray-400 uppercase">Ville / Quartier</span>
                  <span className="truncate text-[13px] font-medium text-neutral-900">
                    Ex: Cocody, Plateau…
                  </span>
                </span>
              </InertLink>
              <InertLink className="flex items-center justify-between gap-2 rounded-full bg-gray-50 px-4 py-3">
                <span className="flex min-w-0 flex-col text-left">
                  <span className="text-[10px] text-gray-400 uppercase">Type de bien</span>
                  <span className="truncate text-[13px] font-medium text-neutral-900">
                    Maison, Appartement…
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden />
              </InertLink>
              <InertLink className="flex items-center justify-between gap-2 rounded-full bg-gray-50 px-4 py-3">
                <span className="flex min-w-0 flex-col text-left">
                  <span className="text-[10px] text-gray-400 uppercase">Transaction</span>
                  <span className="truncate text-[13px] font-medium text-neutral-900">
                    Vente ou Location
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden />
              </InertLink>
              <InertLink className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand/40 px-[22px] text-sm font-semibold text-white">
                <Search className="h-4 w-4" aria-hidden />
                Rechercher
              </InertLink>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="px-4 pb-7 lg:px-7">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid grid-cols-1 gap-2 rounded-[20px] bg-brand px-6 py-[34px] text-white sm:grid-cols-3">
            {[
              {
                icon: Building2,
                value: '2 400+',
                label: 'Annonces actives',
                sub: 'Mises à jour en temps réel',
              },
              {
                icon: Globe,
                value: '4',
                label: 'Pays couverts',
                sub: "Bénin, Togo, Côte d'Ivoire, Sénégal",
              },
              {
                icon: BadgeCheck,
                value: '100%',
                label: 'Documents vérifiés',
                sub: 'Pour les agents partenaires',
              },
            ].map((s) => (
              <div key={s.label} className="px-4 py-2 text-center">
                <div className="mx-auto mb-[18px] flex h-9 w-9 items-center justify-center rounded-full bg-white/12">
                  <s.icon className="h-[18px] w-[18px]" aria-hidden />
                </div>
                <p className="font-sora mb-1.5 text-[36px] leading-none font-extrabold tracking-[-0.04em] lg:text-[46px]">
                  {s.value}
                </p>
                <p className="mb-1 text-[18px] font-semibold">{s.label}</p>
                <p className="text-xs text-white/72">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREMIUM LISTINGS */}
      <section className="px-4 py-9 lg:px-7">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-7 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-2.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Sélection premium
              </p>
              <h2 className="font-sora text-[28px] font-extrabold tracking-[-0.04em] lg:text-[44px]">
                Annonces à la <span className="text-brand italic">une</span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {LISTING_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-[13px] font-medium whitespace-nowrap',
                    filter === f.id
                      ? 'border-brand bg-brand text-white'
                      : 'border-black/[0.08] text-gray-500',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="overflow-hidden rounded-[20px] border border-black/[0.06]"
              >
                <div className="relative h-[220px] bg-gray-100 lg:h-[240px]">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3.5 right-3.5 left-3.5 flex items-center justify-between gap-2">
                    {listing.badges.map((b) => (
                      <span
                        key={b.label}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white',
                          b.variant === 'light' && 'bg-emerald-500',
                          b.variant === 'dark' && 'bg-black/78',
                          b.variant === 'amber' && 'bg-amber-500',
                        )}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-[18px]">
                  <p className="mb-2 text-[17px] leading-snug font-bold lg:text-[19px]">
                    {listing.title}
                  </p>
                  <p className="mb-2 flex items-center gap-1.5 text-[13px] text-gray-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                    {listing.location}
                  </p>
                  <div className="mb-3.5 flex flex-wrap items-center gap-4 text-[13px] text-gray-500">
                    {listing.features.map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-sora text-[24px] font-extrabold tracking-[-0.03em] text-brand lg:text-[28px]">
                      {listing.price}{' '}
                      <span className="text-[13px] font-semibold text-gray-500">
                        {listing.priceUnit}
                      </span>
                    </p>
                    <Link
                      href={`/annonces/${listing.id}`}
                      className="text-[13px] font-semibold text-brand"
                    >
                      Voir →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex justify-center">
            <Link
              href="/annonces"
              className="rounded-full border border-black/[0.08] px-[22px] py-3 text-sm font-semibold text-brand"
            >
              Voir toutes les annonces
            </Link>
          </div>
        </div>
      </section>

      {/* DESTINATIONS BY COUNTRY */}
      <section
        className="px-4 py-[64px] lg:px-7 lg:py-[88px]"
        style={{ background: 'linear-gradient(180deg, #F3F4F6 0%, #FFFFFF 100%)' }}
      >
        <div className="mx-auto max-w-[1280px]">
          <div className="mx-auto mb-9 max-w-[760px] text-center">
            <p className="mb-2.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Par destination
            </p>
            <h2 className="font-sora mb-2.5 text-[28px] font-extrabold tracking-[-0.04em] lg:text-[44px]">
              Rechercher par <span className="text-brand italic">pays</span>
            </h2>
            <p className="text-[15px] text-gray-500">
              Explorez les quatre marchés clés d&apos;Habitat-Afrik avec une présentation plus
              claire, plus éditoriale et centrée sur l&apos;essentiel : zones actives, volumes
              d&apos;annonces et budgets repères.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COUNTRIES.map((c) => (
              <div
                key={c.id}
                className="flex min-h-[332px] flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white"
              >
                <div className="relative h-[176px] bg-gray-100">
                  <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.42) 100%)',
                    }}
                  />
                  <span className="absolute top-3.5 left-3.5 inline-flex h-7 min-w-[42px] items-center justify-center rounded-full bg-white/94 px-2.5 text-[13px] font-semibold">
                    {c.flag}
                  </span>
                  <div className="absolute right-4 bottom-4 left-4 text-white">
                    <p className="font-sora text-[24px] leading-tight font-extrabold tracking-[-0.03em]">
                      {c.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-white/82">{c.cities}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3.5 p-[18px]">
                  <p className="text-sm leading-relaxed">{c.copy}</p>
                  <div className="mt-auto grid grid-cols-2 gap-2.5">
                    {c.stats.map(([val, label]) => (
                      <div key={label} className="rounded-2xl bg-gray-50 p-3">
                        <p className="mb-1 text-[16px] font-bold whitespace-nowrap">{val}</p>
                        <p className="truncate text-[11px] text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/annonces"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand"
                  >
                    Explorer le {c.name} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section className="px-4 py-9 lg:px-7">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-7 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-2.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Confiance &amp; expertise
              </p>
              <h2 className="font-sora mb-2.5 text-[28px] font-extrabold tracking-[-0.04em] lg:text-[44px]">
                Nos agents <span className="text-brand italic">certifiés</span>
              </h2>
              <p className="max-w-[560px] text-[15px] text-gray-500">
                Une sélection de professionnels vérifiés, choisis pour leur fiabilité, leur
                réactivité et leur parfaite connaissance du marché local.
              </p>
            </div>
            <Link
              href="/agents"
              className="rounded-full border border-black/[0.08] px-[22px] py-3 text-sm font-semibold whitespace-nowrap text-brand"
            >
              Découvrir tous les agents
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.9fr]">
            <div className="relative min-h-[340px] overflow-hidden rounded-[24px] border border-black/[0.06] lg:min-h-[520px]">
              <img
                src="https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F2"
                alt="Kofi Atta"
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(15,23,42,0.06) 0%, rgba(15,23,42,0.26) 42%, rgba(15,23,42,0.76) 100%)',
                }}
              />
              <span className="absolute top-[22px] left-[22px] inline-flex items-center gap-2 rounded-full bg-white/92 px-3.5 py-2 text-xs font-bold text-brand">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Certifié Habitat-Afrik
              </span>
              <div className="absolute right-[26px] bottom-[26px] left-[26px] text-white">
                <p className="mb-2.5 text-[11px] tracking-[0.16em] text-white/74 uppercase">
                  Agent en avant
                </p>
                <p className="font-sora mb-2 text-[28px] leading-tight font-extrabold tracking-[-0.04em] lg:text-[34px]">
                  Kofi Atta
                </p>
                <p className="mb-3.5 text-[15px] text-white/86">
                  Consultant premium · Abidjan, Côte d&apos;Ivoire
                </p>
                <p className="mb-4 max-w-[560px] text-[16px] leading-relaxed text-white/94">
                  « Accompagnement complet pour les villas familiales, biens de prestige et
                  transactions sécurisées à Cocody et Marcory. »
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {['18 annonces actives', '4,8/5 de satisfaction', 'Répond en 12 min'].map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white/14 px-3 py-2 text-xs font-semibold whitespace-nowrap"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[18px]">
              {AGENT_CARDS.map((a) => (
                <div key={a.id} className="rounded-[20px] border border-black/[0.06] p-[22px]">
                  <div className="mb-3.5 flex items-center gap-3.5">
                    <img
                      src={a.avatarUrl}
                      alt={a.name}
                      className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[18px] font-bold">{a.name}</p>
                      <p className="truncate text-[13px] text-gray-500">{a.role}</p>
                    </div>
                  </div>
                  <span className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2 text-xs font-bold whitespace-nowrap">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden />
                    {a.cert}
                  </span>
                  <div className="mb-3.5 grid grid-cols-3 gap-2.5">
                    {a.stats.map(([val, label]) => (
                      <div key={label} className="rounded-2xl bg-gray-50 p-2.5 text-center">
                        <p className="mb-1 text-[16px] font-extrabold">{val}</p>
                        <p className="truncate text-[11px] text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mb-3.5 text-sm leading-relaxed">{a.bio}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/agents" className="text-sm font-semibold text-brand">
                      Voir le profil →
                    </Link>
                    <span className="text-[13px] whitespace-nowrap text-gray-500">{a.country}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-[64px] lg:px-7 lg:py-[82px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="mx-auto mb-9 max-w-[640px] text-center">
            <p className="mb-2.5 text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Simple et sécurisé
            </p>
            <h2 className="font-sora mb-2.5 text-[28px] font-extrabold tracking-[-0.04em] lg:text-[44px]">
              Comment ça <span className="text-brand italic">marche</span>
            </h2>
            <p className="text-[15px] text-gray-500">
              Trouver votre prochain bien en Afrique de l&apos;Ouest n&apos;a jamais été aussi
              simple.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-7 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.number} className="px-4 text-center">
                <div className="mx-auto mb-5 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-brand/[0.08]">
                  <step.icon className="h-6 w-6 text-brand" aria-hidden />
                </div>
                <p className="mb-2.5 text-xs tracking-[0.14em] text-gray-400 uppercase">
                  {step.number}
                </p>
                <p className="mb-2.5 text-[22px] font-bold lg:text-[24px]">{step.title}</p>
                <p className="mx-auto max-w-[320px] text-sm text-gray-500">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pt-5 pb-[64px] lg:px-7 lg:pb-[76px]">
        <div className="mx-auto max-w-[1280px]">
          <div
            className="relative overflow-hidden rounded-[24px] px-7 py-[48px] text-white lg:px-16 lg:py-[60px]"
            style={{ background: 'linear-gradient(135deg, #376BFF 0%, #3B82F6 100%)' }}
          >
            <div
              className="absolute -top-10 -right-10 h-[260px] w-[260px] rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <div className="relative z-[1] max-w-[660px]">
              <p className="mb-3.5 text-xs tracking-[0.18em] text-white/74 uppercase">
                Rejoignez la plateforme
              </p>
              <p className="font-sora mb-4 text-[32px] leading-tight font-extrabold tracking-[-0.05em] lg:text-[52px]">
                Des milliers de biens vous attendent
              </p>
              <p className="mb-6 max-w-[560px] text-[16px] text-white/88">
                Acheter, louer ou trouver un agent immobilier — HABITAT-AFRIK est la plateforme de
                référence en Afrique de l&apos;Ouest.
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  href="/annonces"
                  className="rounded-full bg-white px-[22px] py-3 text-sm font-bold text-brand"
                >
                  Explorer les annonces
                </Link>
                <InertLink className="text-sm font-semibold text-white">
                  Publier une annonce
                </InertLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
