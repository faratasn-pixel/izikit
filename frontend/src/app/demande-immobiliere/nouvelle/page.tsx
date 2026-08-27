'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Ruler,
  Tag,
  Key,
  CalendarCheck,
  BedDouble,
  Home,
  Building,
  Building2,
  LandPlot,
  TreePine,
  House,
  Store,
  PartyPopper,
  Presentation,
  Landmark,
  Wallet,
  WalletCards,
  CreditCard,
  Layers,
  Mail,
  Phone,
  User,
  Briefcase,
  Users,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { COUNTRIES } from '@/lib/countries';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL, AMENITY_LABEL } from '@/lib/listings';

type Step = 1 | 2 | 3;
type Priority = 'Urgent' | 'Normale' | 'Basse';
type Transaction = 'VENTE' | 'LOCATION' | 'SEJOUR' | 'AUBERGE';
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
type Financing = 'Comptant' | 'Crédit' | 'Les deux';
type Delay = 'Immédiat' | '1–3 mois' | '3–6 mois' | 'Flexible';
type ClientType = 'Particulier' | 'Entreprise';

// PARCELLE/DOMAINE: bare land — no rooms, just surface.
const LAND_PROPERTY_TYPES = new Set<PropertyType>(['PARCELLE', 'DOMAINE']);
// SALLE_FETE/SALLE_CONFERENCE: event halls — no rooms either.
const HALL_PROPERTY_TYPES = new Set<PropertyType>(['SALLE_FETE', 'SALLE_CONFERENCE']);

const TRANSACTION_TYPE_ICON: Record<Transaction, typeof Home> = {
  VENTE: Tag,
  LOCATION: Key,
  SEJOUR: CalendarCheck,
  AUBERGE: BedDouble,
};

const TRANSACTION_TYPES = (Object.keys(TRANSACTION_TYPE_ICON) as Transaction[]).map((key) => ({
  key,
  icon: TRANSACTION_TYPE_ICON[key],
}));

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

const PROPERTY_TYPES = (Object.keys(PROPERTY_TYPE_ICON) as PropertyType[]).map((key) => ({
  key,
  icon: PROPERTY_TYPE_ICON[key],
}));

const PRIORITY_STYLE: Record<Priority, { dot: string; selected: string }> = {
  Urgent: { dot: 'bg-red-500', selected: 'border-red-500 bg-red-50 text-red-600' },
  Normale: { dot: 'bg-amber-500', selected: 'border-amber-500 bg-amber-50 text-amber-600' },
  Basse: { dot: 'bg-gray-400', selected: 'border-gray-400 bg-gray-100 text-gray-600' },
};

const BEDROOMS_OPTIONS = ['1 chambre', '2 chambres', '3 chambres', '4 chambres et plus'];
const SALONS_OPTIONS = ['1 salon', '2 salons', '3 salons et plus'];

const FINANCEMENTS: { key: Financing; icon: typeof Wallet }[] = [
  { key: 'Comptant', icon: Wallet },
  { key: 'Crédit', icon: CreditCard },
  { key: 'Les deux', icon: Layers },
];

const DELAY_OPTIONS: Delay[] = ['Immédiat', '1–3 mois', '3–6 mois', 'Flexible'];

const SOURCE_OPTIONS = [
  'Réseaux sociaux',
  'Recommandation',
  'Site web',
  'Visite en agence',
  'Autre',
];

function StepCircle({ state, num }: { state: 'done' | 'active' | 'pending'; num: number }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
        state === 'done' && 'bg-brand text-white',
        state === 'active' && 'bg-brand text-white ring-4 ring-brand/18',
        state === 'pending' && 'border-2 border-black/[0.08] bg-gray-100 text-gray-400',
      )}
    >
      {state === 'done' ? <Check className="h-4 w-4" aria-hidden /> : num}
    </div>
  );
}

function Pill({
  selected,
  onClick,
  icon: Icon,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: typeof Tag;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border-[1.5px] px-[18px] py-2.5 text-sm font-medium whitespace-nowrap',
        selected
          ? 'border-brand bg-brand/10 font-bold text-brand'
          : 'border-black/[0.1] bg-white text-neutral-900',
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </button>
  );
}

function CheckOption({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border-[1.5px] px-3.5 py-2.5 text-left text-[13px] font-medium',
        checked
          ? 'border-brand bg-brand/[0.08] font-semibold text-brand'
          : 'border-black/[0.1] bg-white text-neutral-900',
      )}
    >
      <span
        className={cn(
          'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border-2',
          checked ? 'border-brand bg-brand' : 'border-black/[0.15]',
        )}
      >
        {checked && <Check className="h-[11px] w-[11px] text-white" aria-hidden />}
      </span>
      {children}
    </button>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-neutral-900">
      {children} {required && <span className="text-brand">*</span>}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5 text-sm outline-none"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
    </div>
  );
}

export default function NouvelleDemandePage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [transaction, setTransaction] = useState<Transaction>('VENTE');
  const [propertyType, setPropertyType] = useState<PropertyType>('VILLA');
  const [pays, setPays] = useState("Côte d'Ivoire");
  const [ville, setVille] = useState('Abidjan');
  const [surfaceMin, setSurfaceMin] = useState('');
  const [capacity, setCapacity] = useState('');
  const [chambres, setChambres] = useState(BEDROOMS_OPTIONS[1]!);
  const [salons, setSalons] = useState(SALONS_OPTIONS[0]!);
  const [equipements, setEquipements] = useState<string[]>(['POOL', 'PARKING']);
  const [priority, setPriority] = useState<Priority>('Normale');

  // Step 2
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [financing, setFinancing] = useState<Financing>('Comptant');
  const [delay, setDelay] = useState<Delay>('Immédiat');

  // Step 3
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [clientType, setClientType] = useState<ClientType>('Particulier');
  const [source, setSource] = useState(SOURCE_OPTIONS[0]!);
  const [consentContact, setConsentContact] = useState(false);
  const [consentData, setConsentData] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const availableCities = COUNTRIES.find((c) => c.name === pays)?.cities ?? [];
  const isLandType = LAND_PROPERTY_TYPES.has(propertyType);
  const isHallType = HALL_PROPERTY_TYPES.has(propertyType);
  const showRoomField = !isLandType && !isHallType;
  const showSurfaceField = isLandType;
  const showCapacityField = isHallType;

  function handleCountryChange(value: string) {
    setPays(value);
    const cities = COUNTRIES.find((c) => c.name === value)?.cities ?? [];
    if (!cities.includes(ville)) setVille(cities[0] ?? '');
  }

  function toggleFrom(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function stepState(n: Step): 'done' | 'active' | 'pending' {
    if (n < step) return 'done';
    if (n === step) return 'active';
    return 'pending';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentContact || !consentData) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const surfaceMinNum = Number(surfaceMin);
      const capacityNum = Number(capacity);
      const budgetMinNum = Number(budgetMin);
      const budgetMaxNum = Number(budgetMax);

      await api('/api/public/property-requests', {
        method: 'POST',
        body: {
          transactionType: transaction,
          propertyType,
          country: pays,
          city: ville,
          ...(showRoomField && { bedrooms: chambres, salons }),
          ...(showSurfaceField &&
            surfaceMin &&
            Number.isFinite(surfaceMinNum) &&
            surfaceMinNum > 0 && { surfaceMin: Math.round(surfaceMinNum) }),
          ...(showCapacityField &&
            capacity &&
            Number.isFinite(capacityNum) &&
            capacityNum > 0 && { capacity: Math.round(capacityNum) }),
          amenities: equipements,
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
          clientPhone: telephone.trim(),
          ...(email.trim() && { clientEmail: email.trim() }),
          clientType,
          source,
        },
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && err.status === 429
          ? 'Trop de demandes envoyées. Réessayez plus tard.'
          : "Échec de l'envoi. Réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white text-neutral-900">
      <PublicNavbar active="demande" />

      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1280px] px-4 pt-5 lg:px-7">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
          <Link href="/" className="text-gray-500">
            Accueil
          </Link>
          <ChevronRight className="h-[13px] w-[13px]" aria-hidden />
          <Link href="/demande-immobiliere" className="text-gray-500">
            Demande immobilière
          </Link>
          <ChevronRight className="h-[13px] w-[13px]" aria-hidden />
          <span className="font-semibold text-neutral-900">Déposer une demande</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 py-8 pb-[72px] lg:px-7">
        {/* TITLE */}
        <div className="mb-7">
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-brand uppercase">
            Nouvelle demande
          </p>
          <h1 className="font-sora mb-1.5 text-[26px] font-extrabold tracking-[-0.04em] lg:text-[32px]">
            Déposez votre demande <span className="text-brand italic">immobilière</span>
          </h1>
          <p className="text-sm text-gray-500">
            Remplissez les 3 étapes ci-dessous. Un agent certifié vous contactera sous 48h.
          </p>
        </div>

        {/* STEPS BAR */}
        <div className="mb-9 flex items-center">
          {[
            { n: 1 as Step, label: 'Bien recherché', sub: 'Type, lieu, critères' },
            { n: 2 as Step, label: 'Budget', sub: 'Fourchette de prix' },
            { n: 3 as Step, label: 'Contact', sub: 'Vos coordonnées' },
          ].map((s, i, arr) => (
            <div key={s.n} className={cn('flex items-center', i < arr.length - 1 && 'flex-1')}>
              <div className="flex items-center gap-3">
                <StepCircle state={stepState(s.n)} num={s.n} />
                <div className="hidden sm:block">
                  <p
                    className={cn(
                      'text-[13px] font-semibold whitespace-nowrap',
                      stepState(s.n) === 'pending' ? 'text-gray-400' : 'text-neutral-900',
                    )}
                  >
                    {s.label}
                  </p>
                  <p className="text-xs whitespace-nowrap text-gray-400">{s.sub}</p>
                </div>
              </div>
              {i < arr.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1',
                    stepState(s.n) === 'done' ? 'bg-brand' : 'bg-black/[0.08]',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* FORM (centered, no sidebar) */}
        <div className="mx-auto max-w-[760px]">
          {/* FORM CARD */}
          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 lg:p-9">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <Send className="h-5 w-5 text-emerald-600" aria-hidden />
                </div>
                <p className="text-base font-bold">Demande envoyée !</p>
                <p className="max-w-[360px] text-sm text-gray-500">
                  Merci, votre demande a bien été enregistrée. Un agent certifié Habitat-Afrik vous
                  contactera sous 48h.
                </p>
                <Link href="/" className="mt-2 text-sm font-semibold text-brand">
                  Retour à l&apos;accueil
                </Link>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <>
                    <h2 className="font-sora mb-1.5 text-[22px] font-extrabold tracking-[-0.03em]">
                      Étape 1 — Décrivez le bien recherché
                    </h2>
                    <p className="mb-8 text-sm text-gray-500">
                      Précisez le type de bien, la localisation et vos critères essentiels.
                    </p>

                    <div className="mb-6">
                      <FieldLabel required>Type de transaction</FieldLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {TRANSACTION_TYPES.map((t) => (
                          <Pill
                            key={t.key}
                            selected={transaction === t.key}
                            onClick={() => setTransaction(t.key)}
                            icon={t.icon}
                          >
                            {TRANSACTION_TYPE_LABEL[t.key]}
                          </Pill>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <FieldLabel required>Type de bien</FieldLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {PROPERTY_TYPES.map((t) => (
                          <Pill
                            key={t.key}
                            selected={propertyType === t.key}
                            onClick={() => setPropertyType(t.key)}
                            icon={t.icon}
                          >
                            {PROPERTY_TYPE_LABEL[t.key]}
                          </Pill>
                        ))}
                      </div>
                    </div>

                    <hr className="my-7 border-black/[0.06]" />

                    <div className="mb-6">
                      <FieldLabel required>Pays</FieldLabel>
                      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                        <Select value={pays} onChange={handleCountryChange}>
                          {COUNTRIES.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </Select>
                        <Select value={ville} onChange={setVille}>
                          {availableCities.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <hr className="my-7 border-black/[0.06]" />

                    {showSurfaceField && (
                      <div className="mb-6">
                        <FieldLabel>Superficie min. souhaitée (m²)</FieldLabel>
                        <div className="flex items-center gap-2 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                          <Ruler className="h-[15px] w-[15px] text-gray-400" aria-hidden />
                          <input
                            type="number"
                            min="0"
                            value={surfaceMin}
                            onChange={(e) => setSurfaceMin(e.target.value)}
                            placeholder="Ex : 150"
                            className="ml-1 w-full bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    )}

                    {showCapacityField && (
                      <div className="mb-6">
                        <FieldLabel>Nombre de places</FieldLabel>
                        <div className="flex items-center gap-2 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                          <Users className="h-[15px] w-[15px] text-gray-400" aria-hidden />
                          <input
                            type="number"
                            min="0"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            placeholder="Ex : 200"
                            className="ml-1 w-full bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    )}

                    {showRoomField && (
                      <div className="mb-6 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Chambres min.</FieldLabel>
                          <Select value={chambres} onChange={setChambres}>
                            {BEDROOMS_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <FieldLabel>Nombre de salon</FieldLabel>
                          <Select value={salons} onChange={setSalons}>
                            {SALONS_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    )}

                    <hr className="my-7 border-black/[0.06]" />

                    <div className="mb-6">
                      <FieldLabel>Équipements souhaités</FieldLabel>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {Object.entries(AMENITY_LABEL).map(([key, label]) => (
                          <CheckOption
                            key={key}
                            checked={equipements.includes(key)}
                            onClick={() => toggleFrom(equipements, setEquipements, key)}
                          >
                            {label}
                          </CheckOption>
                        ))}
                      </div>
                    </div>

                    <hr className="my-7 border-black/[0.06]" />

                    <div className="mb-2">
                      <FieldLabel required>Priorité de la demande</FieldLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {(['Urgent', 'Normale', 'Basse'] as Priority[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-[13px] font-semibold',
                              priority === p
                                ? PRIORITY_STYLE[p].selected
                                : 'border-black/[0.1] bg-white text-neutral-900',
                            )}
                          >
                            <span className={cn('h-2 w-2 rounded-full', PRIORITY_STYLE[p].dot)} />
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-4">
                      <Link
                        href="/demande-immobiliere"
                        className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-black/[0.1] px-[22px] py-2.5 text-sm font-semibold"
                      >
                        <ArrowLeft className="h-[15px] w-[15px]" aria-hidden />
                        Annuler
                      </Link>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 text-sm font-bold text-white"
                      >
                        Étape suivante : Budget
                        <ArrowRight className="h-[15px] w-[15px]" aria-hidden />
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="font-sora mb-1.5 text-[22px] font-extrabold tracking-[-0.03em]">
                      Étape 2 — Définissez votre budget
                    </h2>
                    <p className="mb-8 text-sm text-gray-500">
                      Indiquez votre enveloppe, votre niveau de flexibilité et votre calendrier
                      d&apos;acquisition.
                    </p>

                    <div className="mb-6">
                      <FieldLabel required>Quel est votre budget global ? (FCFA)</FieldLabel>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-1 items-center gap-2 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                          <Wallet className="h-[15px] w-[15px] text-gray-400" aria-hidden />
                          <span className="text-sm text-gray-500">Min</span>
                          <input
                            type="number"
                            min="0"
                            value={budgetMin}
                            onChange={(e) => setBudgetMin(e.target.value)}
                            placeholder="80000000"
                            className="ml-1 w-full bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-gray-400"
                          />
                        </div>
                        <span className="text-sm text-gray-400">—</span>
                        <div className="flex flex-1 items-center gap-2 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                          <WalletCards className="h-[15px] w-[15px] text-gray-400" aria-hidden />
                          <span className="text-sm text-gray-500">Max</span>
                          <input
                            type="number"
                            min="0"
                            value={budgetMax}
                            onChange={(e) => setBudgetMax(e.target.value)}
                            placeholder="200000000"
                            className="ml-1 w-full bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500">
                        Montants en FCFA, sans espace ni abréviation (ex : 80000000).
                      </p>
                    </div>

                    <div className="mb-6">
                      <FieldLabel required>Type de financement</FieldLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {FINANCEMENTS.map((f) => (
                          <Pill
                            key={f.key}
                            selected={financing === f.key}
                            onClick={() => setFinancing(f.key)}
                            icon={f.icon}
                          >
                            {f.key}
                          </Pill>
                        ))}
                      </div>
                    </div>

                    <hr className="my-7 border-black/[0.06]" />

                    <div className="mb-2 max-w-[260px]">
                      <FieldLabel>Délai de recherche souhaité</FieldLabel>
                      <Select value={delay} onChange={(v) => setDelay(v as Delay)}>
                        {DELAY_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-black/[0.1] px-[22px] py-2.5 text-sm font-semibold"
                      >
                        <ArrowLeft className="h-[15px] w-[15px]" aria-hidden />
                        Retour : Bien recherché
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 text-sm font-bold text-white"
                      >
                        Étape suivante : Contact
                        <ArrowRight className="h-[15px] w-[15px]" aria-hidden />
                      </button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <form onSubmit={submit}>
                    <h2 className="font-sora mb-1.5 text-[22px] font-extrabold tracking-[-0.03em]">
                      Étape 3 — Vos coordonnées
                    </h2>
                    <p className="mb-8 text-sm text-gray-500">
                      Ces informations restent privées et ne sont partagées qu&apos;avec les agents
                      certifiés.
                    </p>

                    <div className="mb-6">
                      <FieldLabel required>Nom du client</FieldLabel>
                      <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                        <User className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
                        <input
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ex : Aïcha Koné"
                          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div className="mb-6 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Email</FieldLabel>
                        <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                          <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vous@email.com"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                      <div>
                        <FieldLabel required>Téléphone</FieldLabel>
                        <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                          <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
                          <input
                            required
                            value={telephone}
                            onChange={(e) => setTelephone(e.target.value)}
                            placeholder="+225 07 00 00 00 00"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="my-7 border-black/[0.06]" />

                    <div className="mb-6">
                      <FieldLabel>Type de client</FieldLabel>
                      <div className="flex flex-wrap gap-2.5">
                        <Pill
                          selected={clientType === 'Particulier'}
                          onClick={() => setClientType('Particulier')}
                          icon={User}
                        >
                          Particulier
                        </Pill>
                        <Pill
                          selected={clientType === 'Entreprise'}
                          onClick={() => setClientType('Entreprise')}
                          icon={Briefcase}
                        >
                          Entreprise
                        </Pill>
                      </div>
                    </div>

                    <div className="mb-6 max-w-[300px]">
                      <FieldLabel>Comment nous avez-vous connu ?</FieldLabel>
                      <Select value={source} onChange={setSource}>
                        {SOURCE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <hr className="my-7 border-black/[0.06]" />

                    <div className="mb-2 flex flex-col gap-3">
                      <label className="flex items-start gap-2.5 text-[13px] text-gray-500">
                        <input
                          type="checkbox"
                          required
                          checked={consentContact}
                          onChange={(e) => setConsentContact(e.target.checked)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
                        />
                        J&apos;accepte d&apos;être contacté(e) par un agent certifié Habitat-Afrik
                        au sujet de ma demande.
                      </label>
                      <label className="flex items-start gap-2.5 text-[13px] text-gray-500">
                        <input
                          type="checkbox"
                          required
                          checked={consentData}
                          onChange={(e) => setConsentData(e.target.checked)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
                        />
                        J&apos;accepte la politique de confidentialité et le traitement de mes
                        données personnelles.
                      </label>
                    </div>

                    {submitError && <p className="mb-4 text-xs text-red-500">{submitError}</p>}

                    <div className="mt-8 flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-black/[0.1] px-[22px] py-2.5 text-sm font-semibold"
                      >
                        <ArrowLeft className="h-[15px] w-[15px]" aria-hidden />
                        Retour : Budget
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="h-[15px] w-[15px] animate-spin" aria-hidden />
                        ) : (
                          <Send className="h-[15px] w-[15px]" aria-hidden />
                        )}
                        {submitting ? 'Envoi…' : 'Envoyer ma demande'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
