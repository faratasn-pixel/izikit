'use client';

import { useState, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
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

export function ProfileCard({ user }: { user: User }) {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const initial = splitName(user.name);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [city, setCity] = useState(user.city ?? '');
  const [country, setCountry] = useState(user.country ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <button
          type="button"
          disabled
          title="Bientôt disponible"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-gray-400"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Changer la photo
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
          <TextField label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
          <TextField label="Pays" value={country} onChange={(e) => setCountry(e.target.value)} />
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
