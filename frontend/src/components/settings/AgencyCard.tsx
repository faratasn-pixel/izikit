'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  agencyType: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rccmNumber: string | null;
  facebookHandle: string | null;
  instagramHandle: string | null;
  linkedinHandle: string | null;
  whatsappNumber: string | null;
}

const EMPTY = {
  name: '',
  description: '',
  agencyType: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  rccmNumber: '',
  facebookHandle: '',
  instagramHandle: '',
  linkedinHandle: '',
  whatsappNumber: '',
};

type FormState = typeof EMPTY;

function toForm(org: Organization | null): FormState {
  if (!org) return EMPTY;
  return {
    name: org.name ?? '',
    description: org.description ?? '',
    agencyType: org.agencyType ?? '',
    address: org.address ?? '',
    phone: org.phone ?? '',
    email: org.email ?? '',
    website: org.website ?? '',
    rccmNumber: org.rccmNumber ?? '',
    facebookHandle: org.facebookHandle ?? '',
    instagramHandle: org.instagramHandle ?? '',
    linkedinHandle: org.linkedinHandle ?? '',
    whatsappNumber: org.whatsappNumber ?? '',
  };
}

export function AgencyCard({ onSaved }: { onSaved?: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ organization: Organization | null }>('/api/organizations/me')
      .then((res) => {
        if (!cancelled) setForm(toForm(res.organization));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length === 0) {
      setError("Le nom de l'agence est requis.");
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/organizations/me', { method: 'PATCH', body: form });
      toast('Informations de l’agence enregistrées.', 'success');
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
        Identité de l&apos;agence
      </h2>
      <p className="mb-6 text-[13px] text-gray-500">
        Ces informations sont visibles par les prospects sur toutes vos annonces.
      </p>

      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand/40 bg-brand/5">
          <ImagePlus className="h-5 w-5 text-brand/60" aria-hidden />
          <span className="text-[10px] font-semibold text-brand/60">Logo</span>
        </div>
        <div className="flex-1">
          <div className="font-sora text-base font-semibold text-neutral-900">
            {form.name || 'Mon agence'}
          </div>
          <div className="text-[12.5px] text-gray-500">
            {form.address || 'Renseignez l’adresse de votre agence'}
          </div>
        </div>
        <button
          type="button"
          disabled
          title="Bientôt disponible"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-gray-400"
        >
          Changer le logo
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Nom de l'agence"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
          <TextField
            label="Type d'agence"
            placeholder="Ex : Agence immobilière agréée"
            value={form.agencyType}
            onChange={(e) => set('agencyType', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Adresse du siège"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
          />
          <TextField
            label="Téléphone professionnel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Email professionnel"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <TextField
            label="Site web"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
          />
        </div>
        <TextField
          label="Numéro RCCM"
          value={form.rccmNumber}
          onChange={(e) => set('rccmNumber', e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="agency-description" className="text-[13px] font-medium text-neutral-700">
            Description de l&apos;agence
          </label>
          <textarea
            id="agency-description"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="rounded-[10px] border-[1.5px] border-black/[0.08] bg-gray-50 px-3.5 py-3 text-[15px] text-neutral-900 outline-none focus:border-brand"
          />
        </div>

        <div className="mt-1 border-t border-black/[0.06] pt-4">
          <h3 className="mb-3 text-[13.5px] font-semibold text-neutral-900">Réseaux sociaux</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              label="Facebook"
              placeholder="facebook.com/…"
              value={form.facebookHandle}
              onChange={(e) => set('facebookHandle', e.target.value)}
            />
            <TextField
              label="Instagram"
              placeholder="instagram.com/…"
              value={form.instagramHandle}
              onChange={(e) => set('instagramHandle', e.target.value)}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              label="LinkedIn"
              placeholder="linkedin.com/company/…"
              value={form.linkedinHandle}
              onChange={(e) => set('linkedinHandle', e.target.value)}
            />
            <TextField
              label="WhatsApp Business"
              value={form.whatsappNumber}
              onChange={(e) => set('whatsappNumber', e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse gap-2 border-t border-black/[0.06] pt-4 sm:flex-row sm:justify-end">
          <Button type="submit" disabled={submitting || !loaded} className="sm:w-auto">
            {submitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </section>
  );
}
