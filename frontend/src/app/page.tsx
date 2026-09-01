'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  MapPin,
  ChevronDown,
  Globe2,
  Building2,
  Globe,
  BadgeCheck,
  ShieldCheck,
  CalendarCheck2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { CertifiedAgentsSection } from './CertifiedAgentsSection';
import { FeaturedListingsSection } from './FeaturedListingsSection';
import { CountryDestinationsSection } from './CountryDestinationsSection';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL } from '@/lib/listings';
import { COUNTRIES as COUNTRY_CITIES } from '@/lib/countries';

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
  const router = useRouter();

  const [searchCountry, setSearchCountry] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchPropertyType, setSearchPropertyType] = useState('');
  const [searchTransactionType, setSearchTransactionType] = useState('');

  const availableCities = COUNTRY_CITIES.find((c) => c.name === searchCountry)?.cities ?? [];

  function handleSearchCountryChange(value: string) {
    setSearchCountry(value);
    setSearchCity('');
  }

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCountry) params.set('country', searchCountry);
    if (searchCity.trim()) params.set('city', searchCity.trim());
    if (searchPropertyType) params.set('propertyType', searchPropertyType);
    if (searchTransactionType) params.set('transactionType', searchTransactionType);
    const qs = params.toString();
    router.push(qs ? `/annonces?${qs}` : '/annonces');
  }

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
            <form
              onSubmit={handleSearch}
              className="absolute bottom-[14px] left-1/2 z-[3] hidden w-[calc(100%-40px)] max-w-[1060px] -translate-x-1/2 grid-cols-[1.05fr_1.2fr_1fr_1fr_auto] items-center gap-2.5 rounded-full bg-white p-3 shadow-[0_20px_40px_rgba(15,23,42,0.12)] lg:grid"
            >
              <label className="flex items-center gap-2.5 rounded-full bg-brand/[0.08] px-4 py-3">
                <Globe2 className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="text-[10px] font-semibold text-brand uppercase">Pays</span>
                  <select
                    value={searchCountry}
                    onChange={(e) => handleSearchCountryChange(e.target.value)}
                    className="w-full appearance-none truncate bg-transparent text-[13px] font-semibold text-neutral-900 outline-none"
                  >
                    <option value="">Tous les pays</option>
                    {COUNTRY_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label
                className={cn(
                  'flex items-center gap-2.5 rounded-full bg-gray-50 px-4 py-3',
                  !searchCountry && 'opacity-60',
                )}
              >
                <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="text-[10px] text-gray-400 uppercase">Ville / Quartier</span>
                  <select
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    disabled={!searchCountry}
                    className="w-full appearance-none truncate bg-transparent text-[13px] font-medium text-neutral-900 outline-none disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {searchCountry ? 'Toutes les villes' : "Choisissez d'abord un pays"}
                    </option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label className="flex items-center justify-between gap-2 rounded-full bg-gray-50 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="text-[10px] text-gray-400 uppercase">Type de bien</span>
                  <select
                    value={searchPropertyType}
                    onChange={(e) => setSearchPropertyType(e.target.value)}
                    className="w-full appearance-none truncate bg-transparent text-[13px] font-medium text-neutral-900 outline-none"
                  >
                    <option value="">Tous les types de bien</option>
                    {Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </span>
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-full bg-gray-50 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="text-[10px] text-gray-400 uppercase">Transaction</span>
                  <select
                    value={searchTransactionType}
                    onChange={(e) => setSearchTransactionType(e.target.value)}
                    className="w-full appearance-none truncate bg-transparent text-[13px] font-medium text-neutral-900 outline-none"
                  >
                    <option value="">Toutes les transactions</option>
                    {Object.entries(TRANSACTION_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </span>
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden />
              </label>
              <button
                type="submit"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-[22px] text-sm font-semibold whitespace-nowrap text-white"
              >
                <Search className="h-4 w-4" aria-hidden />
                Rechercher
              </button>
            </form>
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
          <FeaturedListingsSection />
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

          <CountryDestinationsSection />
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

          <CertifiedAgentsSection />
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
                <Link href="/listings/new" className="text-sm font-semibold text-white underline">
                  Publier une annonce
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
