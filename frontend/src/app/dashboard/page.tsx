'use client';

import {
  Calendar,
  ChevronDown,
  Users,
  Building2,
  CalendarCheck,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Plus,
  MapPin,
  Eye,
  Pencil,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  type Listing,
  PROPERTY_TYPE_LABEL,
  STATUS_STYLE,
  formatListingPrice,
} from '@/lib/listings';
import { cn } from '@/lib/utils';

// Illustrative only — the user chose to keep these as realistic placeholders
// for this pass (Contacts/Visites/Vérification need Contact + Visit models
// that don't exist yet; only "Mes annonces" below is wired to real data).
const STAT_CARDS = [
  { icon: Users, value: '148', label: 'Contacts reçus', delta: '+12%', down: false },
  { icon: Building2, value: '34', label: 'Annonces publiées', delta: '+3', down: false },
  { icon: CalendarCheck, value: '21', label: 'Visites programmées', delta: '+5', down: false },
  { icon: ShieldCheck, value: '82%', label: 'Taux de vérification', delta: '-2%', down: true },
];

export default function DashboardPage() {
  const user = useUser();
  const { data, loading } = useApi<{ items: Listing[] }>('/api/listings?limit=8');
  const listings = data?.items ?? [];

  if (!user) return null;
  const firstName = (user.name ?? user.email).split(/\s+/)[0];

  return (
    <DashboardShell active="dashboard">
      {/* BANNER */}
      <div className="relative min-h-[190px] overflow-hidden rounded-2xl px-4 pt-5 lg:min-h-[210px] lg:px-7 lg:pt-6.5">
        <img
          src="https://storage.googleapis.com/banani-generated-images/generated-images/d9ab3d61-12e5-405a-88d0-d06e89ea8c46.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(10,18,40,0.82)_0%,rgba(10,18,40,0.55)_60%,rgba(55,107,255,0.28)_100%)]" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-sora mb-1.5 text-xl font-semibold text-white lg:text-[26px]">
              Bienvenue, {firstName} ! 👋
            </h1>
            <p className="text-xs text-white/78 lg:text-sm">
              Voici le résumé de vos annonces aujourd&apos;hui.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/22 bg-white/[0.13] px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap text-white lg:px-3 lg:text-xs">
            <Calendar className="h-[13px] w-[13px]" aria-hidden />
            Juillet 2026
            <ChevronDown className="h-3 w-3 text-white/70" aria-hidden />
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STAT_CARDS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1.5 rounded-t-2xl border border-white/15 bg-white/10 px-4 py-3.5 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-white/15">
                  <s.icon className="h-[15px] w-[15px] text-white" aria-hidden />
                </div>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                    s.down ? 'bg-red-400/20 text-red-300' : 'bg-emerald-400/20 text-emerald-300',
                  )}
                >
                  {s.delta}
                </span>
              </div>
              <span className="text-2xl leading-none font-semibold text-white">{s.value}</span>
              <span className="text-xs text-white/72">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CHARTS ROW — illustrative placeholders, same note as the stat cards above */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3.5 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <span className="font-sora text-sm font-semibold text-neutral-900">
              Performance des annonces
            </span>
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-neutral-700">
              Ce mois <ChevronDown className="h-2.5 w-2.5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative h-[110px] w-[110px] flex-shrink-0">
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="42" fill="none" stroke="#F3F4F6" strokeWidth="14" />
                <circle
                  cx="55"
                  cy="55"
                  r="42"
                  fill="none"
                  stroke="#376BFF"
                  strokeWidth="14"
                  strokeDasharray="158.3 105.6"
                  strokeDashoffset="66"
                />
                <circle
                  cx="55"
                  cy="55"
                  r="42"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="14"
                  strokeDasharray="73.9 189.9"
                  strokeDashoffset="-92.3"
                />
                <circle
                  cx="55"
                  cy="55"
                  r="42"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="14"
                  strokeDasharray="31.7 232.2"
                  strokeDashoffset="-166.2"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold text-neutral-900">34</span>
                <span className="text-[10px] text-gray-400">annonces</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
              {[
                { color: '#376BFF', label: 'Vérifié', val: 20 },
                { color: '#F59E0B', label: 'En attente', val: 10 },
                { color: '#EF4444', label: 'Vendu', val: 4 },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: l.color }}
                  />
                  <span className="text-xs text-neutral-700">{l.label}</span>
                  <span className="ml-auto text-xs font-semibold text-neutral-900">{l.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <span className="font-sora text-sm font-semibold text-neutral-900">Contacts reçus</span>
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-neutral-700">
              Cette semaine <ChevronDown className="h-2.5 w-2.5" aria-hidden />
            </span>
          </div>
          <div className="flex h-[90px] items-end gap-2">
            {[
              { d: 'Lun', h: 45 },
              { d: 'Mar', h: 62 },
              { d: 'Mer', h: 38 },
              { d: 'Jeu', h: 85, accent: true },
              { d: 'Ven', h: 70 },
              { d: 'Sam', h: 50 },
              { d: 'Dim', h: 28 },
            ].map((b) => (
              <div key={b.d} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className={cn('w-full rounded-t', b.accent ? 'bg-brand' : 'bg-brand/85')}
                  style={{ height: `${b.h}%` }}
                />
                <span className="mt-1 text-[10px] font-medium text-gray-400">{b.d}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 border-t border-black/[0.06] pt-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold text-neutral-900">37</span>
              <span className="text-[11px] text-gray-400">Cette semaine</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold text-brand">+14%</span>
              <span className="text-[11px] text-gray-400">vs sem. passée</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold text-neutral-900">14</span>
              <span className="text-[11px] text-gray-400">Pic (Jeudi)</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <span className="font-sora text-sm font-semibold text-neutral-900">
            Suivi des documents
          </span>
          <div className="flex flex-col gap-3.5">
            {[
              { label: 'Titres fonciers validés', count: '18 annonces', pct: 53, color: '#376BFF' },
              { label: 'En cours de vérification', count: '9 annonces', pct: 26, color: '#F59E0B' },
              { label: 'Documents manquants', count: '4 annonces', pct: 12, color: '#EF4444' },
              { label: 'Mandats signés', count: '22 annonces', pct: 65, color: '#10B981' },
            ].map((p) => (
              <div key={p.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-neutral-700">{p.label}</span>
                  <span className="text-xs font-semibold text-neutral-900">{p.count}</span>
                </div>
                <div className="h-[7px] w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.pct}%`, background: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MES ANNONCES — real data from /api/listings */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap lg:gap-3">
          <span className="font-sora w-full text-[15px] font-semibold text-neutral-900 lg:mr-auto lg:w-auto">
            Mes annonces
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-1.5 lg:min-w-[200px] lg:flex-none">
            <Search className="h-[14px] w-[14px] flex-shrink-0 text-gray-400" aria-hidden />
            <span className="truncate text-[13px] text-gray-400">
              <span className="lg:hidden">Rechercher…</span>
              <span className="hidden lg:inline">Rechercher une annonce…</span>
            </span>
          </div>
          <button
            type="button"
            disabled
            className="flex flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-[13px] font-medium text-gray-400 lg:px-3.5"
          >
            <SlidersHorizontal className="h-[14px] w-[14px]" aria-hidden />
            <span className="hidden lg:inline">Filtrer</span>
          </button>
          <button
            type="button"
            disabled
            title="Bientôt disponible — l'écran de publication n'est pas encore implémenté"
            className="flex flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-3.5 py-1.5 text-[13px] font-semibold text-white lg:px-4"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Publier</span>
            <span className="hidden lg:inline">Publier une annonce</span>
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Chargement…</p>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <p className="text-sm font-medium text-neutral-700">
              Aucune annonce pour l&apos;instant
            </p>
            <p className="max-w-xs text-xs text-gray-400">
              L&apos;écran de publication n&apos;est pas encore construit — cette table
              s&apos;affichera dès qu&apos;une annonce existera pour votre compte.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {[
                    { label: 'ID', mobileHidden: true },
                    { label: "Titre de l'annonce", mobileHidden: false },
                    { label: 'Localisation', mobileHidden: false },
                    { label: 'Type', mobileHidden: true },
                    { label: 'Prix', mobileHidden: false },
                    { label: 'Statut', mobileHidden: false },
                    { label: '', mobileHidden: false },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={cn(
                        'font-sora border-b border-black/[0.06] px-3.5 py-2 text-left text-[11px] font-semibold whitespace-nowrap text-gray-400 uppercase',
                        h.mobileHidden && 'hidden lg:table-cell',
                      )}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const st = STATUS_STYLE[l.status] ?? STATUS_STYLE.PENDING!;
                  return (
                    <tr key={l.id} className="border-b border-black/[0.06] last:border-0">
                      <td className="hidden px-3.5 py-3 text-xs text-gray-400 lg:table-cell">
                        #{l.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="max-w-[160px] truncate px-3.5 py-3 text-[13.5px] font-medium text-neutral-900 lg:max-w-[220px]">
                        {l.title}
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-neutral-700">
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <MapPin className="h-3 w-3 text-gray-400" aria-hidden />
                          {l.city}, {l.country}
                        </span>
                      </td>
                      <td className="hidden px-3.5 py-3 lg:table-cell">
                        <span className="rounded bg-gray-100 px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap text-neutral-700">
                          {PROPERTY_TYPE_LABEL[l.propertyType] ?? l.propertyType}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-[13.5px] font-semibold whitespace-nowrap text-neutral-900">
                        {formatListingPrice(l.price, l.currency)}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                            st.className,
                          )}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled
                            className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md bg-gray-100 text-gray-400"
                          >
                            <Eye className="h-[13px] w-[13px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled
                            className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md bg-gray-100 text-gray-400"
                          >
                            <Pencil className="h-[13px] w-[13px]" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
