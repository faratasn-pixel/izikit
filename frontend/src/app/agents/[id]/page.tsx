'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bath,
  Bed,
  CalendarCheck,
  Home,
  Loader2,
  Maximize,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  ShieldCheck,
  Star,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { InitialsAvatar } from '@/components/dashboard/InitialsAvatar';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL, formatListingPrice } from '@/lib/listings';
import { COUNTRY_FLAG, formatDate } from '@/lib/alerts';

interface AgentListing {
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
  createdAt: string;
  primaryPhotoUrl: string | null;
}

interface AgentDetail {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  phone: string | null;
  createdAt: string;
  stats: {
    activeListings: number;
    soldListings: number;
    verifiedDocCount: number;
    verifiedDocTotal: number;
  };
  specialties: { propertyTypes: string[]; transactionTypes: string[] };
  listings: AgentListing[];
}

function InertLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span title="Bientôt disponible" className={cn('cursor-not-allowed select-none', className)}>
      {children}
    </span>
  );
}

function memberSinceLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    api<AgentDetail>(`/api/public/agents/${id}`)
      .then((res) => {
        if (cancelled) return;
        setAgent(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        setAgent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white text-neutral-900">
        <PublicNavbar active="agents" />
        <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement du profil…
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="bg-white text-neutral-900">
        <PublicNavbar active="agents" />
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-lg font-bold">Agent introuvable</p>
          <p className="max-w-sm text-sm text-gray-500">
            Ce profil n&apos;existe pas ou n&apos;est plus disponible.
          </p>
          <Link href="/agents" className="text-sm font-semibold text-brand">
            ← Retour à l&apos;annuaire des agents
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const kycVerified = agent.stats.verifiedDocCount >= agent.stats.verifiedDocTotal;
  const heroStats = [
    { value: `${agent.stats.activeListings}`, label: 'Annonces actives' },
    { value: `${agent.stats.soldListings}`, label: 'Transactions conclues' },
    { value: '—', label: "D'expérience" },
    { value: '—', label: 'Avis clients' },
    { value: '—', label: 'Note globale' },
    {
      value: `${agent.stats.verifiedDocCount}/${agent.stats.verifiedDocTotal}`,
      label: 'Docs vérifiés',
    },
  ];

  const specialtyLabels = [
    ...agent.specialties.propertyTypes.map((t) => PROPERTY_TYPE_LABEL[t] ?? t),
    ...agent.specialties.transactionTypes.map((t) => TRANSACTION_TYPE_LABEL[t] ?? t),
  ];

  return (
    <div className="bg-white text-neutral-900">
      <PublicNavbar active="agents" />

      {/* BREADCRUMB */}
      <div className="border-b border-black/[0.06] px-4 py-3.5 lg:px-7">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 text-[13px] text-gray-500">
          <Link href="/" className="hover:text-neutral-900">
            Accueil
          </Link>
          <span className="text-black/15">/</span>
          <Link href="/agents" className="hover:text-neutral-900">
            Agents certifiés
          </Link>
          <span className="text-black/15">/</span>
          <span className="font-medium text-neutral-900">
            {agent.name ?? 'Agent Habitat-Afrik'}
          </span>
        </div>
      </div>

      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 lg:px-7"
        style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 55%, #0F172A 100%)' }}
      >
        <div className="pointer-events-none absolute -top-[200px] -right-[100px] h-[600px] w-[600px] rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-[120px] left-[10%] h-[300px] w-[300px] rounded-full bg-white/[0.04]" />
        <div className="relative z-[1] mx-auto max-w-[1280px]">
          <div className="flex flex-col items-center gap-6 pt-9 text-center lg:flex-row lg:items-end lg:gap-9 lg:text-left">
            <div className="relative flex-shrink-0">
              <InitialsAvatar
                name={agent.name}
                email=""
                seed={agent.id}
                avatarUrl={agent.avatarUrl}
                size={100}
                className="border-4 border-white/80 lg:h-[120px] lg:w-[120px]"
              />
            </div>
            <div className="flex-1 pb-0 lg:pb-7">
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold tracking-[0.12em] whitespace-nowrap text-white/95 uppercase">
                <ShieldCheck className="h-[13px] w-[13px]" aria-hidden />
                Agent certifié Habitat-Afrik
              </div>
              <h1 className="font-sora mb-1.5 text-[28px] font-extrabold tracking-[-0.04em] text-white lg:text-[36px]">
                {agent.name ?? 'Agent Habitat-Afrik'}
              </h1>
              <div className="mb-4 flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:gap-4">
                <span className="text-[15px] text-white/82">Agent immobilier</span>
                {(agent.city || agent.country) && (
                  <span className="flex items-center gap-1.5 text-sm whitespace-nowrap text-white/70">
                    <MapPin className="h-[13px] w-[13px]" aria-hidden />
                    {[agent.city, agent.country].filter(Boolean).join(', ')}{' '}
                    {agent.country ? (COUNTRY_FLAG[agent.country] ?? '') : ''}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-xs font-semibold whitespace-nowrap',
                    kycVerified ? 'bg-white/[0.14] text-white/90' : 'bg-white/[0.08] text-white/70',
                  )}
                >
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {kycVerified
                    ? 'KYC validé'
                    : `KYC ${agent.stats.verifiedDocCount}/${agent.stats.verifiedDocTotal}`}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.14] px-3 py-[5px] text-xs font-semibold whitespace-nowrap text-white/90">
                  <CalendarCheck className="h-3 w-3" aria-hidden />
                  Membre depuis {memberSinceLabel(agent.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-center gap-3 pb-7 lg:w-auto lg:items-end">
              {agent.phone ? (
                <a
                  href={`tel:${agent.phone}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-[22px] py-3.5 text-sm font-bold whitespace-nowrap text-brand lg:w-auto"
                >
                  <Phone className="h-[15px] w-[15px]" aria-hidden />
                  Appeler maintenant
                </a>
              ) : (
                <InertLink className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-[22px] py-3.5 text-sm font-bold whitespace-nowrap text-brand lg:w-auto">
                  <Phone className="h-[15px] w-[15px]" aria-hidden />
                  Appeler maintenant
                </InertLink>
              )}
              <InertLink className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.14] px-[22px] py-3.5 text-sm font-semibold whitespace-nowrap text-white lg:w-auto">
                <MessageCircle className="h-[15px] w-[15px]" aria-hidden />
                Envoyer un message
              </InertLink>
            </div>
          </div>

          {/* STATS ROW */}
          <div className="mt-1 grid grid-cols-2 border-t border-white/[0.12] sm:grid-cols-3 lg:grid-cols-6">
            {heroStats.map((s) => (
              <div
                key={s.label}
                className="border-r border-white/10 px-4 py-5 text-center last:border-r-0 sm:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n)]:border-r"
              >
                <strong className="font-sora block text-2xl font-extrabold tracking-[-0.04em] text-white">
                  {s.value}
                </strong>
                <span className="text-xs whitespace-nowrap text-white/65">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN */}
      <section className="px-4 py-9 pb-20 lg:px-7">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
          {/* LEFT COLUMN */}
          <div className="order-2 flex flex-col gap-7 lg:order-1">
            {/* ABOUT */}
            <div className="rounded-2xl border border-black/[0.08] p-6 lg:p-7">
              <div className="mb-4.5 flex items-center gap-2.5 text-base font-bold">
                <UserCircle className="h-[18px] w-[18px] text-brand" aria-hidden />À propos de{' '}
                {agent.name ?? 'cet agent'}
              </div>
              <div className="flex flex-col gap-4 text-sm leading-relaxed text-neutral-900">
                <p>{agent.bio ?? 'Cet agent n’a pas encore ajouté de description.'}</p>
              </div>
              {specialtyLabels.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {specialtyLabels.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-gray-50 px-3.5 py-[7px] text-[13px] font-medium whitespace-nowrap"
                    >
                      <Home className="h-[13px] w-[13px] text-brand" aria-hidden />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ANNONCES */}
            <div className="rounded-2xl border border-black/[0.08] p-6 lg:p-7">
              <div className="mb-4.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-base font-bold">
                  <Home className="h-[18px] w-[18px] text-brand" aria-hidden />
                  Annonces récentes
                </div>
                {agent.stats.activeListings > 0 && (
                  <span className="text-[13px] font-semibold whitespace-nowrap text-brand">
                    {agent.stats.activeListings} annonce{agent.stats.activeListings > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {agent.listings.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune annonce publiée pour l&apos;instant.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {agent.listings.map((l) => (
                    <Link
                      key={l.id}
                      href={`/annonces/${l.id}`}
                      className="block overflow-hidden rounded-xl border border-black/[0.08]"
                    >
                      {l.primaryPhotoUrl ? (
                        <img
                          src={l.primaryPhotoUrl}
                          alt={l.title}
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center bg-gray-50 text-gray-300">
                          <Home className="h-8 w-8" aria-hidden />
                        </div>
                      )}
                      <div className="p-3.5">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-[3px] text-[11px] font-bold whitespace-nowrap',
                              l.transactionType === 'VENTE'
                                ? 'bg-brand/10 text-brand'
                                : 'bg-green-600/10 text-green-600',
                            )}
                          >
                            {TRANSACTION_TYPE_LABEL[l.transactionType] ?? l.transactionType}
                          </span>
                        </div>
                        <div className="mb-1 truncate text-sm font-bold">{l.title}</div>
                        <div className="mb-2 truncate text-xs text-gray-500">
                          {COUNTRY_FLAG[l.country] ?? ''} {l.city}
                        </div>
                        <div className="text-[15px] font-extrabold tracking-[-0.02em] text-brand">
                          {formatListingPrice(l.price, l.currency)}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {l.bedrooms != null && (
                            <span className="flex items-center gap-1 text-xs whitespace-nowrap text-gray-500">
                              <Bed className="h-3 w-3" aria-hidden />
                              {l.bedrooms} ch.
                            </span>
                          )}
                          {l.bathrooms != null && (
                            <span className="flex items-center gap-1 text-xs whitespace-nowrap text-gray-500">
                              <Bath className="h-3 w-3" aria-hidden />
                              {l.bathrooms} sdb
                            </span>
                          )}
                          {l.surfaceM2 != null && (
                            <span className="flex items-center gap-1 text-xs whitespace-nowrap text-gray-500">
                              <Maximize className="h-3 w-3" aria-hidden />
                              {l.surfaceM2} m²
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* AVIS */}
            <div className="rounded-2xl border border-black/[0.08] p-6 lg:p-7">
              <div className="mb-4.5 flex items-center gap-2.5 text-base font-bold">
                <Star className="h-[18px] w-[18px] text-gray-300" aria-hidden />
                Avis clients
              </div>
              <p className="text-sm text-gray-500">
                Les avis clients ne sont pas encore disponibles sur Habitat-Afrik.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN — SIDEBAR */}
          <div className="order-1 flex flex-col gap-5 lg:order-2">
            {/* CONTACT CARD */}
            <div className="rounded-2xl border border-black/[0.08] p-6">
              <div className="mb-4 text-[15px] font-bold">
                Contacter {agent.name ?? 'cet agent'}
              </div>
              <div className="mb-4.5 flex flex-col gap-3">
                {agent.phone && (
                  <div className="flex items-center gap-3 rounded-[10px] border border-black/[0.08] px-4 py-3.5">
                    <Phone className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden />
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">
                        Téléphone
                      </div>
                      <div className="truncate text-sm font-semibold">{agent.phone}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {agent.phone ? (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center justify-center gap-2 rounded-full bg-brand px-4.5 py-3.5 text-sm font-bold whitespace-nowrap text-white"
                  >
                    <Phone className="h-[15px] w-[15px]" aria-hidden />
                    Appeler maintenant
                  </a>
                ) : (
                  <InertLink className="flex items-center justify-center gap-2 rounded-full bg-brand px-4.5 py-3.5 text-sm font-bold whitespace-nowrap text-white">
                    <Phone className="h-[15px] w-[15px]" aria-hidden />
                    Appeler maintenant
                  </InertLink>
                )}
                <InertLink className="flex items-center justify-center gap-2 rounded-full bg-gray-50 px-4.5 py-3.5 text-sm font-bold whitespace-nowrap">
                  <MessageCircle className="h-[15px] w-[15px]" aria-hidden />
                  Envoyer un message
                </InertLink>
                <InertLink className="flex items-center justify-center gap-2 rounded-full bg-[#1877F2] px-4.5 py-3.5 text-sm font-bold whitespace-nowrap text-white">
                  <Send className="h-[15px] w-[15px]" aria-hidden />
                  Facebook Messenger
                </InertLink>
              </div>
            </div>

            {/* INFO CARD */}
            <div className="rounded-2xl border border-black/[0.08] p-5">
              <div className="mb-3.5 text-[13px] font-bold tracking-[0.1em] uppercase">
                Informations
              </div>
              <div className="flex flex-col gap-3">
                {agent.country && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[13px] whitespace-nowrap text-gray-500">
                      Pays d&apos;activité
                    </span>
                    <span className="text-right text-[13px] font-semibold">
                      {COUNTRY_FLAG[agent.country] ?? ''} {agent.country}
                    </span>
                  </div>
                )}
                {agent.city && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[13px] whitespace-nowrap text-gray-500">
                      Ville principale
                    </span>
                    <span className="text-right text-[13px] font-semibold">{agent.city}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[13px] whitespace-nowrap text-gray-500">Membre depuis</span>
                  <span className="text-right text-[13px] font-semibold text-brand">
                    {formatDate(agent.createdAt)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[13px] whitespace-nowrap text-gray-500">KYC</span>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                    <ShieldCheck
                      className={cn(
                        'h-[13px] w-[13px]',
                        kycVerified ? 'text-green-500' : 'text-gray-300',
                      )}
                      aria-hidden
                    />
                    {kycVerified
                      ? 'Validé'
                      : `${agent.stats.verifiedDocCount}/${agent.stats.verifiedDocTotal} documents`}
                  </span>
                </div>
              </div>
            </div>

            {/* MAP CARD */}
            {(agent.city || agent.country) && (
              <div className="overflow-hidden rounded-2xl border border-black/[0.08]">
                <div className="flex h-40 flex-col items-center justify-center gap-2 bg-sky-100">
                  <MapPin className="h-7 w-7 text-brand" aria-hidden />
                  <span className="text-[13px] text-gray-500">
                    Zone d&apos;activité : {agent.city ?? agent.country}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <span className="flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap">
                    <Navigation className="h-3.5 w-3.5 text-brand" aria-hidden />
                    {[agent.city, agent.country].filter(Boolean).join(', ')}
                  </span>
                  <InertLink className="text-[13px] font-semibold whitespace-nowrap text-brand">
                    Voir sur la carte →
                  </InertLink>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
