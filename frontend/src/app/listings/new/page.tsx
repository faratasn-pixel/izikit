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
  Plus,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { API_URL, COOKIE_PREFIX } from '@/lib/constants';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  PROPERTY_TYPE_LABEL,
  TRANSACTION_TYPE_LABEL,
  STANDING_LABEL,
  AMENITY_LABEL,
  formatListingPrice,
} from '@/lib/listings';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  position: number;
}

const MISSING_FIELD_LABEL: Record<string, string> = {
  title: "Titre de l'annonce",
  description: 'Description',
  price: 'Prix',
  surfaceM2: 'Surface',
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

async function multipartRequest<T>(path: string, form: FormData, method = 'POST'): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'x-csrf-token': readCsrfToken() },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? `Error ${res.status}`, body);
  }
  return res.json() as Promise<T>;
}

async function deleteRequest(path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'x-csrf-token': readCsrfToken() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? `Error ${res.status}`, body);
  }
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
const MAX_PHOTOS = 20;

export default function PublishListingPage() {
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [listingId, setListingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(true);
  const createdRef = useRef(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [propertyType, setPropertyType] = useState('VILLA');
  const [transactionType, setTransactionType] = useState('SALE');
  const [price, setPrice] = useState('');
  const [surfaceM2, setSurfaceM2] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [standing, setStanding] = useState('');
  const [roomsTotal, setRoomsTotal] = useState(0);
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [step, setStep] = useState(0);

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
      amenities,
    };
    if (title.trim()) payload.title = title.trim();
    if (description.trim()) payload.description = description.trim();
    if (city.trim()) payload.city = city.trim();
    if (country.trim()) payload.country = country.trim();
    const priceNum = Number(price);
    if (price && Number.isFinite(priceNum) && priceNum > 0) payload.price = Math.round(priceNum);
    const surfaceNum = Number(surfaceM2);
    if (surfaceM2 && Number.isFinite(surfaceNum) && surfaceNum > 0) {
      payload.surfaceM2 = Math.round(surfaceNum);
    }
    const yearNum = Number(yearBuilt);
    if (yearBuilt && Number.isFinite(yearNum)) payload.yearBuilt = Math.round(yearNum);
    if (standing) payload.standing = standing;
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
      await api(`/api/listings/${listingId}`, {
        method: 'PATCH',
        body: { ...buildFieldsPayload(), publish: true },
      });
      toast('Annonce publiée — en attente de vérification.', 'success');
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

  async function onPhotoFiles(files: FileList | null) {
    if (!files || !listingId) return;
    setUploadingPhoto(true);
    let count = photos.length;
    try {
      for (const file of Array.from(files)) {
        if (count >= MAX_PHOTOS) {
          toast(`Maximum ${MAX_PHOTOS} photos.`, 'error');
          break;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          toast(`${file.name} : fichier trop volumineux (max 10 Mo).`, 'error');
          continue;
        }
        try {
          const form = new FormData();
          form.append('file', file);
          if (count === 0) form.append('isPrimary', 'true');
          const { photo } = await multipartRequest<{ photo: Photo }>(
            `/api/listings/${listingId}/photos`,
            form,
          );
          setPhotos((prev) => [...prev, photo]);
          count += 1;
        } catch (e) {
          toast(e instanceof ApiError ? e.message : 'Échec du téléversement.', 'error');
        }
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onRemovePhoto(photoId: string) {
    if (!listingId) return;
    try {
      await deleteRequest(`/api/listings/${listingId}/photos/${photoId}`);
      setPhotos((prev) => {
        const removed = prev.find((p) => p.id === photoId);
        const rest = prev.filter((p) => p.id !== photoId);
        if (removed?.isPrimary && rest.length > 0) rest[0] = { ...rest[0]!, isPrimary: true };
        return rest;
      });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erreur réseau. Réessayez.', 'error');
    }
  }

  function toggleAmenity(key: string) {
    setAmenities((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  if (!user) return null;

  const infoDone = Boolean(
    title.trim() &&
    description.trim() &&
    Number(price) > 0 &&
    Number(surfaceM2) > 0 &&
    city.trim() &&
    country.trim(),
  );
  const photosDone = photos.length > 0;
  const stepsDone = [true, infoDone, true, photosDone].filter(Boolean).length;
  const progressPct = Math.round((stepsDone / 4) * 100);

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
      sub: `${photos.length} photo${photos.length === 1 ? '' : 's'} ajoutée${photos.length === 1 ? '' : 's'}`,
      done: photosDone,
    },
  ];
  const lastStep = STEPS.length - 1;

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

        {/* MOBILE PROGRESS BAR (replaces the sidebar below lg:) */}
        <div className="rounded-2xl bg-white p-4 lg:hidden">
          <div className="mb-2 flex items-center justify-between text-[12px] text-gray-400">
            <span>Progression</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* STEPPER SIDEBAR — desktop only */}
          <aside className="hidden w-[260px] flex-shrink-0 flex-col gap-1 rounded-2xl bg-white p-5 lg:flex">
            <p className="font-sora mb-2 text-[13px] font-semibold text-neutral-900">Étapes</p>
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-gray-50',
                  i === step && 'bg-brand/5',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    s.done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400',
                  )}
                >
                  {s.done ? <Check className="h-3 w-3" aria-hidden /> : ''}
                </span>
                <span>
                  <span
                    className={cn(
                      'block text-[13px] font-medium',
                      i === step ? 'text-brand' : 'text-neutral-900',
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="block text-[11px] text-gray-400">{s.sub}</span>
                </span>
              </button>
            ))}
            <div className="mt-3 border-t border-black/[0.06] pt-3">
              <div className="mb-1.5 flex items-center justify-between text-[12px] text-gray-400">
                <span>Progression globale</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className="font-semibold text-neutral-900">
                    {TRANSACTION_TYPE_LABEL[transactionType]} · {PROPERTY_TYPE_LABEL[propertyType]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Prix</span>
                  <span className="font-semibold text-brand">
                    {price ? formatListingPrice(Number(price), 'XOF') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Surface</span>
                  <span className="font-semibold text-neutral-900">
                    {surfaceM2 ? `${surfaceM2} m²` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Photos</span>
                  <span className="font-semibold text-neutral-900">
                    {photos.length} / {MAX_PHOTOS}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* FORM SECTIONS */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
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
                    onChange={setTransactionType}
                  />
                </Field>
                <Field label="Type de bien">
                  <ToggleGroup
                    options={Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => ({
                      value,
                      label,
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
                    placeholder="Décrivez le bien : standing, équipements, environnement…"
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                  <Field label="Année de construction">
                    <input
                      type="number"
                      value={yearBuilt}
                      onChange={(e) => setYearBuilt(e.target.value)}
                      placeholder="2019"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Standing">
                    <select
                      value={standing}
                      onChange={(e) => setStanding(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Non précisé</option>
                      {Object.entries(STANDING_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Field label="Ville" required>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cotonou"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Pays" required>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Bénin"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div>
                  <p className="mb-2.5 text-[12.5px] font-semibold text-neutral-700">
                    Nombre de pièces
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Pièces au total">
                      <Stepper value={roomsTotal} onChange={setRoomsTotal} />
                    </Field>
                    <Field label="Chambres">
                      <Stepper value={bedrooms} onChange={setBedrooms} />
                    </Field>
                    <Field label="Salles de bain">
                      <Stepper value={bathrooms} onChange={setBathrooms} />
                    </Field>
                  </div>
                </div>
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
                    {photos.length} / {MAX_PHOTOS}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void onPhotoFiles(e.dataTransfer.files);
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
                      ou cliquez pour parcourir vos fichiers
                    </p>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void onPhotoFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={!listingId || uploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      ) : (
                        <FolderUp className="h-3 w-3" aria-hidden />
                      )}
                      Parcourir
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <div
                        key={p.id}
                        className="group relative aspect-[4/3] overflow-hidden rounded-lg"
                      >
                        <img src={p.url} alt="" className="h-full w-full object-cover" />
                        {p.isPrimary && (
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                            Principale
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void onRemovePhoto(p.id)}
                          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                          <X className="h-2.5 w-2.5" aria-hidden />
                        </button>
                      </div>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <button
                        type="button"
                        disabled={!listingId || uploadingPhoto}
                        onClick={() => photoInputRef.current?.click()}
                        className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/[0.12] text-gray-400 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        <span className="text-[10px]">Ajouter</span>
                      </button>
                    )}
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
              <span className="text-[12px] text-gray-400">
                Étape {step + 1} / {STEPS.length}
              </span>
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(lastStep, s + 1))}
                disabled={step === lastStep}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Étape suivante
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
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
