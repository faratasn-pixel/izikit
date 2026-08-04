'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  X,
  BellPlus,
  ChevronRight,
  Home,
  Building,
  Warehouse,
  Building2,
  Store,
  MapPin,
  Coins,
  ChevronDown,
  Check,
  Bell,
  Mail,
  MessageSquare,
  Zap,
  Info,
  Sparkles,
  Eye,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';

type Transaction = 'VENTE' | 'LOCATION' | 'LES_DEUX';
type Frequency = 'IMMEDIATE' | 'QUOTIDIENNE' | 'HEBDOMADAIRE' | 'MENSUELLE';

const TRANSACTION_OPTIONS: { key: Transaction; label: string }[] = [
  { key: 'VENTE', label: 'Vente' },
  { key: 'LOCATION', label: 'Location' },
  { key: 'LES_DEUX', label: 'Les deux' },
];

const TRANSACTION_LABEL: Record<Transaction, string> = {
  VENTE: 'Vente',
  LOCATION: 'Location',
  LES_DEUX: 'Vente ou location',
};

const PROPERTY_TYPES = [
  { key: 'villa', label: 'Villa', icon: Home },
  { key: 'appartement', label: 'Appartement', icon: Building },
  { key: 'terrain', label: 'Terrain', icon: Warehouse },
  { key: 'bureau', label: 'Bureau', icon: Building2 },
  { key: 'local', label: 'Local commercial', icon: Store },
  { key: 'studio', label: 'Studio', icon: Home },
] as const;

const FREQUENCY_OPTIONS: { key: Frequency; label: string }[] = [
  { key: 'IMMEDIATE', label: 'Immédiate' },
  { key: 'QUOTIDIENNE', label: 'Quotidienne' },
  { key: 'HEBDOMADAIRE', label: 'Hebdomadaire' },
  { key: 'MENSUELLE', label: 'Mensuelle' },
];

const ROOMS_OPTIONS = [
  '1 pièce et plus',
  '2 pièces et plus',
  '3 pièces et plus',
  '4 pièces et plus',
];
const RADIUS_OPTIONS = ['1 km autour', '5 km autour', '10 km autour', '20 km autour'];
const MAX_ALERTS_OPTIONS = ['Illimité', '1 par jour', '3 par jour', '5 par jour', '10 par jour'];

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={label}
      className={cn(
        'relative h-5 w-9 flex-shrink-0 rounded-full transition-colors',
        on ? 'bg-brand' : 'bg-gray-300',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition-all',
          on ? 'right-[3px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}

export default function NouvelleAlertePage() {
  const user = useUser();

  const [name, setName] = useState('Villas à Cocody, Abidjan');
  const [transaction, setTransaction] = useState<Transaction>('VENTE');
  const [types, setTypes] = useState<string[]>(['villa']);
  const [country] = useState("Côte d'Ivoire");
  const [countryFlag] = useState('🇨🇮');
  const [city, setCity] = useState('Abidjan');
  const [zone, setZone] = useState('Cocody');
  const [radius, setRadius] = useState(RADIUS_OPTIONS[1]!);
  const [surfaceMin, setSurfaceMin] = useState('200');
  const [rooms, setRooms] = useState(ROOMS_OPTIONS[3]!);
  const [pool, setPool] = useState(true);
  const [security, setSecurity] = useState(true);
  const [furnished, setFurnished] = useState(false);
  const [landTitle, setLandTitle] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>('IMMEDIATE');
  const [notifApp, setNotifApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [maxPerDay, setMaxPerDay] = useState(MAX_ALERTS_OPTIONS[0]!);

  if (!user) return null;

  const toggleType = (key: string) => {
    setTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  };

  const criteriaChips = [
    pool && 'Piscine',
    security && 'Gardiennage',
    furnished && 'Meublé',
    landTitle && 'Titré',
  ].filter(Boolean) as string[];

  return (
    <DashboardShell active="alerts" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* BREADCRUMB */}
      <div className="mb-4 flex items-center gap-1.5 text-[13px]">
        <Link href="/alertes" className="text-gray-400 hover:text-neutral-700">
          Alerte secteur
        </Link>
        <ChevronRight className="h-[13px] w-[13px] text-gray-400" aria-hidden />
        <span className="font-semibold text-neutral-900">Nouvelle alerte</span>
      </div>

      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Créer une nouvelle alerte secteur
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Définissez vos critères et recevez des correspondances en temps réel.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2.5">
          <Link
            href="/alertes"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-medium text-gray-400 hover:text-neutral-700"
          >
            <X className="h-[14px] w-[14px]" aria-hidden />
            Annuler
          </Link>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            <BellPlus className="h-[14px] w-[14px]" aria-hidden />
            Créer l&apos;alerte
          </button>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_320px]">
        {/* LEFT: FORM */}
        <div className="flex flex-col gap-5">
          {/* 1. Informations générales */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                1
              </span>
              Informations générales
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="alert-name"
                  className="text-[12.5px] font-semibold text-neutral-900"
                >
                  Nom de l&apos;alerte <span className="text-red-500">*</span>
                </label>
                <input
                  id="alert-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                />
                <span className="text-[11.5px] text-gray-400">
                  Donnez un nom mémorable à cette alerte.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-neutral-900">
                  Type de transaction <span className="text-red-500">*</span>
                </span>
                <div className="flex w-fit overflow-hidden rounded-lg border border-black/[0.08]">
                  {TRANSACTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTransaction(opt.key)}
                      className={cn(
                        'px-5 py-2.5 text-[13px] font-medium',
                        transaction === opt.key
                          ? 'bg-brand font-semibold text-white'
                          : 'bg-white text-gray-400',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Type de bien */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                2
              </span>
              Type de bien
            </h2>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((t) => {
                const selected = types.includes(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleType(t.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium',
                      selected
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-black/[0.08] bg-white text-neutral-700',
                    )}
                  >
                    <t.icon className="h-[13px] w-[13px]" aria-hidden />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Localisation */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                3
              </span>
              Localisation
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-neutral-900">
                  Pays <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px]">
                  <span className="flex items-center gap-2">
                    <span>{countryFlag}</span>
                    <span className="text-neutral-900">{country}</span>
                  </span>
                  <ChevronDown className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="alert-city"
                  className="text-[12.5px] font-semibold text-neutral-900"
                >
                  Ville <span className="text-red-500">*</span>
                </label>
                <select
                  id="alert-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {['Abidjan', 'Bouaké', 'San-Pédro', 'Yamoussoukro'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="alert-zone"
                  className="text-[12.5px] font-semibold text-neutral-900"
                >
                  Quartier / Zone
                </label>
                <select
                  id="alert-zone"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {['Cocody', 'Marcory', 'Plateau', 'Riviera', 'Yopougon'].map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="alert-radius"
                  className="text-[12.5px] font-semibold text-neutral-900"
                >
                  Rayon de recherche
                </label>
                <select
                  id="alert-radius"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {RADIUS_OPTIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 4. Budget & superficie */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                4
              </span>
              Budget &amp; superficie
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-neutral-900">
                  Fourchette de prix (FCFA)
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900">
                    <Coins className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                    80 000 000
                  </div>
                  <span className="text-gray-400">—</span>
                  <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900">
                    <Coins className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                    200 000 000
                  </div>
                </div>
                <div className="relative my-1.5 h-1 rounded-full bg-black/[0.08]">
                  <div className="absolute top-0 left-[18%] right-[28%] h-full rounded-full bg-brand" />
                  <div className="absolute top-1/2 left-[18%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-white" />
                  <div className="absolute top-1/2 left-[72%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-white" />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>0 FCFA</span>
                  <span>500 000 000 FCFA</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="alert-surface"
                    className="text-[12.5px] font-semibold text-neutral-900"
                  >
                    Superficie minimale (m²)
                  </label>
                  <div className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5">
                    <input
                      id="alert-surface"
                      type="text"
                      inputMode="numeric"
                      value={surfaceMin}
                      onChange={(e) => setSurfaceMin(e.target.value)}
                      className="w-full bg-transparent text-[13px] text-neutral-900 focus:outline-none"
                    />
                    <span className="text-xs text-gray-400">m²</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="alert-rooms"
                    className="text-[12.5px] font-semibold text-neutral-900"
                  >
                    Nombre de pièces min.
                  </label>
                  <select
                    id="alert-rooms"
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                    className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                  >
                    {ROOMS_OPTIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Critères supplémentaires */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                5
              </span>
              Critères supplémentaires
            </h2>
            <div className="flex flex-col">
              {[
                {
                  label: 'Piscine',
                  desc: 'Uniquement les biens avec piscine',
                  on: pool,
                  set: setPool,
                },
                {
                  label: 'Gardiennage / Sécurité',
                  desc: 'Résidence avec gardien ou vigile',
                  on: security,
                  set: setSecurity,
                },
                {
                  label: 'Meublé',
                  desc: 'Biens proposés meublés uniquement',
                  on: furnished,
                  set: setFurnished,
                },
                {
                  label: 'Titre foncier disponible',
                  desc: 'Uniquement les biens avec documents légaux',
                  on: landTitle,
                  set: setLandTitle,
                },
              ].map((c, i) => (
                <div key={c.label}>
                  {i > 0 && <div className="h-px bg-black/[0.06]" />}
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-[13.5px] font-medium text-neutral-900">{c.label}</p>
                      <p className="text-xs text-gray-400">{c.desc}</p>
                    </div>
                    <Toggle on={c.on} onToggle={() => c.set(!c.on)} label={c.label} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Fréquence & notifications */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                6
              </span>
              Fréquence &amp; notifications
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-neutral-900">
                  Fréquence de notification
                </span>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCY_OPTIONS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFrequency(f.key)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium',
                        frequency === f.key
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-black/[0.08] bg-white text-neutral-700',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border-2',
                          frequency === f.key ? 'border-brand bg-brand' : 'border-black/[0.15]',
                        )}
                      >
                        {frequency === f.key && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-neutral-900">
                  Canaux de notification
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    {
                      key: 'app',
                      label: 'Notification app',
                      icon: Bell,
                      on: notifApp,
                      set: setNotifApp,
                    },
                    {
                      key: 'email',
                      label: 'Email',
                      icon: Mail,
                      on: notifEmail,
                      set: setNotifEmail,
                    },
                    {
                      key: 'sms',
                      label: 'SMS',
                      icon: MessageSquare,
                      on: notifSms,
                      set: setNotifSms,
                    },
                  ].map((n) => (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => n.set(!n.on)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium',
                        n.on
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-black/[0.08] bg-white text-neutral-700',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border-2',
                          n.on ? 'border-brand bg-brand' : 'border-black/[0.15]',
                        )}
                      >
                        {n.on && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                      </span>
                      <n.icon className="h-3.5 w-3.5" aria-hidden />
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="alert-max" className="text-[12.5px] font-semibold text-neutral-900">
                  Nombre maximum d&apos;alertes par jour
                </label>
                <select
                  id="alert-max"
                  value={maxPerDay}
                  onChange={(e) => setMaxPerDay(e.target.value)}
                  className="max-w-[220px] appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {MAX_ALERTS_OPTIONS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW (mobile: below form; desktop: sticky rail) */}
        <div className="order-last flex flex-col gap-5 lg:sticky lg:top-6">
          {/* Summary preview */}
          <div className="rounded-2xl border border-dashed border-black/[0.08] bg-white p-5">
            <h3 className="font-sora mb-3.5 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
                <Eye className="h-4 w-4 text-brand" aria-hidden />
              </span>
              Aperçu de l&apos;alerte
            </h3>

            <p className="mb-1 text-[13.5px] font-semibold text-neutral-900">
              {name || 'Nom de l’alerte'}
            </p>
            <p className="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
              <span>{countryFlag}</span> {country} · {TRANSACTION_LABEL[transaction]}
            </p>

            <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-gray-400 uppercase">
              Type de bien
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {types.length === 0 ? (
                <span className="text-[12.5px] text-gray-400 italic">Aucun type sélectionné</span>
              ) : (
                types.map((t) => {
                  const def = PROPERTY_TYPES.find((p) => p.key === t)!;
                  return (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2.5 py-[3px] text-[11.5px] font-medium text-brand"
                    >
                      <def.icon className="h-2.5 w-2.5" aria-hidden />
                      {def.label}
                    </span>
                  );
                })
              )}
            </div>

            <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-gray-400 uppercase">
              Localisation
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2.5 py-[3px] text-[11.5px] font-medium text-brand">
                <MapPin className="h-2.5 w-2.5" aria-hidden />
                {zone}, {city}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-[3px] text-[11.5px] font-medium text-neutral-700">
                Rayon {radius.replace(' autour', '')}
              </span>
            </div>

            <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-gray-400 uppercase">
              Budget
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2.5 py-[3px] text-[11.5px] font-medium text-brand">
                <Coins className="h-2.5 w-2.5" aria-hidden />
                80M – 200M FCFA
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-[3px] text-[11.5px] font-medium text-neutral-700">
                {surfaceMin}m²+
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-[3px] text-[11.5px] font-medium text-neutral-700">
                {rooms}
              </span>
            </div>

            <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-gray-400 uppercase">
              Critères
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {criteriaChips.length === 0 ? (
                <span className="text-[12.5px] text-gray-400 italic">Aucun critère</span>
              ) : (
                criteriaChips.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2.5 py-[3px] text-[11.5px] font-medium text-brand"
                  >
                    {c}
                  </span>
                ))
              )}
            </div>

            <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-gray-400 uppercase">
              Notifications
            </p>
            <div className="flex flex-wrap gap-1.5">
              {notifApp && (
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-[3px] text-[11.5px] font-medium text-neutral-700">
                  <Bell className="h-2.5 w-2.5" aria-hidden />
                  App
                </span>
              )}
              {notifEmail && (
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-[3px] text-[11.5px] font-medium text-neutral-700">
                  <Mail className="h-2.5 w-2.5" aria-hidden />
                  Email
                </span>
              )}
              {notifSms && (
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-[3px] text-[11.5px] font-medium text-neutral-700">
                  <MessageSquare className="h-2.5 w-2.5" aria-hidden />
                  SMS
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2.5 py-[3px] text-[11.5px] font-medium text-brand">
                <Zap className="h-2.5 w-2.5" aria-hidden />
                {FREQUENCY_OPTIONS.find((f) => f.key === frequency)!.label}
              </span>
            </div>
          </div>

          {/* Estimated matches */}
          <div className="rounded-2xl bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-emerald-100">
                <Sparkles className="h-[15px] w-[15px] text-emerald-800" aria-hidden />
              </span>
              <span className="text-[13px] font-semibold text-neutral-900">Estimations</span>
            </div>
            <p className="font-sora mb-1 text-2xl font-bold text-neutral-900">34</p>
            <p className="mb-3 text-[12.5px] text-gray-400">
              annonces correspondent actuellement à vos critères
            </p>
            <div className="mb-3 h-px bg-black/[0.06]" />
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <Info className="h-[13px] w-[13px] flex-shrink-0" aria-hidden />
              Nouvelles annonces estimées :{' '}
              <strong className="font-semibold text-neutral-900">~5/semaine</strong>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-brand/40 px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              <BellPlus className="h-[14px] w-[14px]" aria-hidden />
              Créer l&apos;alerte
            </button>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-semibold text-gray-400"
            >
              <Eye className="h-[14px] w-[14px]" aria-hidden />
              Voir les correspondances
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
