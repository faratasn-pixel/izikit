'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL } from '@/lib/listings';

interface PublicListingItem {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  transactionType: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  surfaceM2: number | null;
  primaryPhotoUrl: string | null;
}

interface Facet {
  value: string;
  count: number;
}

interface PublicListingsResponse {
  items: PublicListingItem[];
  facets: { propertyTypes: Facet[] };
}

const LIMIT = 6;

function formatPriceParts(price: number, currency: string): { amount: string; unit: string } {
  return { amount: price.toLocaleString('fr-FR'), unit: currency === 'XOF' ? 'FCFA' : currency };
}

export function FeaturedListingsSection() {
  const [propertyType, setPropertyType] = useState('');
  const [data, setData] = useState<PublicListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT) });
    if (propertyType) params.set('propertyType', propertyType);

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
  }, [propertyType]);

  const items = data?.items ?? [];
  const propertyTypeTabs = data?.facets.propertyTypes ?? [];

  return (
    <>
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
          <button
            type="button"
            onClick={() => setPropertyType('')}
            className={cn(
              'rounded-full border px-3.5 py-2 text-[13px] font-medium whitespace-nowrap',
              propertyType === ''
                ? 'border-brand bg-brand text-white'
                : 'border-black/[0.08] text-gray-500',
            )}
          >
            Toutes
          </button>
          {propertyTypeTabs.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setPropertyType(f.value)}
              className={cn(
                'rounded-full border px-3.5 py-2 text-[13px] font-medium whitespace-nowrap',
                propertyType === f.value
                  ? 'border-brand bg-brand text-white'
                  : 'border-black/[0.08] text-gray-500',
              )}
            >
              {PROPERTY_TYPE_LABEL[f.value] ?? f.value}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-black/[0.06] bg-gray-50 p-10 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement des annonces…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-black/[0.06] bg-gray-50 p-10 text-center text-sm text-gray-500">
          Aucune annonce ne correspond à ce type de bien pour l&apos;instant.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => {
            const { amount, unit } = formatPriceParts(listing.price, listing.currency);
            const features = [
              listing.bedrooms != null ? `${listing.bedrooms} ch.` : null,
              listing.bathrooms != null ? `${listing.bathrooms} sdb` : null,
              listing.surfaceM2 != null ? `${listing.surfaceM2} m²` : null,
            ].filter((f): f is string => f !== null);

            return (
              <div
                key={listing.id}
                className="overflow-hidden rounded-[20px] border border-black/[0.06]"
              >
                <div className="relative h-[220px] bg-gray-100 lg:h-[240px]">
                  {listing.primaryPhotoUrl ? (
                    <img
                      src={listing.primaryPhotoUrl}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <MapPin className="h-8 w-8" aria-hidden />
                    </div>
                  )}
                  <div className="absolute top-3.5 right-3.5 left-3.5 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                      ✓ Vérifié
                    </span>
                    <span className="rounded-full bg-black/78 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white">
                      {TRANSACTION_TYPE_LABEL[listing.transactionType] ?? listing.transactionType}
                    </span>
                  </div>
                </div>
                <div className="p-[18px]">
                  <p className="mb-2 text-[17px] leading-snug font-bold lg:text-[19px]">
                    {listing.title}
                  </p>
                  <p className="mb-2 flex items-center gap-1.5 text-[13px] text-gray-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                    {listing.city}, {listing.country}
                  </p>
                  {features.length > 0 && (
                    <div className="mb-3.5 flex flex-wrap items-center gap-4 text-[13px] text-gray-500">
                      {features.map((f) => (
                        <span key={f}>{f}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-sora text-[24px] font-extrabold tracking-[-0.03em] text-brand lg:text-[28px]">
                      {amount}{' '}
                      <span className="text-[13px] font-semibold text-gray-500">{unit}</span>
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
            );
          })}
        </div>
      )}

      <div className="mt-7 flex justify-center">
        <Link
          href="/annonces"
          className="rounded-full border border-black/[0.08] px-[22px] py-3 text-sm font-semibold text-brand"
        >
          Voir toutes les annonces
        </Link>
      </div>
    </>
  );
}
