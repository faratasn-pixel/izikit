// /settings "Langue & région" — real, persisted, but DORMANT: no i18n
// library is wired in this starter, so picking a language doesn't actually
// translate any UI text yet, and date/number format aren't applied
// anywhere yet either. See .planning/banani/langue-region.md.
'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Locale = 'fr' | 'en' | 'pt' | 'wo' | 'fon' | 'dyu';
type Currency = 'XOF_UEMOA' | 'XAF_CEMAC' | 'GHS' | 'NGN';
type DateFormat = 'DMY' | 'MDY' | 'YMD';
type NumberFormat = 'SPACE' | 'COMMA' | 'DOT';

interface Preferences {
  locale: Locale;
  timezone: string;
  currency: Currency;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  country: string | null;
  city: string | null;
}

const LANGUAGES: { key: Locale; flag: string; name: string; native: string }[] = [
  { key: 'fr', flag: '🇫🇷', name: 'Français', native: 'Français' },
  { key: 'en', flag: '🇬🇧', name: 'Anglais', native: 'English' },
  { key: 'pt', flag: '🇵🇹', name: 'Portugais', native: 'Português' },
  { key: 'wo', flag: '🇸🇳', name: 'Wolof', native: 'Wolof' },
  { key: 'fon', flag: '🇧🇯', name: 'Fon', native: 'Fɔngbè' },
  { key: 'dyu', flag: '🇨🇮', name: 'Dioula', native: 'Julakan' },
];

const CURRENCIES: { key: Currency; symbol: string; name: string }[] = [
  { key: 'XOF_UEMOA', symbol: 'FCFA', name: 'Franc CFA UEMOA' },
  { key: 'XAF_CEMAC', symbol: 'FCFA', name: 'Franc CFA CEMAC' },
  { key: 'GHS', symbol: 'GHS', name: 'Cedi ghanéen' },
  { key: 'NGN', symbol: 'NGN', name: 'Naira nigérian' },
];

const DATE_FORMATS: { key: DateFormat; label: string }[] = [
  { key: 'DMY', label: 'JJ/MM/AAAA' },
  { key: 'MDY', label: 'MM/JJ/AAAA' },
  { key: 'YMD', label: 'AAAA-MM-JJ' },
];

const NUMBER_FORMATS: { key: NumberFormat; label: string }[] = [
  { key: 'SPACE', label: '1 000 000' },
  { key: 'COMMA', label: '1,000,000' },
  { key: 'DOT', label: '1.000.000' },
];

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? 'flex items-center gap-3 rounded-lg border-[1.5px] border-brand bg-brand/5 p-3.5 text-left'
          : 'flex items-center gap-3 rounded-lg border-[1.5px] border-black/[0.08] bg-gray-50 p-3.5 text-left hover:bg-gray-100'
      }
    >
      {children}
    </button>
  );
}

export function LanguageRegionCard() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ preferences: Preferences }>('/api/preferences/regional')
      .then((res) => {
        if (!cancelled) setPrefs(res.preferences);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(section: string, patch: Partial<Preferences>) {
    setSaving(section);
    try {
      const res = await api<{ preferences: Preferences }>('/api/preferences/regional', {
        method: 'PATCH',
        body: patch,
      });
      setPrefs(res.preferences);
      toast('Préférence enregistrée.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    } finally {
      setSaving(null);
    }
  }

  if (!prefs) return <p className="py-4 text-[13px] text-gray-400">Chargement…</p>;

  return (
    <>
      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Langue d&apos;affichage
        </h2>
        <p className="mb-1 text-[13px] text-gray-500">
          Choisissez la langue dans laquelle vous souhaitez utiliser la plateforme.
        </p>
        <p className="mb-5 text-xs text-gray-400">
          La traduction complète de l&apos;interface n&apos;est pas encore disponible — cette
          préférence est enregistrée pour votre compte et sera appliquée dès qu&apos;elle le sera.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LANGUAGES.map((lang) => (
            <OptionCard
              key={lang.key}
              selected={prefs.locale === lang.key}
              onClick={() => void save('locale', { locale: lang.key })}
            >
              <span className="text-xl leading-none">{lang.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-neutral-900">
                  {lang.name}
                </div>
                <div className="text-[11.5px] text-gray-500">{lang.native}</div>
              </div>
              {prefs.locale === lang.key && (
                <Check className="h-4 w-4 flex-shrink-0 text-brand" aria-hidden />
              )}
            </OptionCard>
          ))}
        </div>
        {saving === 'locale' && <p className="mt-3 text-xs text-gray-400">Enregistrement…</p>}
      </section>

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Fuseau horaire &amp; région
        </h2>
        <p className="mb-5 text-[13px] text-gray-500">
          Paramètres géographiques utilisés pour les visites et les horodatages.
        </p>
        <RegionRow
          label="Fuseau horaire"
          desc="Utilisé pour les rappels et les créneaux de visites"
          value={prefs.timezone}
          onChange={(v) => void save('timezone', { timezone: v })}
          placeholder="Africa/Cotonou"
        />
        <RegionRow
          label="Pays principal"
          desc="Détermine les options de localisation et d'annonces par défaut"
          value={prefs.country ?? ''}
          onChange={(v) => void save('country', { country: v })}
          placeholder="Bénin"
        />
        <RegionRow
          label="Ville par défaut"
          desc="Ville affichée en priorité dans les recherches et les annonces"
          value={prefs.city ?? ''}
          onChange={(v) => void save('city', { city: v })}
          placeholder="Cotonou"
        />
      </section>

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Devise d&apos;affichage
        </h2>
        <p className="mb-5 text-[13px] text-gray-500">
          Choisissez la devise utilisée pour l&apos;affichage des prix des biens immobiliers.
        </p>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {CURRENCIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => void save('currency', { currency: c.key })}
              className={
                prefs.currency === c.key
                  ? 'flex flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-brand bg-brand/5 p-3.5'
                  : 'flex flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-black/[0.08] bg-gray-50 p-3.5 hover:bg-gray-100'
              }
            >
              <span
                className={
                  prefs.currency === c.key
                    ? 'font-sora text-lg font-semibold text-brand'
                    : 'font-sora text-lg font-semibold text-neutral-900'
                }
              >
                {c.symbol}
              </span>
              <span
                className={
                  prefs.currency === c.key
                    ? 'text-center text-[11.5px] font-medium text-brand'
                    : 'text-center text-[11.5px] font-medium text-neutral-700'
                }
              >
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Formats de date &amp; de nombre
        </h2>
        <p className="mb-5 text-[13px] text-gray-500">
          Définissez comment les dates et les chiffres sont affichés sur la plateforme.
        </p>
        <div className="mb-5">
          <p className="mb-2 text-[12.5px] font-medium text-neutral-700">Format de date</p>
          <div className="flex flex-wrap gap-2">
            {DATE_FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => void save('dateFormat', { dateFormat: f.key })}
                className={
                  prefs.dateFormat === f.key
                    ? 'rounded-lg border-[1.5px] border-brand bg-brand/5 px-4 py-2 text-[13px] font-semibold text-brand'
                    : 'rounded-lg border-[1.5px] border-black/[0.08] bg-gray-50 px-4 py-2 text-[13px] text-neutral-700 hover:bg-gray-100'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[12.5px] font-medium text-neutral-700">Format des nombres</p>
          <div className="flex flex-wrap gap-2">
            {NUMBER_FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => void save('numberFormat', { numberFormat: f.key })}
                className={
                  prefs.numberFormat === f.key
                    ? 'rounded-lg border-[1.5px] border-brand bg-brand/5 px-4 py-2 text-[13px] font-semibold text-brand'
                    : 'rounded-lg border-[1.5px] border-black/[0.08] bg-gray-50 px-4 py-2 text-[13px] text-neutral-700 hover:bg-gray-100'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function RegionRow({
  label,
  desc,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  desc: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <div className="flex flex-col gap-2.5 border-b border-black/[0.06] py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex-1">
        <div className="text-[13.5px] font-medium text-neutral-900">{label}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
      <div className="flex gap-2 sm:w-64">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[13px] text-neutral-900"
        />
        {draft !== value && (
          <button
            type="button"
            onClick={() => onChange(draft)}
            className="rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand/90"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
