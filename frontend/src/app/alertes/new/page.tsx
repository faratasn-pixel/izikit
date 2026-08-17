'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BellPlus,
  ChevronRight,
  Home,
  Building,
  Building2,
  Store,
  LandPlot,
  TreePine,
  House,
  PartyPopper,
  Presentation,
  Landmark,
  Tag,
  Key,
  CalendarCheck,
  BedDouble,
  Coins,
  Check,
  Mail,
  MessageSquare,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL } from '@/lib/listings';
import { cn } from '@/lib/utils';

type Transaction = 'VENTE' | 'LOCATION' | 'SEJOUR' | 'AUBERGE';
type Frequency = 'QUOTIDIENNE' | 'HEBDOMADAIRE';

const TRANSACTION_TYPE_ICON: Record<Transaction, typeof Home> = {
  VENTE: Tag,
  LOCATION: Key,
  SEJOUR: CalendarCheck,
  AUBERGE: BedDouble,
};

const TRANSACTION_OPTIONS: { key: Transaction; label: string; icon: typeof Home }[] = (
  Object.keys(TRANSACTION_TYPE_ICON) as Transaction[]
).map((key) => ({ key, label: TRANSACTION_TYPE_LABEL[key]!, icon: TRANSACTION_TYPE_ICON[key] }));

const PROPERTY_TYPE_ICON: Record<string, typeof Home> = {
  VILLA: Home,
  APPARTEMENT: Building,
  PARCELLE: LandPlot,
  DOMAINE: TreePine,
  MAISON: House,
  BOUTIQUE: Store,
  BUREAU: Building2,
  SALLE_FETE: PartyPopper,
  SALLE_CONFERENCE: Presentation,
  IMMEUBLE: Landmark,
};

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_ICON).map((key) => ({
  key,
  label: PROPERTY_TYPE_LABEL[key]!,
  icon: PROPERTY_TYPE_ICON[key]!,
}));

const FREQUENCY_OPTIONS: { key: Frequency; label: string }[] = [
  { key: 'QUOTIDIENNE', label: 'Quotidienne' },
  { key: 'HEBDOMADAIRE', label: 'Hebdomadaire' },
];

const COUNTRIES: { name: string; flag: string; cities: string[] }[] = [
  {
    name: 'Bénin',
    flag: '🇧🇯',
    cities: [
      'Cotonou',
      'Porto-Novo',
      'Parakou',
      'Abomey-Calavi',
      'Bohicon',
      'Djougou',
      'Natitingou',
      'Ouidah',
      'Lokossa',
      'Abomey',
    ],
  },
  {
    name: 'Togo',
    flag: '🇹🇬',
    cities: [
      'Lomé',
      'Sokodé',
      'Kara',
      'Kpalimé',
      'Atakpamé',
      'Dapaong',
      'Tsévié',
      'Aného',
      'Bassar',
      'Notsé',
    ],
  },
  {
    name: 'Sénégal',
    flag: '🇸🇳',
    cities: [
      'Dakar',
      'Thiès',
      'Touba',
      'Rufisque',
      'Saint-Louis',
      'Mbour',
      'Kaolack',
      'Ziguinchor',
      'Diourbel',
      'Louga',
    ],
  },
  {
    name: "Côte d'Ivoire",
    flag: '🇨🇮',
    cities: [
      'Abidjan',
      'Yamoussoukro',
      'Bouaké',
      'San-Pédro',
      'Korhogo',
      'Daloa',
      'Man',
      'Gagnoa',
      'Divo',
      'Anyama',
    ],
  },
];

export default function NouvelleAlertePage() {
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('Villas à Cocody, Abidjan');
  const [transaction, setTransaction] = useState<Transaction>('VENTE');
  const [types, setTypes] = useState<string[]>(['VILLA']);
  const [country, setCountry] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState(80_000_000);
  const [priceMax, setPriceMax] = useState(200_000_000);
  const [frequency, setFrequency] = useState<Frequency>('QUOTIDIENNE');
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);

  const PRICE_BOUND_MAX = 500_000_000;
  const PRICE_STEP = 5_000_000;
  const minPct = (priceMin / PRICE_BOUND_MAX) * 100;
  const maxPct = (priceMax / PRICE_BOUND_MAX) * 100;

  function formatFcfa(n: number) {
    return n.toLocaleString('fr-FR');
  }

  function parseFcfa(raw: string) {
    return Number(raw.replace(/\D/g, ''));
  }

  const selectedCountry = COUNTRIES.find((c) => c.name === country);
  const availableCities = selectedCountry?.cities ?? [];

  function handleCountryChange(value: string) {
    setCountry(value);
    const availableForNewCountry = COUNTRIES.find((c) => c.name === value)?.cities ?? [];
    setCities((prev) => prev.filter((c) => availableForNewCountry.includes(c)));
  }

  const hasPhone = Boolean(user?.phone);

  useEffect(() => {
    if (!hasPhone) {
      setNotifWhatsapp(false);
      setNotifSms(false);
    }
  }, [hasPhone]);

  if (!user) return null;

  const toggleType = (key: string) => {
    setTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  };

  const toggleCity = (c: string) => {
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  async function onCreate() {
    if (!name.trim()) {
      toast("Donnez un nom à l'alerte avant de la créer.", 'error');
      return;
    }
    if (types.length === 0) {
      toast('Sélectionnez au moins un type de bien.', 'error');
      return;
    }
    if (!country || cities.length === 0) {
      toast('Renseignez le pays et au moins une ville avant de créer l’alerte.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api('/api/alerts', {
        method: 'POST',
        body: {
          name: name.trim(),
          transactionType: transaction,
          propertyTypes: types,
          country,
          cities,
          priceMin,
          priceMax,
          frequency,
          notifWhatsapp,
          notifEmail,
          notifSms,
        },
      });
      toast('Alerte créée avec succès.', 'success');
      router.push('/alertes');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur réseau. Réessayez.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

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
      <div className="mb-6">
        <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
          Créer une nouvelle alerte secteur
        </h1>
        <p className="text-[13.5px] text-gray-400">
          Définissez vos critères et recevez des correspondances en temps réel.
        </p>
      </div>

      {/* FORM */}
      <div className="flex flex-col items-center">
        <div className="flex w-full max-w-3xl min-w-0 flex-col gap-5">
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
                <div className="flex flex-wrap gap-2">
                  {TRANSACTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTransaction(opt.key)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium',
                        transaction === opt.key
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-black/[0.08] bg-white text-neutral-700',
                      )}
                    >
                      <opt.icon className="h-[13px] w-[13px]" aria-hidden />
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
                <label
                  htmlFor="alert-country"
                  className="text-[12.5px] font-semibold text-neutral-900"
                >
                  Pays <span className="text-red-500">*</span>
                </label>
                <select
                  id="alert-country"
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  <option value="">Sélectionner un pays</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[12.5px] font-semibold text-neutral-900">
                  Ville(s) <span className="text-red-500">*</span>
                </span>
                {country ? (
                  <div className="flex flex-wrap gap-2">
                    {availableCities.map((c) => {
                      const selected = cities.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCity(c)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium',
                            selected
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-black/[0.08] bg-white text-neutral-700',
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[11.5px] text-gray-400">
                    Choisissez d&apos;abord un pays.
                  </span>
                )}
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
                    <Coins className="h-[13px] w-[13px] flex-shrink-0 text-gray-400" aria-hidden />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatFcfa(priceMin)}
                      onChange={(e) => {
                        const raw = parseFcfa(e.target.value);
                        if (Number.isFinite(raw)) setPriceMin(Math.min(raw, priceMax - PRICE_STEP));
                      }}
                      className="w-full bg-transparent focus:outline-none"
                    />
                  </div>
                  <span className="text-gray-400">—</span>
                  <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-neutral-900">
                    <Coins className="h-[13px] w-[13px] flex-shrink-0 text-gray-400" aria-hidden />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatFcfa(priceMax)}
                      onChange={(e) => {
                        const raw = parseFcfa(e.target.value);
                        if (Number.isFinite(raw)) setPriceMax(Math.max(raw, priceMin + PRICE_STEP));
                      }}
                      className="w-full bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div className="relative my-3 h-1">
                  <div className="absolute inset-0 rounded-full bg-black/[0.08]" />
                  <div
                    className="absolute h-full rounded-full bg-brand"
                    style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
                  />
                  <input
                    type="range"
                    aria-label="Prix minimum"
                    min={0}
                    max={PRICE_BOUND_MAX}
                    step={PRICE_STEP}
                    value={priceMin}
                    onChange={(e) =>
                      setPriceMin(Math.min(Number(e.target.value), priceMax - PRICE_STEP))
                    }
                    className="absolute top-1/2 h-4 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:bg-white"
                    style={{ pointerEvents: 'none' }}
                  />
                  <input
                    type="range"
                    aria-label="Prix maximum"
                    min={0}
                    max={PRICE_BOUND_MAX}
                    step={PRICE_STEP}
                    value={priceMax}
                    onChange={(e) =>
                      setPriceMax(Math.max(Number(e.target.value), priceMin + PRICE_STEP))
                    }
                    className="absolute top-1/2 h-4 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:bg-white"
                    style={{ pointerEvents: 'none' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>0 FCFA</span>
                  <span>500 000 000 FCFA</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Fréquence & notifications */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                5
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
                      key: 'whatsapp',
                      label: 'WhatsApp',
                      icon: MessageCircle,
                      on: notifWhatsapp,
                      set: setNotifWhatsapp,
                      requiresPhone: true,
                    },
                    {
                      key: 'email',
                      label: 'Email',
                      icon: Mail,
                      on: notifEmail,
                      set: setNotifEmail,
                      requiresPhone: false,
                    },
                    {
                      key: 'sms',
                      label: 'SMS',
                      icon: MessageSquare,
                      on: notifSms,
                      set: setNotifSms,
                      requiresPhone: true,
                    },
                  ].map((n) => {
                    const disabled = n.requiresPhone && !hasPhone;
                    return (
                      <button
                        key={n.key}
                        type="button"
                        disabled={disabled}
                        title={
                          disabled
                            ? 'Ajoutez un numéro de téléphone à votre profil pour activer ce canal'
                            : undefined
                        }
                        onClick={() => n.set(!n.on)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium',
                          disabled
                            ? 'cursor-not-allowed border-black/[0.08] bg-gray-50 text-gray-300'
                            : n.on
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-black/[0.08] bg-white text-neutral-700',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border-2',
                            n.on && !disabled ? 'border-brand bg-brand' : 'border-black/[0.15]',
                          )}
                        >
                          {n.on && !disabled && (
                            <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                          )}
                        </span>
                        <n.icon className="h-3.5 w-3.5" aria-hidden />
                        {n.label}
                      </button>
                    );
                  })}
                </div>
                {!hasPhone && (
                  <span className="text-[11.5px] text-gray-400">
                    Ajoutez un numéro de téléphone à votre profil pour activer WhatsApp et SMS.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SUBMIT */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void onCreate()}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-[14px] w-[14px] animate-spin" aria-hidden />
              ) : (
                <BellPlus className="h-[14px] w-[14px]" aria-hidden />
              )}
              Créer l&apos;alerte
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
