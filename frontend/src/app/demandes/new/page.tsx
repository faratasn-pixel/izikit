'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Info,
  ChevronDown,
  Ruler,
  Home,
  Building,
  Warehouse,
  Building2,
  Store,
  Tag,
  Key,
  Wallet,
  CreditCard,
  Layers,
  User,
  Briefcase,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;
type PropertyType = 'Villa' | 'Appartement' | 'Terrain' | 'Bureau' | 'Local commercial';
type TransactionType = 'Vente' | 'Location';
type Priority = 'Urgent' | 'Normale' | 'Basse';
type Financing = 'Comptant' | 'Crédit' | 'Les deux';
type Delay = 'Immédiat' | '1–3 mois' | '3–6 mois' | 'Flexible';
type ClientType = 'Particulier' | 'Entreprise';

const PROPERTY_TYPES: { key: PropertyType; icon: typeof Home }[] = [
  { key: 'Villa', icon: Home },
  { key: 'Appartement', icon: Building },
  { key: 'Terrain', icon: Warehouse },
  { key: 'Bureau', icon: Building2 },
  { key: 'Local commercial', icon: Store },
];

const AMENITIES = [
  'Climatisation',
  'Parking',
  'Piscine',
  'Gardiennage',
  'Groupe électrogène',
  'Internet / Fibre',
  'Meublé',
];

const PRIORITY_STYLE: Record<Priority, { dot: string; selected: string }> = {
  Urgent: { dot: 'bg-red-500', selected: 'border-red-500 bg-red-50 text-red-600' },
  Normale: { dot: 'bg-amber-500', selected: 'border-amber-500 bg-amber-50 text-amber-600' },
  Basse: { dot: 'bg-gray-400', selected: 'border-gray-400 bg-gray-100 text-gray-600' },
};

const ROOMS_OPTIONS = ['1 pièce', '2 pièces', '3 pièces', '4 pièces', '5 pièces et plus'];
const BEDROOMS_OPTIONS = ['1 chambre', '2 chambres', '3 chambres', '4 chambres et plus'];
const BATHROOMS_OPTIONS = ['1 salle de bain', '2 salles de bain', '3 salles de bain et plus'];
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
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Informations du bien
  const [propertyType, setPropertyType] = useState<PropertyType>('Villa');
  const [transaction, setTransaction] = useState<TransactionType>('Vente');
  const [country] = useState("Côte d'Ivoire");
  const [city, setCity] = useState('Abidjan');
  const [zone, setZone] = useState('');
  const [surfaceMin, setSurfaceMin] = useState('');
  const [rooms, setRooms] = useState(ROOMS_OPTIONS[2]!);
  const [bedrooms, setBedrooms] = useState(BEDROOMS_OPTIONS[1]!);
  const [bathrooms, setBathrooms] = useState(BATHROOMS_OPTIONS[0]!);
  const [amenities, setAmenities] = useState<string[]>(['Climatisation', 'Parking']);
  const [priority, setPriority] = useState<Priority>('Urgent');
  const [notes, setNotes] = useState('');

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
  const [salesNotes, setSalesNotes] = useState('');

  if (!user) return null;

  const toggleAmenity = (a: string) => {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

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
        <Link
          href="/demandes"
          className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-semibold text-neutral-700"
        >
          <X className="h-[14px] w-[14px]" aria-hidden />
          Annuler
        </Link>
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
                Type de bien <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PROPERTY_TYPES.map((t) => (
                  <OptionCard
                    key={t.key}
                    label={t.key}
                    icon={t.icon}
                    selected={propertyType === t.key}
                    onClick={() => setPropertyType(t.key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[12.5px] font-semibold text-neutral-700">
                Type de transaction <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                <OptionCard
                  label="Vente"
                  icon={Tag}
                  selected={transaction === 'Vente'}
                  onClick={() => setTransaction('Vente')}
                />
                <OptionCard
                  label="Location"
                  icon={Key}
                  selected={transaction === 'Location'}
                  onClick={() => setTransaction('Location')}
                />
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
                <label className="text-[12.5px] font-semibold text-neutral-700">
                  Pays <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px]">
                  <span className="flex items-center gap-2">
                    <span>🇨🇮</span>
                    <span className="text-neutral-900">{country}</span>
                  </span>
                  <ChevronDown className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="req-city" className="text-[12.5px] font-semibold text-neutral-700">
                  Ville <span className="text-red-500">*</span>
                </label>
                <select
                  id="req-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {['Abidjan', 'Bouaké', 'San-Pédro', 'Yamoussoukro'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="req-zone" className="text-[12.5px] font-semibold text-neutral-700">
                  Quartier / Zone
                </label>
                <input
                  id="req-zone"
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="Ex: Cocody, Plateau, Marcory…"
                  className="rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
                />
                <span className="text-[11.5px] text-gray-400">
                  Vous pouvez indiquer plusieurs quartiers séparés par une virgule.
                </span>
              </div>
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
            </div>
          </div>

          <div className="mb-4 rounded-2xl bg-white p-7">
            <h2 className="font-sora mb-1 text-[15px] font-semibold text-neutral-900">
              Caractéristiques du bien
            </h2>
            <p className="mb-5 text-xs text-gray-400">
              Précisez les critères essentiels pour affiner la recherche.
            </p>

            <div className="mb-4.5 grid grid-cols-1 gap-4.5 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="req-rooms" className="text-[12.5px] font-semibold text-neutral-700">
                  Nombre de pièces
                </label>
                <select
                  id="req-rooms"
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {ROOMS_OPTIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
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
                  htmlFor="req-bathrooms"
                  className="text-[12.5px] font-semibold text-neutral-700"
                >
                  Nombre de salles de bain
                </label>
                <select
                  id="req-bathrooms"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="appearance-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 focus:border-brand focus:outline-none"
                >
                  {BATHROOMS_OPTIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4.5 h-px bg-black/[0.06]" />

            <div className="mb-4.5">
              <label className="mb-2 block text-[12.5px] font-semibold text-neutral-700">
                Équipements souhaités
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => {
                  const selected = amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-medium',
                        selected
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-black/[0.08] bg-white text-neutral-700',
                      )}
                    >
                      {selected && <Check className="h-2.5 w-2.5" aria-hidden />}
                      {a}
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

            <div className="h-px bg-black/[0.06]" />

            <div className="mt-4.5 flex flex-col gap-1.5">
              <label htmlFor="req-notes" className="text-[12.5px] font-semibold text-neutral-700">
                Notes / remarques
              </label>
              <textarea
                id="req-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez des précisions supplémentaires sur les souhaits du client…"
                rows={3}
                className="resize-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
              />
              <span className="text-[11.5px] text-gray-400">
                Ces notes sont visibles uniquement par vous et votre équipe.
              </span>
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
            Ces informations servent à recontacter le client dès qu&apos;une correspondance existe.
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
            <label htmlFor="req-source" className="text-[12.5px] font-semibold text-neutral-700">
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

          <div className="h-px bg-black/[0.06]" />

          <div className="mt-4.5 flex flex-col gap-1.5">
            <label
              htmlFor="req-sales-notes"
              className="text-[12.5px] font-semibold text-neutral-700"
            >
              Notes commerciales
            </label>
            <textarea
              id="req-sales-notes"
              value={salesNotes}
              onChange={(e) => setSalesNotes(e.target.value)}
              placeholder="Contexte de la demande, échanges précédents…"
              rows={3}
              className="resize-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* FOOTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5">
        <div className="flex items-center gap-1.5">
          <Info className="h-[14px] w-[14px] text-gray-400" aria-hidden />
          <span className="text-[12.5px] text-gray-400">
            Les champs marqués <span className="text-red-500">*</span> sont obligatoires
          </span>
        </div>
        <div className="flex items-center gap-2.5">
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
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              Créer la demande
            </button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
