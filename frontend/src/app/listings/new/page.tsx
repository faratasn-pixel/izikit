'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Tag,
  FileText,
  Sparkles,
  ImageIcon,
  UploadCloud,
  FolderUp,
  X,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError, storeCsrfToken } from '@/lib/api';
import { API_URL, COOKIE_PREFIX } from '@/lib/constants';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL, AMENITY_LABEL } from '@/lib/listings';
import { cn } from '@/lib/utils';

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'uploading' | 'done' | 'error';
}

const MISSING_FIELD_LABEL: Record<string, string> = {
  title: "Titre de l'annonce",
  description: 'Description',
  price: 'Prix',
  surfaceM2: 'Surface',
  capacity: 'Nombre de places',
  city: 'Ville',
  country: 'Pays',
  propertyType: 'Type de bien',
  transactionType: 'Type de transaction',
  photos: 'Au moins une photo',
};

function readCsrfToken(): string {
  if (typeof window === 'undefined') return '';
  const name = `${COOKIE_PREFIX}-csrf`;
  const fromStorage = localStorage.getItem(name);
  if (fromStorage) return fromStorage;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match && match[1] ? decodeURIComponent(match[1]) : '';
}

async function refreshSession(): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}) as { csrfToken?: string });
  if (data.csrfToken) storeCsrfToken(data.csrfToken);
  return true;
}

async function multipartRequest<T>(
  path: string,
  form: FormData,
  method = 'POST',
  retryOn401 = true,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'x-csrf-token': readCsrfToken() },
    body: form,
  });
  if (res.status === 401 && retryOn401 && (await refreshSession())) {
    return multipartRequest<T>(path, form, method, false);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? `Error ${res.status}`, body);
  }
  return res.json() as Promise<T>;
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg border px-3.5 py-2 text-[13px] font-medium whitespace-nowrap',
            value === o.value
              ? 'border-brand bg-brand/5 text-brand'
              : 'border-black/[0.08] text-neutral-700 hover:bg-gray-50',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-neutral-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[13.5px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none';

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-black/[0.08]">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-8 w-8 items-center justify-center text-neutral-700 hover:bg-gray-50"
      >
        −
      </button>
      <span className="w-8 text-center text-[13.5px] font-semibold text-neutral-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center text-neutral-700 hover:bg-gray-50"
      >
        +
      </button>
    </div>
  );
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 9;

const LODGING_TRANSACTION_TYPES = new Set(['SEJOUR', 'AUBERGE']);
const LODGING_PROPERTY_TYPES = ['VILLA', 'APPARTEMENT', 'MAISON'];

// PARCELLE/DOMAINE: bare land — no rooms, no seating capacity, just surface.
const LAND_PROPERTY_TYPES = new Set(['PARCELLE', 'DOMAINE']);
// SALLE_FETE/SALLE_CONFERENCE: event halls — capacity (seats) instead of surface, no rooms.
const HALL_PROPERTY_TYPES = new Set(['SALLE_FETE', 'SALLE_CONFERENCE']);

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

export default function PublishListingPage() {
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [listingId, setListingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(true);
  const createdRef = useRef(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [propertyType, setPropertyType] = useState('VILLA');
  const [transactionType, setTransactionType] = useState('VENTE');
  const [price, setPrice] = useState('');
  const [surfaceM2, setSurfaceM2] = useState('');
  const [capacity, setCapacity] = useState('');
  const [roomsTotal, setRoomsTotal] = useState(0);
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [kitchens, setKitchens] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);

  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [step, setStep] = useState(0);

  const availablePropertyTypes = LODGING_TRANSACTION_TYPES.has(transactionType)
    ? LODGING_PROPERTY_TYPES
    : Object.keys(PROPERTY_TYPE_LABEL);

  const isLandType = LAND_PROPERTY_TYPES.has(propertyType);
  const isHallType = HALL_PROPERTY_TYPES.has(propertyType);
  const showRoomFields = !isLandType && !isHallType;
  const showSurfaceField = isLandType;
  const showCapacityField = isHallType;

  function handleTransactionTypeChange(value: string) {
    setTransactionType(value);
    if (LODGING_TRANSACTION_TYPES.has(value) && !LODGING_PROPERTY_TYPES.includes(propertyType)) {
      setPropertyType(LODGING_PROPERTY_TYPES[0]!);
    }
  }

  const selectedCountry = COUNTRIES.find((c) => c.name === country);
  const availableCities = selectedCountry?.cities ?? [];

  function handleCountryChange(value: string) {
    setCountry(value);
    const cities = COUNTRIES.find((c) => c.name === value)?.cities ?? [];
    if (!cities.includes(city)) setCity('');
  }

  useEffect(() => {
    if (!user || createdRef.current) return;
    createdRef.current = true;
    api<{ listing: { id: string } }>('/api/listings', { method: 'POST' })
      .then((res) => setListingId(res.listing.id))
      .catch(() => toast('Impossible de démarrer le brouillon. Rechargez la page.', 'error'))
      .finally(() => setCreating(false));
  }, [user]);

  function buildFieldsPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      propertyType,
      transactionType,
      roomsTotal,
      bedrooms,
      bathrooms,
      kitchens,
      amenities,
    };
    if (title.trim()) payload.title = title.trim();
    if (description.trim()) payload.description = description.trim();
    if (landmark.trim()) payload.landmark = landmark.trim();
    if (city.trim()) payload.city = city.trim();
    if (country.trim()) payload.country = country.trim();
    const priceNum = Number(price);
    if (price && Number.isFinite(priceNum) && priceNum > 0) payload.price = Math.round(priceNum);
    const surfaceNum = Number(surfaceM2);
    if (surfaceM2 && Number.isFinite(surfaceNum) && surfaceNum > 0) {
      payload.surfaceM2 = Math.round(surfaceNum);
    }
    const capacityNum = Number(capacity);
    if (capacity && Number.isFinite(capacityNum) && capacityNum > 0) {
      payload.capacity = Math.round(capacityNum);
    }
    return payload;
  }

  async function onSaveDraft() {
    if (!listingId) return;
    setSavingDraft(true);
    try {
      await api(`/api/listings/${listingId}`, { method: 'PATCH', body: buildFieldsPayload() });
      toast('Brouillon enregistré.', 'success');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur réseau. Réessayez.', 'error');
    } finally {
      setSavingDraft(false);
    }
  }

  async function onPublish() {
    if (!listingId) return;
    setPublishing(true);
    setMissingFields([]);
    try {
      const PHOTO_UPLOAD_CONCURRENCY = 3;
      const primaryId = pendingPhotos[0]?.id;
      const toUpload = pendingPhotos.filter((p) => p.status !== 'done');
      let aborted = false;

      for (let start = 0; start < toUpload.length && !aborted; start += PHOTO_UPLOAD_CONCURRENCY) {
        const batch = toUpload.slice(start, start + PHOTO_UPLOAD_CONCURRENCY);
        setPendingPhotos((prev) =>
          prev.map((x) => (batch.some((b) => b.id === x.id) ? { ...x, status: 'uploading' } : x)),
        );
        const results = await Promise.allSettled(
          batch.map(async (p) => {
            const form = new FormData();
            form.append('file', p.file);
            if (p.id === primaryId) form.append('isPrimary', 'true');
            await multipartRequest(`/api/listings/${listingId}/photos`, form);
          }),
        );
        results.forEach((result, idx) => {
          const p = batch[idx]!;
          if (result.status === 'fulfilled') {
            setPendingPhotos((prev) =>
              prev.map((x) => (x.id === p.id ? { ...x, status: 'done' } : x)),
            );
          } else {
            aborted = true;
            setPendingPhotos((prev) =>
              prev.map((x) => (x.id === p.id ? { ...x, status: 'error' } : x)),
            );
            const e = result.reason;
            toast(
              e instanceof ApiError ? e.message : `Échec de l'envoi de ${p.file.name}.`,
              'error',
            );
          }
        });
      }
      if (aborted) return;

      await api(`/api/listings/${listingId}`, {
        method: 'PATCH',
        body: { ...buildFieldsPayload(), publish: true },
      });
      toast('Annonce publiée avec succès.', 'success');
      router.push('/listings');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PUBLISH_REQUIREMENTS_NOT_MET') {
        const missing = (e.body.missing as string[]) ?? [];
        setMissingFields(missing);
        toast('Des champs sont manquants avant de publier.', 'error');
      } else {
        toast(e instanceof ApiError ? e.message : 'Erreur réseau. Réessayez.', 'error');
      }
    } finally {
      setPublishing(false);
    }
  }

  function onSelectPhotoFiles(files: FileList | null) {
    if (!files) return;
    const next: PendingPhoto[] = [];
    let count = pendingPhotos.length;
    for (const file of Array.from(files)) {
      if (count >= MAX_PHOTOS) {
        toast(`Maximum ${MAX_PHOTOS} photos.`, 'error');
        break;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast(`${file.name} : fichier trop volumineux (max 10 Mo).`, 'error');
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'idle',
      });
      count += 1;
    }
    if (next.length > 0) setPendingPhotos((prev) => [...prev, ...next]);
  }

  function onRemovePendingPhoto(id: string) {
    setPendingPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (!removed || removed.status === 'uploading') return prev;
      URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function toggleAmenity(key: string) {
    setAmenities((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  if (!user) return null;

  const infoDone = Boolean(
    title.trim() &&
    description.trim() &&
    landmark.trim() &&
    Number(price) > 0 &&
    (isHallType ? Number(capacity) > 0 : !isLandType || Number(surfaceM2) > 0) &&
    city.trim() &&
    country.trim(),
  );
  const photosDone = pendingPhotos.length > 0;

  const STEPS = [
    {
      id: 'fsec-type',
      label: 'Informations générales',
      sub: 'Type, bien, caractéristiques',
      done: true,
    },
    {
      id: 'fsec-info',
      label: 'Informations de base',
      sub: 'Titre, prix, surface, localisation',
      done: infoDone,
    },
    {
      id: 'fsec-amenities',
      label: 'Équipements',
      sub: `${amenities.length} sélectionné${amenities.length === 1 ? '' : 's'}`,
      done: true,
    },
    {
      id: 'fsec-photos',
      label: 'Photos & médias',
      sub: `${pendingPhotos.length} photo${pendingPhotos.length === 1 ? '' : 's'} ajoutée${pendingPhotos.length === 1 ? '' : 's'}`,
      done: photosDone,
    },
  ];
  const lastStep = STEPS.length - 1;

  function canAccessStep(i: number): boolean {
    return i <= 1 || infoDone;
  }

  function goToStep(i: number) {
    if (!canAccessStep(i)) {
      toast('Renseignez tous les champs de "Informations de base" avant de continuer.', 'error');
      return;
    }
    setStep(i);
  }

  return (
    <DashboardShell active="listings">
      <div className="flex flex-col gap-4">
        {/* ACTION BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/listings"
              className="mb-1 flex items-center gap-1 text-[12.5px] font-medium text-gray-400 hover:text-neutral-700"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Mes annonces
            </Link>
            <h1 className="font-sora text-xl font-semibold text-neutral-900">
              Publier une annonce
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void onSaveDraft()}
              disabled={!listingId || savingDraft}
              className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-neutral-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingDraft ? (
                <Loader2 className="h-[14px] w-[14px] animate-spin" aria-hidden />
              ) : (
                <Save className="h-[14px] w-[14px]" aria-hidden />
              )}
              Enregistrer le brouillon
            </button>
            <button
              type="button"
              onClick={() => void onPublish()}
              disabled={!listingId || publishing}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="h-[14px] w-[14px] animate-spin" aria-hidden />
              ) : (
                <Send className="h-[14px] w-[14px]" aria-hidden />
              )}
              Publier l&apos;annonce
            </button>
          </div>
        </div>

        {missingFields.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-4 text-[13px] text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Champs manquants avant publication :</p>
              <ul className="mt-1 list-disc pl-4">
                {missingFields.map((f) => (
                  <li key={f}>{MISSING_FIELD_LABEL[f] ?? f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* HORIZONTAL STEPPER */}
        <div className="rounded-2xl bg-white p-3 sm:p-5">
          <div className="flex items-start">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  className="flex flex-shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold sm:h-8 sm:w-8 sm:text-[13px]',
                      i === step
                        ? 'bg-brand text-white'
                        : s.done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {s.done && i !== step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'hidden max-w-[110px] text-center text-[11.5px] font-medium sm:block',
                      i === step ? 'text-brand' : 'text-neutral-700',
                    )}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-1.5 h-0.5 flex-1 rounded-full sm:mx-2',
                      i < step ? 'bg-brand' : 'bg-gray-100',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11.5px] font-medium text-brand sm:hidden">
            {STEPS[step]?.label}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* FORM SECTIONS */}
          <div className="flex w-full max-w-3xl min-w-0 flex-col gap-4">
            {/* SECTION 1: Type */}
            {step === 0 && (
              <section id="fsec-type" className="flex flex-col gap-4 rounded-2xl bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Tag className="h-4 w-4 text-brand" aria-hidden />
                  </div>
                  <div>
                    <p className="font-sora text-[14px] font-semibold text-neutral-900">
                      Type de transaction &amp; de bien
                    </p>
                    <p className="text-[12.5px] text-gray-400">
                      Sélectionnez la nature de votre annonce
                    </p>
                  </div>
                </div>
                <Field label="Transaction">
                  <ToggleGroup
                    options={Object.entries(TRANSACTION_TYPE_LABEL).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    value={transactionType}
                    onChange={handleTransactionTypeChange}
                  />
                </Field>
                <Field label="Type de bien">
                  <ToggleGroup
                    options={availablePropertyTypes.map((value) => ({
                      value,
                      label: PROPERTY_TYPE_LABEL[value]!,
                    }))}
                    value={propertyType}
                    onChange={setPropertyType}
                  />
                </Field>
              </section>
            )}

            {/* SECTION 2: Informations de base */}
            {step === 1 && (
              <section id="fsec-info" className="flex flex-col gap-4 rounded-2xl bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <FileText className="h-4 w-4 text-brand" aria-hidden />
                  </div>
                  <div>
                    <p className="font-sora text-[14px] font-semibold text-neutral-900">
                      Informations de base
                    </p>
                    <p className="text-[12.5px] text-gray-400">
                      Titre, description, prix et caractéristiques
                    </p>
                  </div>
                </div>

                <Field label="Titre de l'annonce" required>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Villa moderne avec piscine — Haie Vive, Cotonou"
                    className={inputClass}
                  />
                </Field>
                <Field label="Description" required>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Décrivez le bien : équipements, environnement…"
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pays" required>
                    <select
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Sélectionner un pays</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ville" required>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!country}
                      className={cn(inputClass, !country && 'cursor-not-allowed opacity-50')}
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
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prix (FCFA)" required>
                    <input
                      type="number"
                      min={1}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="120000000"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Point de repère" required>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Non loin de la pharmacie, carrefour…"
                      className={inputClass}
                    />
                  </Field>
                </div>

                {(showSurfaceField || showCapacityField) && (
                  <div className="grid grid-cols-2 gap-3">
                    {showSurfaceField && (
                      <Field label="Surface (m²)" required>
                        <input
                          type="number"
                          min={1}
                          value={surfaceM2}
                          onChange={(e) => setSurfaceM2(e.target.value)}
                          placeholder="320"
                          className={inputClass}
                        />
                      </Field>
                    )}
                    {showCapacityField && (
                      <Field label="Nombre de places" required={isHallType}>
                        <input
                          type="number"
                          min={1}
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          placeholder="200"
                          className={inputClass}
                        />
                      </Field>
                    )}
                  </div>
                )}

                {showRoomFields && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Salon">
                        <Stepper value={roomsTotal} onChange={setRoomsTotal} />
                      </Field>
                      <Field label="Chambre">
                        <Stepper value={bedrooms} onChange={setBedrooms} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Cuisine">
                        <Stepper value={kitchens} onChange={setKitchens} />
                      </Field>
                      <Field label="Toilette">
                        <Stepper value={bathrooms} onChange={setBathrooms} />
                      </Field>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* SECTION 3: Équipements */}
            {step === 2 && (
              <section id="fsec-amenities" className="flex flex-col gap-4 rounded-2xl bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Sparkles className="h-4 w-4 text-brand" aria-hidden />
                  </div>
                  <div>
                    <p className="font-sora text-[14px] font-semibold text-neutral-900">
                      Équipements &amp; Commodités
                    </p>
                    <p className="text-[12.5px] text-gray-400">
                      Sélectionnez tous les équipements disponibles
                    </p>
                  </div>
                  <span className="ml-auto flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-400">
                    Optionnel
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(AMENITY_LABEL).map(([key, label]) => {
                    const on = amenities.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleAmenity(key)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px] font-medium',
                          on
                            ? 'border-brand/30 bg-brand/5 text-neutral-900'
                            : 'border-black/[0.08] text-neutral-700 hover:bg-gray-50',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
                            on ? 'bg-brand' : 'border border-black/[0.15] bg-white',
                          )}
                        >
                          {on && <Check className="h-2.5 w-2.5 text-white" aria-hidden />}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 4: Photos */}
            {step === 3 && (
              <section id="fsec-photos" className="flex flex-col gap-4 rounded-2xl bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <ImageIcon className="h-4 w-4 text-brand" aria-hidden />
                  </div>
                  <div>
                    <p className="font-sora text-[14px] font-semibold text-neutral-900">
                      Photos &amp; Médias
                    </p>
                    <p className="text-[12.5px] text-gray-400">
                      Ajoutez jusqu&apos;à {MAX_PHOTOS} photos · PNG, JPG, WEBP · max 10 Mo
                    </p>
                  </div>
                  <span className="ml-auto flex-shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                    {pendingPhotos.length} / {MAX_PHOTOS}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onSelectPhotoFiles(e.dataTransfer.files);
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/[0.1] bg-gray-50 px-4 py-8 text-center"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10">
                      <UploadCloud className="h-5 w-5 text-brand" aria-hidden />
                    </div>
                    <p className="text-[13px] font-medium text-neutral-900">
                      Glissez vos photos ici
                    </p>
                    <p className="text-[11.5px] text-gray-400">
                      ou cliquez pour parcourir vos fichiers · envoyées à la publication
                    </p>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        onSelectPhotoFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={pendingPhotos.length >= MAX_PHOTOS}
                      onClick={() => photoInputRef.current?.click()}
                      className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      <FolderUp className="h-3 w-3" aria-hidden />
                      Parcourir
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {pendingPhotos.map((p, i) => (
                      <div
                        key={p.id}
                        className="group relative aspect-[4/3] overflow-hidden rounded-lg"
                      >
                        <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                            Principale
                          </span>
                        )}
                        {p.status === 'uploading' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                          </div>
                        )}
                        {p.status === 'done' && (
                          <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <Check className="h-3 w-3" aria-hidden />
                          </span>
                        )}
                        {p.status === 'error' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-600/50">
                            <AlertCircle className="h-5 w-5 text-white" aria-hidden />
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={p.status === 'uploading'}
                          onClick={() => onRemovePendingPhoto(p.id)}
                          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-40"
                        >
                          <X className="h-2.5 w-2.5" aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* STEP NAV */}
            <div className="flex items-center justify-between rounded-2xl bg-white p-4">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-neutral-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Étape précédente
              </button>
              {step === lastStep ? (
                <button
                  type="button"
                  onClick={() => void onPublish()}
                  disabled={!listingId || publishing}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {publishing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Publier l&apos;annonce
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goToStep(Math.min(lastStep, step + 1))}
                  disabled={!canAccessStep(step + 1)}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Étape suivante
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>

            {creating && (
              <p className="text-center text-[12px] text-gray-400">Préparation du brouillon…</p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
