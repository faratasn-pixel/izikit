'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';

// The eventType keys below don't have any notification-sending code behind
// them yet (Messages/Visites/annonce-status-change features don't exist in
// this starter). They're still real, persisted toggles — the free-form JSON
// shape of NotificationPreferences.prefs means writing these keys today
// costs nothing and takes effect automatically the moment those features
// ship, instead of needing a second settings-UI pass later.
const NOTIF_ROWS: { key: string; label: string; description: string }[] = [
  {
    key: 'message.new',
    label: 'Nouveaux messages',
    description: "Recevoir une alerte à chaque nouveau message d'un contact",
  },
  {
    key: 'visit.requested',
    label: 'Demandes de visite',
    description: 'Être notifié lorsqu’un prospect demande à visiter un bien',
  },
  {
    key: 'listing.status_changed',
    label: 'Statut des annonces',
    description: "Alertes lors du changement de statut d'une annonce",
  },
  {
    key: 'visit.reminder',
    label: 'Rappels de visites',
    description: 'Recevoir un rappel 24h avant chaque visite programmée',
  },
  {
    key: 'newsletter',
    label: 'Newsletter & actualités',
    description: 'Conseils immobiliers et nouvelles fonctionnalités de la plateforme',
  },
];

interface PrefsResponse {
  prefs: Record<string, { email?: boolean; inApp?: boolean }>;
}

export function NotificationsCard() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<PrefsResponse>('/api/notifications/prefs')
      .then((res) => {
        if (cancelled) return;
        const next: Record<string, boolean> = {};
        // Opt-out default: a missing eventType is treated as enabled.
        for (const row of NOTIF_ROWS) {
          next[row.key] = res.prefs[row.key]?.inApp !== false;
        }
        setValues(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: Record<string, boolean> = {};
        for (const row of NOTIF_ROWS) next[row.key] = true;
        setValues(next);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    setSubmitting(true);
    try {
      const prefs: Record<string, { email: boolean; inApp: boolean }> = {};
      for (const row of NOTIF_ROWS) {
        prefs[row.key] = { email: values[row.key] ?? true, inApp: values[row.key] ?? true };
      }
      await api('/api/notifications/prefs', { method: 'PATCH', body: { prefs } });
      toast('Préférences de notification enregistrées.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl bg-white p-6 lg:p-7">
      <h2 className="font-sora text-[15px] font-semibold text-neutral-900">Notifications</h2>
      <p className="mb-2 text-[13px] text-gray-500">
        Choisissez les alertes que vous souhaitez recevoir.
      </p>

      <div className="divide-y divide-black/[0.06]">
        {NOTIF_ROWS.map((row) => (
          <div key={row.key} className="flex items-center gap-4 py-3.5">
            <div className="flex-1">
              <div className="text-[13.5px] font-medium text-neutral-900">{row.label}</div>
              <div className="text-xs text-gray-500">{row.description}</div>
            </div>
            <Toggle
              label={row.label}
              checked={values[row.key] ?? true}
              disabled={!loaded}
              onChange={(checked) => setValues((v) => ({ ...v, [row.key]: checked }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end border-t border-black/[0.06] pt-4">
        <Button
          type="button"
          onClick={() => void onSave()}
          disabled={submitting || !loaded}
          className="sm:w-auto"
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer les préférences'}
        </Button>
      </div>
    </section>
  );
}
