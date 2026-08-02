// /settings "Apparence" — real, persisted, but DORMANT: this starter ships
// zero dark-mode CSS anywhere, so none of these preferences actually
// restyle the app yet. See .planning/banani/apparence-settings.md.
'use client';

import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';

type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';
type FontScale = 'SMALL' | 'NORMAL' | 'LARGE';
type Density = 'COMPACT' | 'NORMAL' | 'SPACIOUS';
type SidebarStyle = 'EXPANDED' | 'COMPACT';

interface Preferences {
  theme: Theme;
  accentColor: string;
  fontScale: FontScale;
  density: Density;
  sidebarStyle: SidebarStyle;
  animationsEnabled: boolean;
  hoverEffectsEnabled: boolean;
  reduceMotion: boolean;
}

const THEMES: { key: Theme; icon: typeof Sun; name: string; desc: string }[] = [
  { key: 'LIGHT', icon: Sun, name: 'Clair', desc: 'Interface lumineuse par défaut' },
  { key: 'DARK', icon: Moon, name: 'Sombre', desc: 'Interface en mode nuit' },
  { key: 'SYSTEM', icon: Monitor, name: 'Système', desc: "Suit les préférences de l'OS" },
];

const ACCENT_SWATCHES = [
  '#376BFF',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#14B8A6',
  '#111827',
];

const FONT_SCALES: { key: FontScale; label: string }[] = [
  { key: 'SMALL', label: 'Petit' },
  { key: 'NORMAL', label: 'Normal' },
  { key: 'LARGE', label: 'Grand' },
];

const DENSITIES: { key: Density; name: string; desc: string }[] = [
  { key: 'COMPACT', name: 'Compact', desc: "Plus d'éléments visibles" },
  { key: 'NORMAL', name: 'Normal', desc: 'Équilibre confort / espace' },
  { key: 'SPACIOUS', name: 'Aéré', desc: 'Idéal pour les grands écrans' },
];

const SIDEBAR_STYLES: { key: SidebarStyle; name: string; desc: string }[] = [
  { key: 'EXPANDED', name: 'Développée', desc: 'Texte et icônes visibles' },
  { key: 'COMPACT', name: 'Compacte', desc: 'Icônes uniquement' },
];

export function AppearanceCard() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [animDraft, setAnimDraft] = useState<Pick<
    Preferences,
    'animationsEnabled' | 'hoverEffectsEnabled' | 'reduceMotion'
  > | null>(null);
  const [savingAnim, setSavingAnim] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ preferences: Preferences }>('/api/preferences/appearance')
      .then((res) => {
        if (cancelled) return;
        setPrefs(res.preferences);
        setAnimDraft({
          animationsEnabled: res.preferences.animationsEnabled,
          hoverEffectsEnabled: res.preferences.hoverEffectsEnabled,
          reduceMotion: res.preferences.reduceMotion,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(patch: Partial<Preferences>) {
    try {
      const res = await api<{ preferences: Preferences }>('/api/preferences/appearance', {
        method: 'PATCH',
        body: patch,
      });
      setPrefs(res.preferences);
      toast('Préférence enregistrée.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    }
  }

  async function saveAnimations() {
    if (!animDraft) return;
    setSavingAnim(true);
    try {
      const res = await api<{ preferences: Preferences }>('/api/preferences/appearance', {
        method: 'PATCH',
        body: animDraft,
      });
      setPrefs(res.preferences);
      toast('Préférences enregistrées.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    } finally {
      setSavingAnim(false);
    }
  }

  if (!prefs || !animDraft) return <p className="py-4 text-[13px] text-gray-400">Chargement…</p>;

  return (
    <>
      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Thème de l&apos;interface
        </h2>
        <p className="mb-1 text-[13px] text-gray-500">
          Choisissez le mode d&apos;affichage qui vous convient le mieux.
        </p>
        <p className="mb-5 text-xs text-gray-400">
          Le mode sombre n&apos;est pas encore implémenté visuellement — cette préférence est
          enregistrée pour votre compte et s&apos;appliquera dès que ce sera le cas.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => void save({ theme: t.key })}
              className={
                prefs.theme === t.key
                  ? 'flex flex-col items-center gap-2 rounded-lg border-2 border-brand bg-brand/5 p-5'
                  : 'flex flex-col items-center gap-2 rounded-lg border-2 border-black/[0.08] bg-gray-50 p-5 hover:bg-gray-100'
              }
            >
              <t.icon
                className={prefs.theme === t.key ? 'h-6 w-6 text-brand' : 'h-6 w-6 text-gray-500'}
                aria-hidden
              />
              <div className="text-center">
                <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-neutral-900">
                  {t.name}
                  {prefs.theme === t.key && (
                    <Check className="h-3.5 w-3.5 text-brand" aria-hidden />
                  )}
                </div>
                <div className="text-[11.5px] text-gray-500">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Couleur d&apos;accentuation
        </h2>
        <p className="mb-5 text-[13px] text-gray-500">
          Couleur utilisée pour les boutons, liens et éléments interactifs.
        </p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => void save({ accentColor: color })}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: color,
                boxShadow:
                  prefs.accentColor.toLowerCase() === color.toLowerCase()
                    ? '0 0 0 3px #111827'
                    : undefined,
              }}
            >
              {prefs.accentColor.toLowerCase() === color.toLowerCase() && (
                <Check className="h-4 w-4 text-white" aria-hidden />
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">Typographie</h2>
        <p className="mb-5 text-[13px] text-gray-500">
          Ajustez la taille du texte pour une meilleure lisibilité.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[12.5px] font-medium text-neutral-700">Taille du texte</span>
          <div className="flex gap-2">
            {FONT_SCALES.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => void save({ fontScale: f.key })}
                className={
                  prefs.fontScale === f.key
                    ? 'rounded-lg bg-brand px-4 py-1.5 text-[13px] font-semibold text-white'
                    : 'rounded-lg border border-black/[0.08] bg-white px-4 py-1.5 text-[13px] text-neutral-700 hover:bg-gray-50'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Densité de l&apos;interface
        </h2>
        <p className="mb-5 text-[13px] text-gray-500">
          Définissez l&apos;espacement et la compacité des éléments.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {DENSITIES.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => void save({ density: d.key })}
              className={
                prefs.density === d.key
                  ? 'rounded-lg border-2 border-brand bg-brand/5 p-4 text-left'
                  : 'rounded-lg border-2 border-black/[0.08] bg-gray-50 p-4 text-left hover:bg-gray-100'
              }
            >
              <div className="text-[13px] font-semibold text-neutral-900">{d.name}</div>
              <div className="text-[11.5px] text-gray-500">{d.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Style de la barre latérale
        </h2>
        <p className="mb-5 text-[13px] text-gray-500">
          Choisissez comment la navigation latérale est affichée.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SIDEBAR_STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => void save({ sidebarStyle: s.key })}
              className={
                prefs.sidebarStyle === s.key
                  ? 'rounded-lg border-2 border-brand bg-brand/5 p-4 text-left'
                  : 'rounded-lg border-2 border-black/[0.08] bg-gray-50 p-4 text-left hover:bg-gray-100'
              }
            >
              <div className="text-[13px] font-semibold text-neutral-900">{s.name}</div>
              <div className="text-[11.5px] text-gray-500">{s.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">
          Animations &amp; transitions
        </h2>
        <p className="mb-2 text-[13px] text-gray-500">
          Contrôlez les effets visuels de l&apos;interface.
        </p>

        <div className="divide-y divide-black/[0.06]">
          <div className="flex items-center gap-4 py-3.5">
            <div className="flex-1">
              <div className="text-[13.5px] font-medium text-neutral-900">
                Animations de l&apos;interface
              </div>
              <div className="text-xs text-gray-500">
                Transitions fluides lors de la navigation entre les pages
              </div>
            </div>
            <Toggle
              label="Animations de l'interface"
              checked={animDraft.animationsEnabled}
              onChange={(checked) =>
                setAnimDraft((d) => (d ? { ...d, animationsEnabled: checked } : d))
              }
            />
          </div>
          <div className="flex items-center gap-4 py-3.5">
            <div className="flex-1">
              <div className="text-[13.5px] font-medium text-neutral-900">Effets de survol</div>
              <div className="text-xs text-gray-500">
                Mise en surbrillance des éléments interactifs
              </div>
            </div>
            <Toggle
              label="Effets de survol"
              checked={animDraft.hoverEffectsEnabled}
              onChange={(checked) =>
                setAnimDraft((d) => (d ? { ...d, hoverEffectsEnabled: checked } : d))
              }
            />
          </div>
          <div className="flex items-center gap-4 py-3.5">
            <div className="flex-1">
              <div className="text-[13.5px] font-medium text-neutral-900">
                Réduire les animations
              </div>
              <div className="text-xs text-gray-500">
                Pour les utilisateurs sensibles aux mouvements à l&apos;écran
              </div>
            </div>
            <Toggle
              label="Réduire les animations"
              checked={animDraft.reduceMotion}
              onChange={(checked) => setAnimDraft((d) => (d ? { ...d, reduceMotion: checked } : d))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end border-t border-black/[0.06] pt-4">
          <Button
            type="button"
            onClick={() => void saveAnimations()}
            disabled={savingAnim}
            className="sm:w-auto"
          >
            {savingAnim ? 'Enregistrement…' : 'Enregistrer les préférences'}
          </Button>
        </div>
      </section>
    </>
  );
}
