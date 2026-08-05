'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Check,
  BedDouble,
  Bath,
  Move,
  FileCheck,
  AlignCenter,
  Layers,
  Car,
  Zap,
  BadgeCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Waves,
  Eye,
  TreePine,
  Wifi,
  Heart,
  Phone,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

type ListingCategory = 'maisons' | 'appartements' | 'terrains' | 'bureaux';
type Transaction = 'vente' | 'location';

interface Listing {
  id: string;
  imageUrl: string;
  title: string;
  location: string;
  country: string;
  agentName: string;
  agentAvatarUrl: string;
  features: { icon: typeof BedDouble; label: string }[];
  price: string;
  priceUnit: string;
  badges: { label: string; className: string }[];
  category: ListingCategory;
  transaction: Transaction;
  photoCount: number;
  publishedDate: string;
}

const LISTINGS: Listing[] = [
  {
    id: 'a1',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/1010fb4d-c6ee-4a2a-b352-12f26afac7d4.jpg',
    title: 'Villa duplex standing haut de gamme',
    location: 'Abidjan, Cocody Riviera',
    country: '🇨🇮',
    agentName: 'Kofi Atta',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F2',
    features: [
      { icon: BedDouble, label: '5 ch.' },
      { icon: Bath, label: '4 sdb' },
      { icon: Move, label: '320 m²' },
      { icon: Car, label: 'Garage' },
      { icon: Waves, label: 'Piscine' },
    ],
    price: '185 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'À vendre', className: 'bg-emerald-500' },
      { label: 'Villa', className: 'bg-black/78' },
    ],
    category: 'maisons',
    transaction: 'vente',
    photoCount: 8,
    publishedDate: '12 jan. 2025',
  },
  {
    id: 'a2',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/c8a876cf-772d-49fd-8059-2d5df2839ecf.jpg',
    title: 'Appartement neuf vue mer, Plateau',
    location: 'Dakar, Plateau',
    country: '🇸🇳',
    agentName: 'Aminata Diallo',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F4',
    features: [
      { icon: BedDouble, label: '3 ch.' },
      { icon: Bath, label: '2 sdb' },
      { icon: Move, label: '150 m²' },
      { icon: Eye, label: 'Vue mer' },
    ],
    price: '750 000',
    priceUnit: 'FCFA/mois',
    badges: [
      { label: 'Location', className: 'bg-sky-500' },
      { label: 'Appt.', className: 'bg-black/78' },
    ],
    category: 'appartements',
    transaction: 'location',
    photoCount: 6,
    publishedDate: '8 jan. 2025',
  },
  {
    id: 'a3',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/ad134f4f-d400-4653-9cc2-eeb2135c335e.jpg',
    title: 'Maison R+1 avec jardin, Cadjehoun',
    location: 'Cotonou, Cadjehoun',
    country: '🇧🇯',
    agentName: 'Edgard Houédanou',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F6',
    features: [
      { icon: BedDouble, label: '4 ch.' },
      { icon: Bath, label: '3 sdb' },
      { icon: Move, label: '210 m²' },
      { icon: TreePine, label: 'Jardin' },
    ],
    price: '72 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'Exclusif', className: 'bg-amber-500' },
      { label: 'Maison', className: 'bg-black/78' },
    ],
    category: 'maisons',
    transaction: 'vente',
    photoCount: 12,
    publishedDate: '3 jan. 2025',
  },
  {
    id: 'a4',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/2c6fadc7-9f9f-4fbd-a83d-2bc1481ad9f3.jpg',
    title: 'Terrain constructible viabilisé, Calavi',
    location: 'Abomey-Calavi',
    country: '🇧🇯',
    agentName: 'Ibrahim Sow',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F3',
    features: [
      { icon: Move, label: '800 m²' },
      { icon: FileCheck, label: 'Titré' },
      { icon: AlignCenter, label: 'Terrain plat' },
      { icon: Zap, label: 'Électricité' },
    ],
    price: '24 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'Viabilisé', className: 'bg-emerald-500' },
      { label: 'Terrain', className: 'bg-black/78' },
    ],
    category: 'terrains',
    transaction: 'vente',
    photoCount: 4,
    publishedDate: '28 déc. 2024',
  },
  {
    id: 'a5',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/0c6b3885-ddbb-40ea-a2a2-cd58c15b27b2.jpg',
    title: 'Studio meublé résidence sécurisée',
    location: 'Abomey-Calavi',
    country: '🇧🇯',
    agentName: 'Sandra Agossou',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F1',
    features: [
      { icon: BedDouble, label: '1 ch.' },
      { icon: Bath, label: '1 sdb' },
      { icon: Move, label: '45 m²' },
    ],
    price: '180 000',
    priceUnit: 'FCFA/mois',
    badges: [
      { label: 'Location', className: 'bg-sky-500' },
      { label: 'Studio', className: 'bg-black/78' },
    ],
    category: 'appartements',
    transaction: 'location',
    photoCount: 5,
    publishedDate: '10 jan. 2025',
  },
  {
    id: 'a6',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/bab59132-dafe-43c7-a35e-7e9b5ed022c3.jpg',
    title: 'Villa basse sécurisée avec piscine',
    location: 'Cotonou, Haie Vive',
    country: '🇧🇯',
    agentName: 'Marcel Dossou',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F7',
    features: [
      { icon: BedDouble, label: '5 ch.' },
      { icon: Bath, label: '5 sdb' },
      { icon: Move, label: '450 m²' },
      { icon: Waves, label: 'Piscine' },
    ],
    price: '320 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'Coup de cœur', className: 'bg-emerald-500' },
      { label: 'Villa', className: 'bg-black/78' },
    ],
    category: 'maisons',
    transaction: 'vente',
    photoCount: 15,
    publishedDate: '20 jan. 2025',
  },
  {
    id: 'a7',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/b73fc471-4379-4498-bc26-560958e324ef.jpg',
    title: 'Bureau moderne centre affaires Lomé',
    location: 'Lomé, Centre',
    country: '🇹🇬',
    agentName: 'Akossiwa Mensah',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F2',
    features: [
      { icon: Move, label: '180 m²' },
      { icon: Layers, label: '3ème étage' },
      { icon: Car, label: 'Parking' },
      { icon: Wifi, label: 'Fibre' },
    ],
    price: '48 000 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'À vendre', className: 'bg-emerald-500' },
      { label: 'Bureau', className: 'bg-black/78' },
    ],
    category: 'bureaux',
    transaction: 'vente',
    photoCount: 9,
    publishedDate: '15 jan. 2025',
  },
  {
    id: 'a8',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/5d0ef23f-403c-4c23-a711-5c50dc370128.jpg',
    title: 'Appartement F3 résidence fermée',
    location: 'Abidjan, Yopougon',
    country: '🇨🇮',
    agentName: 'Yves Kouadio',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F5',
    features: [
      { icon: BedDouble, label: '3 ch.' },
      { icon: Bath, label: '2 sdb' },
      { icon: Move, label: '110 m²' },
    ],
    price: '420 000',
    priceUnit: 'FCFA/mois',
    badges: [
      { label: 'Location', className: 'bg-sky-500' },
      { label: 'Appt.', className: 'bg-black/78' },
    ],
    category: 'appartements',
    transaction: 'location',
    photoCount: 7,
    publishedDate: '6 jan. 2025',
  },
  {
    id: 'a9',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/aa8e44ad-ea08-4323-ab24-cbf704ba4634.jpg',
    title: 'Grand terrain titré en zone urbaine',
    location: 'Dakar, Parcelles',
    country: '🇸🇳',
    agentName: 'Moussa Ndiaye',
    agentAvatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F9',
    features: [
      { icon: Move, label: '1 200 m²' },
      { icon: FileCheck, label: 'Titré' },
      { icon: Zap, label: 'Viabilisé' },
    ],
    price: '38 500 000',
    priceUnit: 'FCFA',
    badges: [
      { label: 'À vendre', className: 'bg-emerald-500' },
      { label: 'Terrain', className: 'bg-black/78' },
    ],
    category: 'terrains',
    transaction: 'vente',
    photoCount: 6,
    publishedDate: '1 jan. 2025',
  },
];

type TypeTab = 'toutes' | ListingCategory | 'location';

const TYPE_TABS: { id: TypeTab; label: string; count: number }[] = [
  { id: 'toutes', label: 'Toutes', count: 128 },
  { id: 'maisons', label: 'Maisons', count: 34 },
  { id: 'appartements', label: 'Appartements', count: 52 },
  { id: 'terrains', label: 'Terrains', count: 19 },
  { id: 'bureaux', label: 'Bureaux', count: 12 },
  { id: 'location', label: 'Location', count: 52 },
];

const PROPERTY_TYPE_FILTERS = [
  { label: 'Villa', count: 34 },
  { label: 'Appartement', count: 52 },
  { label: 'Terrain', count: 19 },
  { label: 'Bureau / Local', count: 12 },
  { label: 'Studio', count: 11 },
];

const COUNTRY_FILTERS = [
  { label: '🇧🇯 Bénin', count: 41 },
  { label: '🇹🇬 Togo', count: 28 },
  { label: "🇨🇮 Côte d'Ivoire", count: 35 },
  { label: '🇸🇳 Sénégal', count: 24 },
];

const SURFACE_FILTERS = ['50 m² +', '100 m² +', '200 m² +', '500 m² +'];

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
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [tab, setTab] = useState<TypeTab>('toutes');

  const filtered = LISTINGS.filter((l) => {
    if (tab === 'toutes') return true;
    if (tab === 'location') return l.transaction === 'location';
    return l.category === tab;
  });

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
                <span className="font-semibold text-brand">128 annonces</span> trouvées · Bénin,
                Togo, Côte d&apos;Ivoire, Sénégal
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
            <InertPill>
              Toutes les villes
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </InertPill>
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
              <span
                title="Bientôt disponible"
                className="cursor-not-allowed text-xs font-medium text-brand select-none"
              >
                Réinitialiser
              </span>
            </div>

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Type de bien
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-brand">
                    <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                  </span>
                  Tous les types
                </div>
                {PROPERTY_TYPE_FILTERS.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-2.5 text-[13px] text-gray-600"
                  >
                    <span className="h-4 w-4 flex-shrink-0 rounded border border-black/[0.15]" />
                    <span className="flex-1">{f.label}</span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      {f.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Transaction
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-brand">
                    <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                  </span>
                  Vente &amp; Location
                </div>
                {[
                  ['Vente', 76],
                  ['Location', 52],
                ].map(([label, count]) => (
                  <div key={label} className="flex items-center gap-2.5 text-[13px] text-gray-600">
                    <span className="h-4 w-4 flex-shrink-0 rounded border border-black/[0.15]" />
                    <span className="flex-1">{label}</span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Fourchette de prix
              </p>
              <div className="mb-2.5 h-1 rounded-full bg-gray-100">
                <div className="relative h-full">
                  <div className="absolute inset-y-0 left-[20%] right-[30%] rounded-full bg-brand" />
                  <div
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow"
                    style={{ left: '20%' }}
                  />
                  <div
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow"
                    style={{ left: '70%' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-500">
                  Min (FCFA)
                </span>
                <span className="rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-500">
                  Max (FCFA)
                </span>
              </div>
            </div>
            <div className="my-[22px] h-px bg-black/[0.06]" />

            <div className="mb-[22px]">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
                Pays
              </p>
              <div className="flex flex-col gap-2">
                {COUNTRY_FILTERS.map((f, i) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-2.5 text-[13px] text-gray-600"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                        i === 0 ? 'bg-brand' : 'border border-black/[0.15]',
                      )}
                    >
                      {i === 0 && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                    </span>
                    <span className="flex-1">{f.label}</span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      {f.count}
                    </span>
                  </div>
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
                {SURFACE_FILTERS.map((s) => (
                  <div key={s} className="flex items-center gap-2.5 text-[13px] text-gray-600">
                    <span className="h-4 w-4 flex-shrink-0 rounded border border-black/[0.15]" />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <span
              title="Bientôt disponible"
              className="block cursor-not-allowed rounded-full bg-brand/40 py-2.5 text-center text-sm font-semibold text-white select-none"
            >
              Appliquer les filtres
            </span>
          </aside>

          {/* LISTINGS AREA */}
          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {TYPE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-[13px] font-medium whitespace-nowrap',
                    tab === t.id
                      ? 'border-brand bg-brand text-white'
                      : 'border-black/[0.08] text-gray-500',
                  )}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            {view === 'grid' ? (
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((listing) => (
                  <div
                    key={listing.id}
                    className="overflow-hidden rounded-2xl border border-black/[0.06]"
                  >
                    <div className="relative h-[200px] bg-gray-100">
                      <img
                        src={listing.imageUrl}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                        {listing.badges.map((b) => (
                          <span
                            key={b.label}
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white',
                              b.className,
                            )}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 p-4">
                      <p className="mb-1.5 text-[15px] leading-snug font-bold">{listing.title}</p>
                      <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                        {listing.location} · {listing.country}
                      </p>
                      <div className="mb-2.5 flex items-center gap-2">
                        <img
                          src={listing.agentAvatarUrl}
                          alt={listing.agentName}
                          className="h-[22px] w-[22px] flex-shrink-0 rounded-full object-cover"
                        />
                        <span className="text-xs text-gray-500">{listing.agentName}</span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                          <BadgeCheck className="h-3 w-3" aria-hidden />
                          Vérifié
                        </span>
                      </div>
                      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {listing.features.slice(0, 3).map((f) => (
                          <span key={f.label} className="flex items-center gap-1">
                            <f.icon className="h-3 w-3" aria-hidden />
                            {f.label}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] pt-2.5">
                        <p className="text-lg font-extrabold tracking-[-0.03em] text-brand">
                          {listing.price}{' '}
                          <span className="text-[11px] font-semibold text-gray-500">
                            {listing.priceUnit}
                          </span>
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
                {filtered.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] sm:flex-row"
                  >
                    <div className="relative h-[200px] flex-shrink-0 bg-gray-100 sm:h-auto sm:w-[220px]">
                      <img
                        src={listing.imageUrl}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        {listing.badges.map((b) => (
                          <span
                            key={b.label}
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white',
                              b.className,
                            )}
                          >
                            {b.label}
                          </span>
                        ))}
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
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xl font-extrabold whitespace-nowrap text-brand">
                              {listing.price}
                            </p>
                            <p className="text-[11px] font-semibold text-gray-500">
                              {listing.priceUnit}
                            </p>
                          </div>
                        </div>
                        <p className="mb-2.5 flex items-center gap-1.5 text-[13px] text-gray-500">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                          {listing.location} · {listing.country}
                        </p>
                        <div className="mb-3 flex flex-wrap items-center gap-4 text-[13px] text-gray-500">
                          {listing.features.map((f) => (
                            <span key={f.label} className="flex items-center gap-1.5">
                              <f.icon className="h-3.5 w-3.5" aria-hidden />
                              {f.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={listing.agentAvatarUrl}
                            alt={listing.agentName}
                            className="h-[26px] w-[26px] flex-shrink-0 rounded-full object-cover"
                          />
                          <span className="text-[13px] text-gray-500">{listing.agentName}</span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                            <BadgeCheck className="h-3 w-3" aria-hidden />
                            Vérifié
                          </span>
                          <span className="text-xs whitespace-nowrap text-gray-400">
                            · Publié le {listing.publishedDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <InertPill className="h-8 w-8 justify-center rounded-full border-black/[0.08] p-0 text-gray-500">
                            <Heart className="h-3.5 w-3.5" aria-hidden />
                          </InertPill>
                          <InertPill className="rounded-full border-black/[0.08] bg-gray-50 px-3.5 py-2 text-neutral-900">
                            <Phone className="h-3.5 w-3.5" aria-hidden />
                            Contacter
                          </InertPill>
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
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            <div className="mt-10 flex items-center justify-center gap-1.5">
              <InertPill className="h-9 w-9 justify-center rounded-lg border-black/[0.08] p-0 text-gray-500">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </InertPill>
              {[1, 2, 3, 4].map((n) => (
                <InertPill
                  key={n}
                  className={cn(
                    'h-9 w-9 justify-center rounded-lg border-black/[0.08] p-0',
                    n === 1 && 'border-brand bg-brand text-white',
                  )}
                >
                  {n}
                </InertPill>
              ))}
              <span className="px-1 text-sm text-gray-400">…</span>
              <InertPill className="h-9 w-9 justify-center rounded-lg border-black/[0.08] p-0">
                15
              </InertPill>
              <InertPill className="h-9 w-9 justify-center rounded-lg border-black/[0.08] p-0 text-gray-500">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </InertPill>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
