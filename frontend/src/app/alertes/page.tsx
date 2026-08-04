'use client';

import {
  Plus,
  Settings2,
  TrendingUp,
  Eye,
  Sparkles,
  List,
  LayoutGrid,
  Maximize2,
  MapPin,
  Bookmark,
  MoreHorizontal,
  Clock,
  ArrowRight,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { MOCK_ALERTS, TRANSACTION_BADGE, type Transaction } from '@/lib/alerts-data';

interface RecentMatch {
  id: string;
  imageUrl: string;
  title: string;
  zoneFlag: string;
  zone: string;
  size: string;
  detail: string;
  timeLabel: string;
  isNew: boolean;
  price: string;
  transaction: Transaction;
}

const MOCK_MATCHES: RecentMatch[] = [
  {
    id: 'm1',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/20210aed-ed54-4b80-9467-2e6370d287bb.jpg',
    title: 'Belle villa 5 pièces avec piscine – Cocody Danga',
    zoneFlag: '🇨🇮',
    zone: 'Cocody, Abidjan',
    size: '280 m²',
    detail: '5 pièces',
    timeLabel: 'Il y a 2h',
    isNew: true,
    price: '145 000 000 FCFA',
    transaction: 'VENTE',
  },
  {
    id: 'm2',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/8cc29858-d03e-447b-a0ab-bb26f1479c62.jpg',
    title: 'Appartement meublé 3 pièces – Almadies Dakar',
    zoneFlag: '🇸🇳',
    zone: 'Almadies, Dakar',
    size: '95 m²',
    detail: '3 pièces',
    timeLabel: 'Il y a 5h',
    isNew: true,
    price: '28 000 000 FCFA',
    transaction: 'LOCATION',
  },
  {
    id: 'm3',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/cdae6458-9b12-4e4e-979f-cfdfb3b92f3b.jpg',
    title: 'Terrain titré 800m² viabilisé – Bè, Lomé',
    zoneFlag: '🇹🇬',
    zone: 'Bè, Lomé',
    size: '800 m²',
    detail: 'Titré',
    timeLabel: 'Hier',
    isNew: false,
    price: '55 000 000 FCFA',
    transaction: 'VENTE',
  },
  {
    id: 'm4',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/3cde2648-74f4-4739-827b-ab9b6ab5e152.jpg',
    title: 'Villa sécurisée 4 ch. avec jardin – Marcory',
    zoneFlag: '🇨🇮',
    zone: 'Marcory, Abidjan',
    size: '220 m²',
    detail: '4 chambres',
    timeLabel: 'Hier',
    isNew: false,
    price: '98 000 000 FCFA',
    transaction: 'VENTE',
  },
  {
    id: 'm5',
    imageUrl:
      'https://storage.googleapis.com/banani-generated-images/generated-images/169d3a9b-854c-4c6b-8728-cc537f9f0364.jpg',
    title: 'Appartement 3P lumineux vue mer – Mermoz',
    zoneFlag: '🇸🇳',
    zone: 'Mermoz, Dakar',
    size: '88 m²',
    detail: '3 pièces',
    timeLabel: '2 jan.',
    isNew: false,
    price: '22 000 000 FCFA',
    transaction: 'LOCATION',
  },
];

export default function AlertesPage() {
  const user = useUser();

  const activeCount = MOCK_ALERTS.filter((a) => a.active).length;
  const inactiveCount = MOCK_ALERTS.filter((a) => !a.active).length;
  const monthlyMatches = 14;
  const viewedListings = 38;

  if (!user) return null;

  return (
    <DashboardShell active="alerts" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Alerte Secteur
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Suivez les nouvelles annonces correspondant à vos critères de recherche par zone.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-gray-400"
          >
            <Settings2 className="h-[14px] w-[14px]" aria-hidden />
            <span className="hidden lg:inline">Gérer les alertes</span>
          </button>
          <Link
            href="/alertes/new"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Nouvelle</span>
            <span className="hidden lg:inline">Nouvelle alerte</span>
          </Link>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Alertes actives',
            value: activeCount,
            dot: '#376BFF',
            sub: (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden />
                +2 ce mois
              </span>
            ),
          },
          {
            label: 'Correspondances ce mois',
            value: monthlyMatches,
            dot: '#F59E0B',
            sub: (
              <span className="flex items-center gap-1 text-brand">
                <Sparkles className="h-3 w-3" aria-hidden />
                Nouvelles
              </span>
            ),
          },
          {
            label: 'Annonces consultées',
            value: viewedListings,
            dot: '#10B981',
            sub: (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden />
                +5 ce mois
              </span>
            ),
          },
          { label: 'Alertes désactivées', value: inactiveCount, dot: '#EF4444', sub: '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <p className="mb-2 text-xs font-medium text-gray-400">{s.label}</p>
            <p className="font-sora mb-1 text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="flex items-center text-[11.5px] text-gray-400">
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{ background: s.dot }}
              />
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* SECTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sora mb-0.5 text-[15px] font-semibold text-neutral-900">
            Mes alertes secteur
          </h2>
          <p className="text-[13px] text-gray-400">
            Cliquez sur une alerte pour voir les correspondances récentes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-gray-400"
          >
            <List className="h-[13px] w-[13px]" aria-hidden />
            Vue liste
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-brand bg-brand/10 px-3.5 py-1.5 text-[12.5px] font-medium text-brand"
          >
            <LayoutGrid className="h-[13px] w-[13px]" aria-hidden />
            Vue grille
          </button>
        </div>
      </div>

      {/* ALERT CARDS GRID */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_ALERTS.map((alert) => (
          <Link
            key={alert.id}
            href={`/alertes/${alert.id}`}
            className="flex flex-col gap-3.5 rounded-2xl bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{alert.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                  <span>{alert.flag}</span>
                  <span>{alert.country}</span>
                  <span className="text-gray-200">•</span>
                  <span>{TRANSACTION_BADGE[alert.transaction].label}</span>
                </p>
              </div>
              <span
                className={cn(
                  'flex-shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                  alert.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700',
                )}
              >
                {alert.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {alert.criteria.map((c, i) => (
                <span
                  key={i}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium whitespace-nowrap',
                    c.highlight
                      ? 'bg-brand/10 text-brand'
                      : c.muted
                        ? 'bg-gray-100 text-gray-300'
                        : 'bg-gray-100 text-neutral-700',
                  )}
                >
                  {c.icon && <c.icon className="h-2.5 w-2.5" aria-hidden />}
                  {c.label}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-400">
                Dernière correspondance :{' '}
                <span
                  className={cn(
                    'font-semibold',
                    alert.lastMatch === 'Aucune' ? 'text-gray-400 font-medium' : 'text-brand',
                  )}
                >
                  {alert.lastMatch}
                </span>
              </p>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    'relative inline-block h-[18px] w-8 rounded-full',
                    alert.active ? 'bg-brand' : 'bg-gray-300',
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      'absolute top-[3px] h-3 w-3 rounded-full bg-white',
                      alert.active ? 'right-[3px]' : 'left-[3px]',
                    )}
                  />
                </span>
                <span
                  className={cn(
                    'text-xs whitespace-nowrap',
                    alert.active ? 'text-emerald-700' : 'text-gray-400',
                  )}
                >
                  {alert.active ? 'Activée' : 'Désactivée'}
                </span>
              </div>
            </div>

            <p className="text-[11.5px] text-gray-400">
              {alert.createdLabel} · Fréquence : {alert.frequencyLabel}
            </p>
          </Link>
        ))}

        {/* New alert card */}
        <Link
          href="/alertes/new"
          className="flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-black/[0.08] bg-white p-6"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
            <Plus className="h-5 w-5 text-brand" aria-hidden />
          </div>
          <p className="text-[13.5px] font-semibold text-brand">Créer une nouvelle alerte</p>
          <p className="text-center text-xs text-gray-400">
            Définissez vos critères et recevez
            <br />
            des correspondances en temps réel.
          </p>
        </Link>
      </div>

      {/* RECENT MATCHES */}
      <div className="rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className="font-sora text-[15px] font-semibold text-neutral-900">
              Correspondances récentes
            </span>
            <span className="text-[12.5px] text-gray-400">
              {monthlyMatches} ce mois · {MOCK_MATCHES.filter((m) => m.isNew).length} nouvelles
              aujourd&apos;hui
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-1.5 text-[12.5px] font-medium text-gray-400"
            >
              Toutes les alertes
            </button>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-gray-400"
            >
              <Download className="h-[13px] w-[13px]" aria-hidden />
              Exporter
            </button>
          </div>
        </div>

        <div>
          {MOCK_MATCHES.map((m, i) => (
            <div
              key={m.id}
              className={cn(
                'flex flex-wrap items-center gap-3.5 border-t border-black/[0.06] px-5 py-3.5 lg:flex-nowrap',
                i % 2 === 1 && 'bg-[#FAFBFD]',
              )}
            >
              <img
                src={m.imageUrl}
                alt={m.title}
                className="h-12 w-14 flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-neutral-900">{m.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <MapPin className="h-2.5 w-2.5" aria-hidden />
                    {m.zoneFlag} {m.zone}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Maximize2 className="h-2.5 w-2.5" aria-hidden />
                    {m.size}
                  </span>
                  <span className="whitespace-nowrap">{m.detail}</span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-2.5 w-2.5" aria-hidden />
                    {m.timeLabel}
                  </span>
                  {m.isNew && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-brand">
                      Nouvelle
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                <span className="font-sora text-sm font-semibold whitespace-nowrap text-neutral-900">
                  {m.price}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                    TRANSACTION_BADGE[m.transaction].className,
                  )}
                >
                  {TRANSACTION_BADGE[m.transaction].label}
                </span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-400"
                >
                  <Eye className="h-[13px] w-[13px]" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-400"
                >
                  <Bookmark className="h-[13px] w-[13px]" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md border border-black/[0.08] bg-gray-50 text-gray-400"
                >
                  <MoreHorizontal className="h-[13px] w-[13px]" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-black/[0.06] px-5 py-4 text-center">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="inline-flex cursor-not-allowed items-center gap-1.5 text-[13px] font-semibold text-brand"
          >
            Voir toutes les correspondances
            <ArrowRight className="h-[14px] w-[14px]" aria-hidden />
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
