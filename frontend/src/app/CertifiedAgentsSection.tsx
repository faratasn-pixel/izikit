'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
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

interface PublicAgentsResponse {
  items: PublicAgentItem[];
}

function kycLabel(a: PublicAgentItem): string {
  return a.verifiedDocCount >= a.verifiedDocTotal
    ? 'KYC validé'
    : `KYC ${a.verifiedDocCount}/${a.verifiedDocTotal}`;
}

function FeaturedCardSkeleton() {
  return (
    <div className="min-h-[340px] animate-pulse rounded-[24px] border border-black/[0.06] bg-gray-100 lg:min-h-[520px]" />
  );
}

function SideCardSkeleton() {
  return (
    <div className="h-[180px] animate-pulse rounded-[20px] border border-black/[0.06] bg-gray-100" />
  );
}

export function CertifiedAgentsSection() {
  const [agents, setAgents] = useState<PublicAgentItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<PublicAgentsResponse>('/api/public/agents?limit=4')
      .then((res) => {
        if (cancelled) return;
        setAgents(res.items);
      })
      .catch(() => {
        if (cancelled) return;
        setAgents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (agents === null) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <FeaturedCardSkeleton />
        <div className="flex flex-col gap-[18px]">
          <SideCardSkeleton />
          <SideCardSkeleton />
          <SideCardSkeleton />
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-gray-50 p-10 text-center text-sm text-gray-500">
        Aucun agent certifié pour l&apos;instant.
      </div>
    );
  }

  // "En avant" — the agent with the most real, verified listings among the
  // fetched batch. A real activity signal rather than an editorial pick,
  // since the data model has no featured/spotlight flag.
  const featured = agents.reduce((best, a) => (a.listingCount > best.listingCount ? a : best));
  const others = agents.filter((a) => a.id !== featured.id).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.9fr]">
      <div className="relative min-h-[340px] overflow-hidden rounded-[24px] border border-black/[0.06] lg:min-h-[520px]">
        {featured.avatarUrl ? (
          <img
            src={featured.avatarUrl}
            alt={featured.name ?? 'Agent Habitat-Afrik'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-sky-700">
            <InitialsAvatar
              name={featured.name}
              email=""
              seed={featured.id}
              avatarUrl={null}
              size={120}
            />
          </div>
        )}
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
            {featured.name ?? 'Agent Habitat-Afrik'}
          </p>
          <p className="mb-3.5 text-[15px] text-white/86">
            Agent immobilier
            {featured.city || featured.country
              ? ` · ${[featured.city, featured.country].filter(Boolean).join(', ')}`
              : ''}
          </p>
          {featured.bio && (
            <p className="mb-4 max-w-[560px] text-[16px] leading-relaxed text-white/94">
              « {featured.bio} »
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            {[
              `${featured.listingCount} annonce${featured.listingCount > 1 ? 's' : ''} active${featured.listingCount > 1 ? 's' : ''}`,
              kycLabel(featured),
            ].map((t) => (
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
        {others.map((a) => (
          <div key={a.id} className="rounded-[20px] border border-black/[0.06] p-[22px]">
            <div className="mb-3.5 flex items-center gap-3.5">
              <InitialsAvatar
                name={a.name}
                email=""
                seed={a.id}
                avatarUrl={a.avatarUrl}
                size={56}
              />
              <div className="min-w-0">
                <p className="truncate text-[18px] font-bold">{a.name ?? 'Agent Habitat-Afrik'}</p>
                <p className="truncate text-[13px] text-gray-500">
                  Agent immobilier{a.city ? ` · ${a.city}` : ''}
                </p>
              </div>
            </div>
            <span className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2 text-xs font-bold whitespace-nowrap">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden />
              {kycLabel(a)}
            </span>
            <div className="mb-3.5 grid grid-cols-3 gap-2.5">
              {[
                [`${a.listingCount}`, 'Annonces'],
                ['—', 'Note'],
                [`${a.verifiedDocCount}/${a.verifiedDocTotal}`, 'Docs vérifiés'],
              ].map(([val, label]) => (
                <div key={label} className="rounded-2xl bg-gray-50 p-2.5 text-center">
                  <p className="mb-1 text-[16px] font-extrabold">{val}</p>
                  <p className="truncate text-[11px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            <p className="mb-3.5 text-sm leading-relaxed">
              {a.bio ?? 'Cet agent n’a pas encore ajouté de description.'}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href={`/agents/${a.id}`} className="text-sm font-semibold text-brand">
                Voir le profil →
              </Link>
              {a.country && (
                <span className="text-[13px] whitespace-nowrap text-gray-500">
                  {COUNTRY_FLAG[a.country] ?? ''} {a.country}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
