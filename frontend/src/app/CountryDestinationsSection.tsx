'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { COUNTRIES as COUNTRY_CITIES } from '@/lib/countries';

interface Country {
  id: string;
  flag: string;
  name: string;
  imageUrl: string;
  copy: string;
}

// Editorial content (flag/image/copy) for the app's four fixed markets —
// not derived from listing data, so it stays static. Only the stats
// (active listing count, entry-level budget) come from the API.
const COUNTRIES: Country[] = [
  {
    id: 'benin',
    flag: '🇧🇯',
    name: 'Bénin',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/c8389639-8363-4a79-9c55-cea7463cdb76.jpg',
    copy: 'Un marché dynamique porté par les villas familiales, résidences sécurisées et terrains à fort potentiel autour de Cotonou.',
  },
  {
    id: 'togo',
    flag: '🇹🇬',
    name: 'Togo',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/7ebb9db1-34d5-45ed-91db-d424a2312f78.jpg',
    copy: 'Une offre concentrée autour de Lomé, idéale pour les terrains, immeubles de rapport et projets résidentiels bien situés.',
  },
  {
    id: 'ci',
    flag: '🇨🇮',
    name: "Côte d'Ivoire",
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/bb426b40-a88a-45e0-a37c-0021748f695c.jpg',
    copy: 'Le marché le plus actif de la plateforme, dominé par Abidjan et une forte demande sur les villas haut de gamme.',
  },
  {
    id: 'senegal',
    flag: '🇸🇳',
    name: 'Sénégal',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/7c7bae4b-fef7-4187-9493-0e89947ae7bc.jpg',
    copy: 'Un marché recherché pour la location longue durée, les résidences modernes et les investissements sécurisés.',
  },
];

interface CountryFacet {
  value: string;
  count: number;
  minPrice: number | null;
}

interface PublicListingsResponse {
  facets: { countries: CountryFacet[] };
}

function formatMinPrice(price: number): string {
  if (price >= 1_000_000) return `Dès ${Math.round(price / 1_000_000)}M`;
  if (price >= 1_000) return `Dès ${Math.round(price / 1_000)}K`;
  return `Dès ${price}`;
}

export function CountryDestinationsSection() {
  const [countryFacets, setCountryFacets] = useState<CountryFacet[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<PublicListingsResponse>('/api/public/listings?limit=1')
      .then((res) => {
        if (cancelled) return;
        setCountryFacets(res.facets.countries);
      })
      .catch(() => {
        if (cancelled) return;
        setCountryFacets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {COUNTRIES.map((c) => {
        const facet = countryFacets?.find((f) => f.value === c.name);
        const cities = COUNTRY_CITIES.find((cc) => cc.name === c.name)?.cities.slice(0, 3) ?? [];
        const listingCountLabel = facet ? `${facet.count}+` : '—';
        const minPriceLabel = facet?.minPrice != null ? formatMinPrice(facet.minPrice) : '—';

        return (
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
                <p className="mt-1 truncate text-xs text-white/82">{cities.join(' · ')}</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3.5 p-[18px]">
              <p className="text-sm leading-relaxed">{c.copy}</p>
              <div className="mt-auto grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="mb-1 text-[16px] font-bold whitespace-nowrap">
                    {listingCountLabel}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">Annonces actives</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="mb-1 text-[16px] font-bold whitespace-nowrap">{minPriceLabel}</p>
                  <p className="truncate text-[11px] text-gray-500">Budget d&apos;entrée</p>
                </div>
              </div>
              <Link
                href={`/annonces?country=${encodeURIComponent(c.name)}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand"
              >
                Explorer le {c.name} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
