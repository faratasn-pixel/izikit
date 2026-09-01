'use client';

import { useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface Zone {
  country: string;
  cities: string[];
}

interface Organization {
  zones: Zone[];
}

function parseCities(raw: string): string[] {
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

export function AgencyZonesCard() {
  const { toast } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftCountry, setDraftCountry] = useState('');
  const [draftCities, setDraftCities] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<{ organization: Organization | null }>('/api/organizations/me')
      .then((res) => {
        if (!cancelled) setZones(res.organization?.zones ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(next: Zone[]) {
    setSaving(true);
    try {
      await api('/api/organizations/me', { method: 'PATCH', body: { zones: next } });
      setZones(next);
      toast('Zones d’activité mises à jour.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(index: number) {
    setAdding(false);
    setEditingIndex(index);
    const zone = zones[index];
    setDraftCountry(zone?.country ?? '');
    setDraftCities((zone?.cities ?? []).join(', '));
  }

  function startAdd() {
    setEditingIndex(null);
    setAdding(true);
    setDraftCountry('');
    setDraftCities('');
  }

  function cancelDraft() {
    setEditingIndex(null);
    setAdding(false);
  }

  async function saveDraft() {
    const country = draftCountry.trim();
    if (!country) return;
    const cities = parseCities(draftCities);
    let next: Zone[];
    if (editingIndex !== null) {
      next = zones.map((z, i) => (i === editingIndex ? { country, cities } : z));
    } else {
      next = [...zones, { country, cities }];
    }
    await persist(next);
    cancelDraft();
  }

  async function removeZone(index: number) {
    await persist(zones.filter((_, i) => i !== index));
  }

  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
        Zones d&apos;activité
      </h2>
      <p className="mb-2 text-[13px] text-gray-500">
        Définissez les villes et pays où votre agence opère activement.
      </p>

      {loaded && zones.length === 0 && editingIndex === null && !adding && (
        <p className="py-4 text-[13px] text-gray-400">Aucune zone renseignée pour le moment.</p>
      )}

      <div className="divide-y divide-black/[0.06]">
        {zones.map((zone, index) =>
          editingIndex === index ? (
            <ZoneEditor
              key={index}
              country={draftCountry}
              cities={draftCities}
              onCountryChange={setDraftCountry}
              onCitiesChange={setDraftCities}
              onCancel={cancelDraft}
              onSave={() => void saveDraft()}
              saving={saving}
            />
          ) : (
            <div key={zone.country} className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <div className="mb-1.5 text-[13.5px] font-semibold text-neutral-900">
                  {zone.country}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {zone.cities.length === 0 && (
                    <span className="text-xs text-gray-400">Aucune ville</span>
                  )}
                  {zone.cities.map((city, i) => (
                    <span
                      key={city}
                      className={
                        i === 0
                          ? 'inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand'
                          : 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11.5px] font-medium text-neutral-700'
                      }
                    >
                      {i === 0 && <MapPin className="h-2.5 w-2.5" aria-hidden />}
                      {city}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(index)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-[12.5px] font-semibold text-neutral-800 hover:bg-gray-50"
                >
                  <Pencil className="h-3 w-3" aria-hidden />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => void removeZone(index)}
                  aria-label={`Supprimer ${zone.country}`}
                  className="rounded-lg border border-black/[0.08] p-1.5 text-gray-400 hover:bg-gray-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ),
        )}

        {adding && (
          <ZoneEditor
            country={draftCountry}
            cities={draftCities}
            onCountryChange={setDraftCountry}
            onCitiesChange={setDraftCities}
            onCancel={cancelDraft}
            onSave={() => void saveDraft()}
            saving={saving}
          />
        )}
      </div>

      {!adding && (
        <button
          type="button"
          onClick={startAdd}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-2 text-[12.5px] font-semibold text-brand hover:bg-brand/5"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Ajouter un pays
        </button>
      )}
    </section>
  );
}

function ZoneEditor({
  country,
  cities,
  onCountryChange,
  onCitiesChange,
  onCancel,
  onSave,
  saving,
}: {
  country: string;
  cities: string;
  onCountryChange: (v: string) => void;
  onCitiesChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 py-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Pays"
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          autoFocus
        />
        <TextField
          label="Villes (séparées par des virgules)"
          value={cities}
          onChange={(e) => onCitiesChange(e.target.value)}
          placeholder="Cotonou, Porto-Novo, Parakou"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onSave}
          disabled={saving || !country.trim()}
          className="sm:w-auto"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="social" onClick={onCancel} className="sm:w-auto">
          <X className="h-3.5 w-3.5" aria-hidden />
          Annuler
        </Button>
      </div>
    </div>
  );
}
