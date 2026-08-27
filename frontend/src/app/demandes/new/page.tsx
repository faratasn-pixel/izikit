'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Info,
  Ruler,
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
  Wallet,
  CreditCard,
  Layers,
  User,
  Users,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL, AMENITY_LABEL } from '@/lib/listings';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;
type PropertyType =
  | 'VILLA'
  | 'APPARTEMENT'
  | 'PARCELLE'
  | 'DOMAINE'
  | 'MAISON'
  | 'BOUTIQUE'
  | 'BUREAU'
  | 'SALLE_FETE'
  | 'SALLE_CONFERENCE'
  | 'IMMEUBLE';
type TransactionType = 'VENTE' | 'LOCATION' | 'SEJOUR' | 'AUBERGE';
type Priority = 'Urgent' | 'Normale' | 'Basse';
type Financing = 'Comptant' | 'Crédit' | 'Les deux';
type Delay = 'Immédiat' | '1–3 mois' | '3–6 mois' | 'Flexible';
type ClientType = 'Particulier' | 'Entreprise';

const PROPERTY_TYPE_ICON: Record<PropertyType, typeof Home> = {
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

const PROPERTY_TYPES: { key: PropertyType; icon: typeof Home }[] = (
  Object.keys(PROPERTY_TYPE_ICON) as PropertyType[]
).map((key) => ({ key, icon: PROPERTY_TYPE_ICON[key] }));

// PARCELLE/DOMAINE: bare land — no rooms, no seating capacity, just surface.
const LAND_PROPERTY_TYPES = new Set<PropertyType>(['PARCELLE', 'DOMAINE']);
// SALLE_FETE/SALLE_CONFERENCE: event halls — capacity (seats) instead of surface, no rooms.
const HALL_PROPERTY_TYPES = new Set<PropertyType>(['SALLE_FETE', 'SALLE_CONFERENCE']);

const TRANSACTION_TYPE_ICON: Record<TransactionType, typeof Home> = {
  VENTE: Tag,
  LOCATION: Key,
  SEJOUR: CalendarCheck,
  AUBERGE: BedDouble,
};

const TRANSACTION_TYPES = (Object.keys(TRANSACTION_TYPE_ICON) as TransactionType[]).map((key) => ({
  key,
  icon: TRANSACTION_TYPE_ICON[key],
}));

const PRIORITY_STYLE: Record<Priority, { dot: string; selected: string }> = {
  Urgent: { dot: 'bg-red-500', selected: 'border-red-500 bg-red-50 text-red-600' },
  Normale: { dot: 'bg-amber-500', selected: 'border-amber-500 bg-amber-50 text-amber-600' },
  Basse: { dot: 'bg-gray-400', selected: 'border-gray-400 bg-gray-100 text-gray-600' },
};

const BEDROOMS_OPTIONS = ['1 chambre', '2 chambres', '3 chambres', '4 chambres et plus'];
const SALONS_OPTIONS = ['1 salon', '2 salons', '3 salons et plus'];
const SOURCE_OPTIONS = [
  'Réseaux sociaux',
  'Recommandation',
  'Site web',
  'Visite en agence',
  'Autre',
];

const STEPS: { num: Step; label: string }[] = [
  { num: 1, label: 'Informations du bien' },
  { num: 2, label: 'Budget' },
  { num: 3, label: 'Contact' },
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

function OptionCard({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  icon: typeof Home;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-[100px] flex-col items-center gap-1.5 rounded-lg border-2 px-5 py-3.5 text-center',
        selected ? 'border-brand bg-brand/10' : 'border-black/[0.08] bg-white',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          selected ? 'bg-blue-100' : 'bg-gray-100',
        )}
      >
        <Icon className={cn('h-4 w-4', selected ? 'text-brand' : 'text-gray-400')} aria-hidden />
      </span>
      <span
        className={cn('text-[12.5px] font-semibold', selected ? 'text-brand' : 'text-neutral-700')}
      >
        {label}
      </span>
    </button>
  );
}

export default function NouvelleDemandePage() {
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Informations du bien
  const [propertyType, setPropertyType] = useState<PropertyType>('VILLA');
  const [transaction, setTransaction] = useState<TransactionType>('VENTE');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [surfaceMin, setSurfaceMin] = useState('');
  const [capacity, setCapacity] = useState('');
  const [bedrooms, setBedrooms] = useState(BEDROOMS_OPTIONS[1]!);
  const [salons, setSalons] = useState(SALONS_OPTIONS[0]!);
  const [amenities, setAmenities] = useState<string[]>(['AC', 'PARKING']);
  const [priority, setPriority] = useState<Priority>('Urgent');

  // Step 2 — Budget
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [financing, setFinancing] = useState<Financing>('Comptant');
  const [delay, setDelay] = useState<Delay>('Immédiat');

  // Step 3 — Contact
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientType, setClientType] = useState<ClientType>('Particulier');
  const [source, setSource] = useState(SOURCE_OPTIONS[0]!);

  const selectedCountry = COUNTRIES.find((c) => c.name === country);
  const availableCities = selectedCountry?.cities ?? [];

  function handleCountryChange(value: string) {
    setCountry(value);
    const cities = COUNTRIES.find((c) => c.name === value)?.cities ?? [];
    if (!cities.includes(city)) setCity('');
  }

  if (!user) return null;

  const toggleAmenity = (a: string) => {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const isLandType = LAND_PROPERTY_TYPES.has(propertyType);
  const isHallType = HALL_PROPERTY_TYPES.has(propertyType);
  const showRoomFields = !isLandType && !isHallType;
  const showSurfaceField = isLandType;
  const showCapacityField = isHallType;

  async function onCreate() {
    if (!country || !city) {
      toast('Renseignez le pays et la ville avant de créer la demande.', 'error');
      setStep(1);
      return;
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      toast('Renseignez le nom et le téléphone du client avant de créer la demande.', 'error');
      setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const surfaceNum = Number(surfaceMin);
      const capacityNum = Number(capacity);
      const budgetMinNum = Number(budgetMin);
      const budgetMaxNum = Number(budgetMax);

      await api('/api/requests', {
        method: 'POST',
        body: {
          transactionType: transaction,
          propertyType,
          country,
          city,
          ...(showRoomFields && { bedrooms, salons }),
          ...(showSurfaceField &&
            surfaceMin &&
            Number.isFinite(surfaceNum) &&
            surfaceNum > 0 && { surfaceM2: Math.round(surfaceNum) }),
          ...(showCapacityField &&
            capacity &&
            Number.isFinite(capacityNum) &&
            capacityNum > 0 && { capacity: Math.round(capacityNum) }),
          amenities,
          priority,
          ...(budgetMin &&
            Number.isFinite(budgetMinNum) &&
            budgetMinNum >= 0 && { budgetMin: Math.round(budgetMinNum) }),
          ...(budgetMax &&
            Number.isFinite(budgetMaxNum) &&
            budgetMaxNum >= 0 && { budgetMax: Math.round(budgetMaxNum) }),
          financing,
          delay,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          ...(clientEmail.trim() && { clientEmail: clientEmail.trim() }),
          clientType,
          source,
        },
      });
      toast('Demande créée avec succès.', 'success');
      router.push('/demandes');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur réseau. Réessayez.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell active="requests" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* HEADER */}
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[13px]">
            <Link href="/demandes" className="font-medium text-brand">
              Demande immobilière
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-400">Nouvelle demande</span>
          </div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Nouvelle demande
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Enregistrez les critères de recherche d&apos;un client ou prospect.
          </p>
        </div>
      </div>

      {/* STEPPER */}
      <div className="mb-7 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s.num} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
                  step > s.num
                    ? 'bg-brand text-white'
                    : step === s.num
                      ? 'bg-brand text-white ring-4 ring-blue-100'
                      : 'border-2 border-black/[0.08] bg-gray-100 text-gray-400',
                )}
              >
                {step > s.num ? <Check className="h-4 w-4" aria-hidden /> : s.num}
              </span>
              <span className="hidden flex-col sm:flex">
                <span className="text-[10.5px] font-medium text-gray-400">Étape {s.num}</span>
                <span
                  className={cn(
                    'text-[13px] font-semibold',
                    step >= s.num ? 'text-neutral-900' : 'text-gray-400',
                  )}
                >
                  {s.label}
                </span>
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn('mx-3 h-0.5 flex-1', step > s.num ? 'bg-brand' : 'bg-black/[0.08]')}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <div className="flex w-full max-w-3xl min-w-0 flex-col gap-4">
          {/* STEP 1 — INFORMATIONS DU BIEN */}
          {step === 1 && (
            <>
              <div className="mb-4 rounded-2xl bg-white p-7">
                <h2 className="font-sora mb-1 text-[15px] font-semibold text-neutral-900">
                  Type de bien recherché
                </h2>
                <p className="mb-5 text-xs text-gray-400">
                  Sélectionnez le type de bien et la nature de la transaction souhaitée.
                </p>

                <div className="mb-5">
                  <label className="mb-2 block text-[12.5px] font-semibold text-neutral-700">
                    Type de transaction <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {TRANSACTION_TYPES.map((t) => (
                      <OptionCard
                        key={t.key}
                        label={TRANSACTION_TYPE_LABEL[t.key]!}
                        icon={t.icon}
                        selected={transaction === t.key}
                        onClick={() => setTransaction(t.key)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12.5px] font-semibold text-neutral-700">
                    Type de bien <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {PROPERTY_TYPES.map((t) => (
                      <OptionCard
                        key={t.key}
                        label={PROPERTY_TYPE_LABEL[t.key]!}
                        icon={t.icon}
                        selected={propertyType === t.key}
                        onClick={() => setPropertyType(t.key)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-white p-7">
                <h2 className="font-sora mb-1 text-[15px] font-semibold text-neutral-900">
                  Localisation souhaitée
                </h2>
                <p className="mb-5 text-xs text-gray-400">
                  Indiquez la zone géographique ciblée par le client.
                </p>
                <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="req-country"
                      className="text-[12.5px] font-semibold text-neutral-700"
                    >
                      Pays <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="req-country"
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                    >
                      <option value="">Sélectionner un pays</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="req-city"
                      className="text-[12.5px] font-semibold text-neutral-700"
                    >
                      Ville <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="req-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!country}
                      className={cn(
                        'appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none',
                        !country && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <option value="">
                        {country ? 'Sélectionner une ville' : "Choisissez d'abord un pays"}
                      </option>
                      {availableCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-2xl bg-white p-7">
                <h2 className="font-sora mb-1 text-[15px] font-semibold text-neutral-900">
                  Caractéristiques du bien
                </h2>
                <p className="mb-5 text-xs text-gray-400">
                  Précisez les critères essentiels pour affiner la recherche.
                </p>

                {(showRoomFields || showSurfaceField || showCapacityField) && (
                  <div className="mb-4.5 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                    {showRoomFields && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="req-bedrooms"
                            className="text-[12.5px] font-semibold text-neutral-700"
                          >
                            Nombre de chambres
                          </label>
                          <select
                            id="req-bedrooms"
                            value={bedrooms}
                            onChange={(e) => setBedrooms(e.target.value)}
                            className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                          >
                            {BEDROOMS_OPTIONS.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="req-salons"
                            className="text-[12.5px] font-semibold text-neutral-700"
                          >
                            Nombre de salon
                          </label>
                          <select
                            id="req-salons"
                            value={salons}
                            onChange={(e) => setSalons(e.target.value)}
                            className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                          >
                            {SALONS_OPTIONS.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    {showSurfaceField && (
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="req-surface"
                          className="text-[12.5px] font-semibold text-neutral-700"
                        >
                          Superficie min. (m²)
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5">
                          <Ruler className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                          <input
                            id="req-surface"
                            type="text"
                            inputMode="numeric"
                            value={surfaceMin}
                            onChange={(e) => setSurfaceMin(e.target.value)}
                            placeholder="Ex: 150"
                            className="w-full bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                    {showCapacityField && (
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="req-capacity"
                          className="text-[12.5px] font-semibold text-neutral-700"
                        >
                          Nombre de places
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5">
                          <Users className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                          <input
                            id="req-capacity"
                            type="text"
                            inputMode="numeric"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            placeholder="Ex: 200"
                            className="w-full bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-4.5 h-px bg-black/[0.06]" />

                <div className="mb-4.5">
                  <label className="mb-2 block text-[12.5px] font-semibold text-neutral-700">
                    Équipements souhaités
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(AMENITY_LABEL).map(([key, label]) => {
                      const selected = amenities.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleAmenity(key)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-medium',
                            selected
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-black/[0.08] bg-white text-neutral-700',
                          )}
                        >
                          {selected && <Check className="h-2.5 w-2.5" aria-hidden />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4.5">
                  <label className="mb-2 block text-[12.5px] font-semibold text-neutral-700">
                    Priorité de la demande <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {(['Urgent', 'Normale', 'Basse'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-[12.5px] font-semibold',
                          priority === p
                            ? PRIORITY_STYLE[p].selected
                            : 'border-black/[0.08] bg-white text-neutral-700',
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', PRIORITY_STYLE[p].dot)} />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — BUDGET */}
          {step === 2 && (
            <div className="mb-4 rounded-2xl bg-white p-7">
              <h2 className="font-sora mb-1 text-[15px] font-semibold text-neutral-900">
                Budget du client
              </h2>
              <p className="mb-5 text-xs text-gray-400">
                Précisez la fourchette budgétaire et les modalités de financement.
              </p>

              <div className="mb-4.5 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="req-budget-min"
                    className="text-[12.5px] font-semibold text-neutral-700"
                  >
                    Budget minimum (FCFA)
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5">
                    <Wallet className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                    <input
                      id="req-budget-min"
                      type="text"
                      inputMode="numeric"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      placeholder="Ex: 50 000 000"
                      className="w-full bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="req-budget-max"
                    className="text-[12.5px] font-semibold text-neutral-700"
                  >
                    Budget maximum (FCFA)
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5">
                    <Wallet className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                    <input
                      id="req-budget-max"
                      type="text"
                      inputMode="numeric"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      placeholder="Ex: 150 000 000"
                      className="w-full bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4.5 h-px bg-black/[0.06]" />

              <div className="mb-4.5">
                <label className="mb-2 block text-[12.5px] font-semibold text-neutral-700">
                  Mode de financement
                </label>
                <div className="flex flex-wrap gap-2.5">
                  <OptionCard
                    label="Comptant"
                    icon={Wallet}
                    selected={financing === 'Comptant'}
                    onClick={() => setFinancing('Comptant')}
                  />
                  <OptionCard
                    label="Crédit"
                    icon={CreditCard}
                    selected={financing === 'Crédit'}
                    onClick={() => setFinancing('Crédit')}
                  />
                  <OptionCard
                    label="Les deux"
                    icon={Layers}
                    selected={financing === 'Les deux'}
                    onClick={() => setFinancing('Les deux')}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="req-delay" className="text-[12.5px] font-semibold text-neutral-700">
                  Délai de recherche souhaité
                </label>
                <select
                  id="req-delay"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value as Delay)}
                  className="max-w-[240px] appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {(['Immédiat', '1–3 mois', '3–6 mois', 'Flexible'] as Delay[]).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 3 — CONTACT */}
          {step === 3 && (
            <div className="mb-4 rounded-2xl bg-white p-7">
              <h2 className="font-sora mb-1 text-[15px] font-semibold text-neutral-900">
                Coordonnées du client
              </h2>
              <p className="mb-5 text-xs text-gray-400">
                Ces informations servent à recontacter le client dès qu&apos;une correspondance
                existe.
              </p>

              <div className="mb-4.5 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label
                    htmlFor="req-client-name"
                    className="text-[12.5px] font-semibold text-neutral-700"
                  >
                    Nom du client <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="req-client-name"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Aïcha Koné"
                    className="rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="req-client-phone"
                    className="text-[12.5px] font-semibold text-neutral-700"
                  >
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="req-client-phone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="req-client-email"
                    className="text-[12.5px] font-semibold text-neutral-700"
                  >
                    Email
                  </label>
                  <input
                    id="req-client-email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@email.com"
                    className="rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="mb-4.5 h-px bg-black/[0.06]" />

              <div className="mb-4.5">
                <label className="mb-2 block text-[12.5px] font-semibold text-neutral-700">
                  Type de client
                </label>
                <div className="flex flex-wrap gap-2.5">
                  <OptionCard
                    label="Particulier"
                    icon={User}
                    selected={clientType === 'Particulier'}
                    onClick={() => setClientType('Particulier')}
                  />
                  <OptionCard
                    label="Entreprise"
                    icon={Briefcase}
                    selected={clientType === 'Entreprise'}
                    onClick={() => setClientType('Entreprise')}
                  />
                </div>
              </div>

              <div className="mb-4.5 flex flex-col gap-1.5">
                <label
                  htmlFor="req-source"
                  className="text-[12.5px] font-semibold text-neutral-700"
                >
                  Comment nous a-t-il connu ?
                </label>
                <select
                  id="req-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="max-w-[260px] appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* FOOTER BAR */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-5">
            <div className="flex items-center gap-1.5">
              <Info className="h-[14px] w-[14px] text-gray-400" aria-hidden />
              <span className="text-[12.5px] text-gray-400">
                Les champs marqués <span className="text-red-500">*</span> sont obligatoires
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as Step)}
                    className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-semibold text-neutral-700"
                  >
                    <ArrowLeft className="h-[14px] w-[14px]" aria-hidden />
                    Étape précédente
                  </button>
                )}
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-semibold text-gray-400"
                >
                  Enregistrer en brouillon
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s + 1) as Step)}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
                  >
                    Continuer — {step === 1 ? 'Budget' : 'Contact'}
                    <ArrowRight className="h-[14px] w-[14px]" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onCreate()}
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting && (
                      <Loader2 className="h-[14px] w-[14px] animate-spin" aria-hidden />
                    )}
                    Créer la demande
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
