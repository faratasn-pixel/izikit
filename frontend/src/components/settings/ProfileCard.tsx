'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ChevronDown, Upload } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { API_URL, COOKIE_PREFIX } from '@/lib/constants';
import { COUNTRIES } from '@/lib/countries';
import { useAuth, type User } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { InitialsAvatar } from '@/components/dashboard/InitialsAvatar';

// Splits the single `User.name` column into Prénom/Nom for editing (first
// space is the boundary — same convention signup uses in reverse when it
// builds `name` from firstName + ' ' + lastName). Rejoined on save.
function splitName(name: string | null): { firstName: string; lastName: string } {
  if (!name) return { firstName: '', lastName: '' };
  const idx = name.indexOf(' ');
  if (idx === -1) return { firstName: name, lastName: '' };
  return { firstName: name.slice(0, idx), lastName: name.slice(idx + 1) };
}

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';
const AVATAR_MAX_BYTES = 10 * 1024 * 1024;

// Same raw-multipart convention as LegalDocumentsCard (the `api()` wrapper
// always JSON.stringifies its body, so it can't carry a FormData upload).
function readCsrfToken(): string {
  if (typeof window === 'undefined') return '';
  const name = `${COOKIE_PREFIX}-csrf`;
  const fromStorage = localStorage.getItem(name);
  if (fromStorage) return fromStorage;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match && match[1] ? decodeURIComponent(match[1]) : '';
}

async function uploadAvatarFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'x-csrf-token': readCsrfToken() },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? `Error ${res.status}`, body);
  }
  return body.url as string;
}

export function ProfileCard({ user }: { user: User }) {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const initial = splitName(user.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [city, setCity] = useState(user.city ?? '');
  const [country, setCountry] = useState(user.country ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCities = COUNTRIES.find((c) => c.name === country)?.cities ?? [];

  function onCountryChange(value: string) {
    setCountry(value);
    const cities = COUNTRIES.find((c) => c.name === value)?.cities ?? [];
    if (!cities.includes(city)) setCity('');
  }

  async function onPhotoChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > AVATAR_MAX_BYTES) {
      toast('Photo trop volumineuse (max 10 Mo).', 'error');
      return;
    }
    setUploadingPhoto(true);
    try {
      const avatarUrl = await uploadAvatarFile(file);
      await api('/api/auth/me', { method: 'PATCH', body: { avatarUrl } });
      await refresh();
      toast('Photo de profil mise à jour.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          name: `${firstName} ${lastName}`.trim(),
          phone,
          city,
          country,
          bio,
        },
      });
      toast('Profil mis à jour.', 'success');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  }

  function onCancel() {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setPhone(user.phone ?? '');
    setCity(user.city ?? '');
    setCountry(user.country ?? '');
    setBio(user.bio ?? '');
    setError(null);
  }

  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
        Informations personnelles
      </h2>
      <p className="mb-6 text-[13px] text-gray-500">
        Ces informations sont affichées sur votre profil public agent.
      </p>

      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <InitialsAvatar name={user.name} email={user.email} avatarUrl={user.avatarUrl} size={72} />
        <div className="flex-1">
          <div className="font-sora text-base font-semibold text-neutral-900">
            {user.name || user.email}
          </div>
          <div className="text-[12.5px] text-gray-500">
            {city || country ? [city, country].filter(Boolean).join(', ') : user.email}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="hidden"
          onChange={(e) => void onPhotoChosen(e)}
        />
        <button
          type="button"
          disabled={uploadingPhoto}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {uploadingPhoto ? 'Envoi…' : 'Changer la photo'}
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            label="Nom de famille"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Adresse e-mail" value={user.email} disabled />
          <TextField
            label="Numéro de téléphone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-country" className="text-[13px] font-medium text-neutral-700">
              Pays
            </label>
            <div className="relative flex min-h-12 items-center rounded-[10px] border-[1.5px] border-black/[0.08] bg-gray-50 focus-within:border-brand">
              <select
                id="profile-country"
                value={country}
                onChange={(e) => onCountryChange(e.target.value)}
                className="h-12 w-full appearance-none bg-transparent px-3.5 pr-9 text-[15px] text-neutral-900 outline-none"
              >
                <option value="">Sélectionner un pays</option>
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-city" className="text-[13px] font-medium text-neutral-700">
              Ville
            </label>
            <div className="relative flex min-h-12 items-center rounded-[10px] border-[1.5px] border-black/[0.08] bg-gray-50 focus-within:border-brand">
              <select
                id="profile-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!country}
                className="h-12 w-full appearance-none bg-transparent px-3.5 pr-9 text-[15px] text-neutral-900 outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bio" className="text-[13px] font-medium text-neutral-700">
            Biographie professionnelle
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="rounded-[10px] border-[1.5px] border-black/[0.08] bg-gray-50 px-3.5 py-3 text-[15px] text-neutral-900 outline-none focus:border-brand"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse gap-2 border-t border-black/[0.06] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="social" onClick={onCancel} className="sm:w-auto">
            Annuler
          </Button>
          <Button type="submit" disabled={submitting} className="sm:w-auto">
            {submitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </section>
  );
}
