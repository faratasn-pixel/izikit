'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Lightbulb,
  MapPin,
  MoveHorizontal,
  Tag,
  Key,
  Home,
  Building2,
  Map,
  Briefcase,
  Store,
  Wallet,
  WalletCards,
  BadgeDollarSign,
  Building,
  HandCoins,
  ShieldCheck,
  Mail,
  Phone,
  User,
  Calendar,
  MessageSquare,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

type Step = 1 | 2 | 3;
type Transaction = 'achat' | 'location';
type PropertyType = 'villa' | 'appartement' | 'terrain' | 'bureau' | 'commerce';
type Financement = 'fonds-propres' | 'credit' | 'mixte';
type Calendrier = 'immediat' | '1-3' | '3-6' | '6+';
type Canal = 'telephone' | 'email' | 'whatsapp' | 'sms';

const PROPERTY_TYPES: { key: PropertyType; label: string; icon: typeof Home }[] = [
  { key: 'villa', label: 'Villa', icon: Home },
  { key: 'appartement', label: 'Appartement', icon: Building2 },
  { key: 'terrain', label: 'Terrain', icon: Map },
  { key: 'bureau', label: 'Bureau', icon: Briefcase },
  { key: 'commerce', label: 'Commerce', icon: Store },
];

const EQUIPEMENTS = [
  'Piscine',
  'Parking',
  'Gardiennage',
  'Climatisation',
  'Jardin',
  'Groupe électrogène',
];

const FINANCEMENTS: { key: Financement; label: string; icon: typeof BadgeDollarSign }[] = [
  { key: 'fonds-propres', label: 'Fonds propres', icon: BadgeDollarSign },
  { key: 'credit', label: 'Crédit bancaire', icon: Building },
  { key: 'mixte', label: 'Mixte', icon: HandCoins },
];

const CALENDRIERS: { key: Calendrier; label: string }[] = [
  { key: 'immediat', label: 'Immédiat' },
  { key: '1-3', label: '1 à 3 mois' },
  { key: '3-6', label: '3 à 6 mois' },
  { key: '6+', label: '6 mois et +' },
];

const FRAIS = [
  "Inclure frais d'agence",
  'Inclure frais notariaux',
  'Inclure travaux éventuels',
  'Prévoir budget ameublement',
];

const CANAUX: { key: Canal; label: string; icon: typeof Phone }[] = [
  { key: 'telephone', label: 'Téléphone', icon: Phone },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
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

function SelectMock({ value }: { value: string }) {
  return (
    <div className="flex w-full items-center justify-between rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5 text-sm">
      <span>{value}</span>
      <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden />
    </div>
  );
}

export default function NouvelleDemandePage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [transaction, setTransaction] = useState<Transaction>('achat');
  const [propertyType, setPropertyType] = useState<PropertyType>('villa');
  const [pays] = useState("Côte d'Ivoire");
  const [ville] = useState('Abidjan');
  const [quartier, setQuartier] = useState('Cocody, Riviera');
  const [surfaceMin, setSurfaceMin] = useState('150');
  const [surfaceMax, setSurfaceMax] = useState('350');
  const [pieces] = useState('4 pièces');
  const [chambres] = useState('3 chambres');
  const [equipements, setEquipements] = useState<string[]>(['Piscine', 'Parking', 'Jardin']);
  const [description, setDescription] = useState(
    'Recherche villa standing dans secteur résidentiel calme, proximité école internationale et axes principaux. Préférence pour duplex avec vue dégagée.',
  );

  // Step 2
  const [budgetMin, setBudgetMin] = useState('80M FCFA');
  const [budgetMax, setBudgetMax] = useState('200M FCFA');
  const [financement, setFinancement] = useState<Financement>('fonds-propres');
  const [budgetIdeal] = useState('150M FCFA');
  const [flexibilite] = useState("Jusqu'à +10%");
  const [calendrier, setCalendrier] = useState<Calendrier>('1-3');
  const [frais, setFrais] = useState<string[]>([
    "Inclure frais d'agence",
    'Inclure frais notariaux',
  ]);
  const [preferences, setPreferences] = useState(
    'Je privilégie les biens prêts à habiter. Je peux ajuster mon budget si la localisation et la qualité du bien correspondent parfaitement à mes attentes.',
  );

  // Step 3
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [disponibilite] = useState('Journée (9h - 18h)');
  const [canal, setCanal] = useState<Canal>('telephone');
  const [agentConnu, setAgentConnu] = useState<'oui' | 'non'>('non');
  const [notes, setNotes] = useState('');
  const [consentContact, setConsentContact] = useState(false);
  const [consentData, setConsentData] = useState(false);

  function toggleFrom(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function stepState(n: Step): 'done' | 'active' | 'pending' {
    if (n < step) return 'done';
    if (n === step) return 'active';
    return 'pending';
  }

  const selectedType = PROPERTY_TYPES.find((t) => t.key === propertyType);
  const selectedFinancement = FINANCEMENTS.find((f) => f.key === financement);
  const selectedCalendrier = CALENDRIERS.find((c) => c.key === calendrier);

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

        {/* GRID */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          {/* FORM CARD */}
          <div className="rounded-2xl border border-black/[0.06] bg-white p-6 lg:p-9">
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
                    <Pill
                      selected={transaction === 'achat'}
                      onClick={() => setTransaction('achat')}
                      icon={Tag}
                    >
                      Achat
                    </Pill>
                    <Pill
                      selected={transaction === 'location'}
                      onClick={() => setTransaction('location')}
                      icon={Key}
                    >
                      Location
                    </Pill>
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
                        {t.label}
                      </Pill>
                    ))}
                  </div>
                </div>

                <hr className="my-7 border-black/[0.06]" />

                <div className="mb-6">
                  <FieldLabel required>Pays</FieldLabel>
                  <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                    <SelectMock value={`🇨🇮 ${pays}`} />
                    <SelectMock value={ville} />
                  </div>
                </div>

                <div className="mb-6">
                  <FieldLabel>Quartier / Zone souhaitée</FieldLabel>
                  <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-brand bg-brand/[0.04] px-3.5 py-2.5">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden />
                    <input
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Indiquez un ou plusieurs quartiers séparés par une virgule.
                  </p>
                </div>

                <hr className="my-7 border-black/[0.06]" />

                <div className="mb-6">
                  <FieldLabel>Superficie souhaitée (m²)</FieldLabel>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                      <MoveHorizontal className="h-[15px] w-[15px] text-gray-400" aria-hidden />
                      <span className="text-sm text-gray-500">Min</span>
                      <input
                        value={surfaceMin}
                        onChange={(e) => setSurfaceMin(e.target.value)}
                        className="ml-1 w-full bg-transparent text-sm font-semibold outline-none"
                      />
                    </div>
                    <span className="text-sm text-gray-400">—</span>
                    <div className="flex flex-1 items-center gap-2 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                      <MoveHorizontal className="h-[15px] w-[15px] text-gray-400" aria-hidden />
                      <span className="text-sm text-gray-500">Max</span>
                      <input
                        value={surfaceMax}
                        onChange={(e) => setSurfaceMax(e.target.value)}
                        className="ml-1 w-full bg-transparent text-sm font-semibold outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Nombre de pièces min.</FieldLabel>
                    <SelectMock value={pieces} />
                  </div>
                  <div>
                    <FieldLabel>Chambres min.</FieldLabel>
                    <SelectMock value={chambres} />
                  </div>
                </div>

                <hr className="my-7 border-black/[0.06]" />

                <div className="mb-6">
                  <FieldLabel>Équipements souhaités</FieldLabel>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {EQUIPEMENTS.map((eq) => (
                      <CheckOption
                        key={eq}
                        checked={equipements.includes(eq)}
                        onClick={() => toggleFrom(equipements, setEquipements, eq)}
                      >
                        {eq}
                      </CheckOption>
                    ))}
                  </div>
                </div>

                <hr className="my-7 border-black/[0.06]" />

                <div className="mb-2">
                  <FieldLabel>Description complémentaire</FieldLabel>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 p-3.5 text-sm leading-relaxed outline-none"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Précisez tout critère important non listé ci-dessus (orientation, étage,
                    proximité d&apos;un lieu…)
                  </p>
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
                  <FieldLabel required>Quel est votre budget global ?</FieldLabel>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                      <Wallet className="h-[15px] w-[15px] text-gray-400" aria-hidden />
                      <span className="text-sm text-gray-500">Min</span>
                      <input
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        className="ml-1 w-full bg-transparent text-sm font-semibold outline-none"
                      />
                    </div>
                    <span className="text-sm text-gray-400">—</span>
                    <div className="flex flex-1 items-center gap-2 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                      <WalletCards className="h-[15px] w-[15px] text-gray-400" aria-hidden />
                      <span className="text-sm text-gray-500">Max</span>
                      <input
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        className="ml-1 w-full bg-transparent text-sm font-semibold outline-none"
                      />
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Utilisez un format simple et réaliste pour accélérer la mise en relation.
                  </p>
                </div>

                <div className="mb-6">
                  <FieldLabel required>Type de financement</FieldLabel>
                  <div className="flex flex-wrap gap-2.5">
                    {FINANCEMENTS.map((f) => (
                      <Pill
                        key={f.key}
                        selected={financement === f.key}
                        onClick={() => setFinancement(f.key)}
                        icon={f.icon}
                      >
                        {f.label}
                      </Pill>
                    ))}
                  </div>
                </div>

                <hr className="my-7 border-black/[0.06]" />

                <div className="mb-6 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Budget idéal</FieldLabel>
                    <SelectMock value={budgetIdeal} />
                  </div>
                  <div>
                    <FieldLabel>Marge de flexibilité</FieldLabel>
                    <SelectMock value={flexibilite} />
                  </div>
                </div>

                <div className="mb-6">
                  <FieldLabel required>Votre projet est prévu pour quand ?</FieldLabel>
                  <div className="flex flex-wrap gap-2.5">
                    {CALENDRIERS.map((c) => (
                      <Pill
                        key={c.key}
                        selected={calendrier === c.key}
                        onClick={() => setCalendrier(c.key)}
                      >
                        {c.label}
                      </Pill>
                    ))}
                  </div>
                </div>

                <hr className="my-7 border-black/[0.06]" />

                <div className="mb-6">
                  <FieldLabel>Frais à prendre en compte</FieldLabel>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {FRAIS.map((f) => (
                      <CheckOption
                        key={f}
                        checked={frais.includes(f)}
                        onClick={() => toggleFrom(frais, setFrais, f)}
                      >
                        {f}
                      </CheckOption>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <FieldLabel>Préférences complémentaires</FieldLabel>
                  <textarea
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 p-3.5 text-sm leading-relaxed outline-none"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Vous pouvez préciser ici votre souplesse, vos priorités ou vos contraintes de
                    financement.
                  </p>
                </div>

                <div className="mb-2 flex gap-4 rounded-xl border border-brand/[0.18] bg-brand/[0.06] px-5 py-4.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/[0.14]">
                    <ShieldCheck className="h-4 w-4 text-brand" aria-hidden />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold">Conseil Habitat-Afrik</p>
                    <p className="text-[13px] leading-relaxed text-gray-500">
                      Une fourchette claire aide les agents à filtrer rapidement les biens hors
                      budget et à proposer des alternatives pertinentes.
                    </p>
                  </div>
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
              <>
                <h2 className="font-sora mb-1.5 text-[22px] font-extrabold tracking-[-0.03em]">
                  Étape 3 — Vos coordonnées
                </h2>
                <p className="mb-8 text-sm text-gray-500">
                  Ces informations restent privées et ne sont partagées qu&apos;avec les agents
                  certifiés.
                </p>

                <div className="mb-6 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Prénom</FieldLabel>
                    <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                      <User className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
                      <input
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        placeholder="Votre prénom"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel required>Nom</FieldLabel>
                    <div className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 px-3.5 py-2.5">
                      <User className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
                      <input
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        placeholder="Votre nom"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Email</FieldLabel>
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
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        placeholder="+225 07 00 00 00 00"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Pays</FieldLabel>
                    <SelectMock value={`🇨🇮 ${pays}`} />
                  </div>
                  <div>
                    <FieldLabel>Ville</FieldLabel>
                    <SelectMock value={ville} />
                  </div>
                </div>

                <div className="mb-6">
                  <FieldLabel>Disponibilité pour être contacté</FieldLabel>
                  <SelectMock value={disponibilite} />
                </div>

                <hr className="my-7 border-black/[0.06]" />

                <div className="mb-6">
                  <FieldLabel required>Canal de contact préféré</FieldLabel>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {CANAUX.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCanal(c.key)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border-[1.5px] px-3 py-4 text-center',
                          canal === c.key
                            ? 'border-brand bg-brand/[0.06]'
                            : 'border-black/[0.1] bg-white',
                        )}
                      >
                        <c.icon
                          className={cn(
                            'h-5 w-5',
                            canal === c.key ? 'text-brand' : 'text-gray-400',
                          )}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            'text-[13px] font-semibold',
                            canal === c.key ? 'text-brand' : 'text-neutral-900',
                          )}
                        >
                          {c.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <FieldLabel>Êtes-vous déjà en contact avec un agent ?</FieldLabel>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setAgentConnu('non')}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left',
                        agentConnu === 'non'
                          ? 'border-brand bg-brand/[0.06]'
                          : 'border-black/[0.1] bg-white',
                      )}
                    >
                      <Users
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          agentConnu === 'non' ? 'text-brand' : 'text-gray-400',
                        )}
                        aria-hidden
                      />
                      <div>
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            agentConnu === 'non' && 'text-brand',
                          )}
                        >
                          Non, pas encore
                        </p>
                        <p className="text-xs text-gray-500">Un agent disponible me contactera</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentConnu('oui')}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left',
                        agentConnu === 'oui'
                          ? 'border-brand bg-brand/[0.06]'
                          : 'border-black/[0.1] bg-white',
                      )}
                    >
                      <Calendar
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          agentConnu === 'oui' ? 'text-brand' : 'text-gray-400',
                        )}
                        aria-hidden
                      />
                      <div>
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            agentConnu === 'oui' && 'text-brand',
                          )}
                        >
                          Oui, un agent m&apos;accompagne déjà
                        </p>
                        <p className="text-xs text-gray-500">Précisez-le en note ci-dessous</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <FieldLabel>Notes complémentaires</FieldLabel>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Un détail que les agents devraient connaître ?"
                    className="w-full rounded-lg border-[1.5px] border-black/[0.1] bg-gray-50 p-3.5 text-sm leading-relaxed outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="mb-2 flex flex-col gap-3">
                  <label className="flex items-start gap-2.5 text-[13px] text-gray-500">
                    <input
                      type="checkbox"
                      checked={consentContact}
                      onChange={(e) => setConsentContact(e.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
                    />
                    J&apos;accepte d&apos;être contacté(e) par un agent certifié Habitat-Afrik au
                    sujet de ma demande.
                  </label>
                  <label className="flex items-start gap-2.5 text-[13px] text-gray-500">
                    <input
                      type="checkbox"
                      checked={consentData}
                      onChange={(e) => setConsentData(e.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
                    />
                    J&apos;accepte la politique de confidentialité et le traitement de mes données
                    personnelles.
                  </label>
                </div>

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
                    type="button"
                    disabled
                    title="Bientôt disponible"
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-brand/40 px-7 py-3 text-sm font-bold text-white"
                  >
                    Envoyer ma demande
                    <ArrowRight className="h-[15px] w-[15px]" aria-hidden />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="flex flex-col gap-4.5 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6">
              <div className="mb-4.5 flex items-center gap-2.5 text-[15px] font-bold">
                <FileText className="h-[18px] w-[18px] text-brand" aria-hidden />
                Résumé de votre demande
              </div>

              {/* Step 1 summary */}
              <div className="mb-4.5">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <StepCircle state={stepState(1)} num={1} />
                  <span
                    className={cn(
                      'text-[13px] font-semibold',
                      stepState(1) === 'active' && 'text-brand',
                    )}
                  >
                    Bien recherché
                  </span>
                </div>
                <div className="flex flex-col gap-2 pl-[34px]">
                  <SummaryRow
                    label="Transaction"
                    value={transaction === 'achat' ? 'Achat' : 'Location'}
                  />
                  <SummaryRow label="Type" value={selectedType?.label ?? ''} />
                  <SummaryRow label="Localisation" value={`🇨🇮 ${ville}, ${quartier}`} />
                  <SummaryRow label="Superficie" value={`${surfaceMin} – ${surfaceMax} m²`} />
                  <SummaryRow label="Pièces min." value={pieces} />
                  <SummaryRow
                    label="Équipements"
                    value={equipements.length ? equipements.join(', ') : '—'}
                  />
                </div>
              </div>

              <hr className="my-3.5 border-black/[0.06]" />

              {/* Step 2 summary */}
              <div className="mb-4.5">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <StepCircle state={stepState(2)} num={2} />
                  <span
                    className={cn(
                      'text-[13px] font-semibold text-gray-400',
                      stepState(2) === 'active' && 'text-brand',
                    )}
                  >
                    Budget
                  </span>
                </div>
                <div className="flex flex-col gap-2 pl-[34px]">
                  {step >= 2 ? (
                    <>
                      <SummaryRow label="Fourchette" value={`${budgetMin} – ${budgetMax}`} />
                      <SummaryRow label="Budget idéal" value={budgetIdeal} />
                      <SummaryRow label="Financement" value={selectedFinancement?.label ?? ''} />
                      <SummaryRow label="Calendrier" value={selectedCalendrier?.label ?? ''} />
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">À compléter</span>
                  )}
                </div>
              </div>

              <hr className="my-3.5 border-black/[0.06]" />

              {/* Step 3 summary */}
              <div>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <StepCircle state={stepState(3)} num={3} />
                  <span
                    className={cn(
                      'text-[13px] font-semibold text-gray-400',
                      stepState(3) === 'active' && 'text-brand',
                    )}
                  >
                    Contact
                  </span>
                </div>
                <div className="flex flex-col gap-2 pl-[34px]">
                  {step >= 3 && (prenom || nom || email) ? (
                    <>
                      <SummaryRow label="Nom" value={`${prenom} ${nom}`.trim() || '—'} />
                      <SummaryRow label="Email" value={email || '—'} />
                      <SummaryRow
                        label="Canal"
                        value={CANAUX.find((c) => c.key === canal)?.label ?? ''}
                      />
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">À compléter</span>
                  )}
                </div>
              </div>

              <div className="mt-4.5 flex items-start gap-2.5 rounded-lg bg-brand/[0.06] p-3.5">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" aria-hidden />
                <p className="text-xs leading-relaxed">
                  Vos coordonnées restent <strong>privées</strong>. Seuls les agents certifiés
                  Habitat-Afrik y auront accès.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-brand/[0.18] bg-brand/[0.06] p-5.5">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-brand">
                <Lightbulb className="h-[15px] w-[15px]" aria-hidden />
                {step === 1 && 'Conseils pour une bonne demande'}
                {step === 2 && 'Conseils pour le budget'}
                {step === 3 && 'Conseils pour le contact'}
              </div>
              <div className="flex flex-col gap-2.5 text-[13px] leading-relaxed">
                {step === 1 && (
                  <>
                    <TipItem>
                      Soyez précis sur la localisation pour recevoir des offres vraiment
                      pertinentes.
                    </TipItem>
                    <TipItem>
                      Indiquez une fourchette de budget réaliste pour maximiser les correspondances.
                    </TipItem>
                    <TipItem>
                      La description libre aide les agents à trouver des biens hors-marché.
                    </TipItem>
                  </>
                )}
                {step === 2 && (
                  <>
                    <TipItem>
                      Ajoutez une marge si vous visez un quartier très demandé comme Cocody ou
                      Riviera.
                    </TipItem>
                    <TipItem>
                      Pensez aux frais annexes pour éviter les écarts entre budget affiché et budget
                      réel.
                    </TipItem>
                    <TipItem>
                      Un délai d&apos;achat clair aide les agents à prioriser les biens disponibles
                      immédiatement.
                    </TipItem>
                  </>
                )}
                {step === 3 && (
                  <>
                    <TipItem>
                      Un numéro joignable accélère la prise de contact par les agents disponibles.
                    </TipItem>
                    <TipItem>
                      Choisissez le canal que vous consultez le plus souvent pour ne rien manquer.
                    </TipItem>
                    <TipItem>
                      Vos données restent confidentielles et ne sont jamais revendues à des tiers.
                    </TipItem>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs whitespace-nowrap text-gray-500">{label}</span>
      <span className="text-right text-xs font-semibold">{value}</span>
    </div>
  );
}

function TipItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
      <span>{children}</span>
    </div>
  );
}
