'use client';

import { User, Shield, Bell, Building, FileText, CreditCard, Globe, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SettingsTabKey =
  | 'profil'
  | 'securite'
  | 'notifications'
  | 'agence'
  | 'documents'
  | 'abonnement'
  | 'langue'
  | 'apparence';

interface TabEntry {
  key: SettingsTabKey;
  label: string;
  icon: typeof User;
}

// Mirrors the Banani "Settings Page" sidenav (`.settings-sidenav`): 3 groups
// — Compte / Agence / Préférences — every entry is now a real tab, switched
// via `active`/`onSelect` (only one section renders at a time).
const ACCOUNT_TABS: TabEntry[] = [
  { key: 'profil', label: 'Profil', icon: User },
  { key: 'securite', label: 'Sécurité', icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

const AGENCY_TABS: TabEntry[] = [
  { key: 'agence', label: 'Mon agence', icon: Building },
  { key: 'documents', label: 'Documents légaux', icon: FileText },
  { key: 'abonnement', label: 'Abonnement & paiement', icon: CreditCard },
];

const PREFERENCE_TABS: TabEntry[] = [
  { key: 'langue', label: 'Langue & région', icon: Globe },
  { key: 'apparence', label: 'Apparence', icon: Palette },
];

function TabPill({
  entry,
  active,
  onSelect,
}: {
  entry: TabEntry;
  active: boolean;
  onSelect: (key: SettingsTabKey) => void;
}) {
  const Icon = entry.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.key)}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap lg:w-full',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-black/[0.08] bg-white text-neutral-700 hover:bg-gray-50',
      )}
    >
      <Icon className="h-[15px] w-[15px] flex-shrink-0" aria-hidden />
      {entry.label}
    </button>
  );
}

export function SettingsSideNav({
  active,
  onSelect,
}: {
  active: SettingsTabKey;
  onSelect: (key: SettingsTabKey) => void;
}) {
  return (
    <nav
      aria-label="Sections des paramètres"
      className="flex flex-shrink-0 gap-2 overflow-x-auto pb-1 lg:w-[232px] lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0"
    >
      <div className="flex flex-shrink-0 flex-col gap-2 lg:gap-2.5">
        <p className="font-sora hidden px-0.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase lg:block">
          Compte
        </p>
        <div className="flex flex-shrink-0 gap-2 lg:flex-col">
          {ACCOUNT_TABS.map((entry) => (
            <TabPill
              key={entry.key}
              entry={entry}
              active={active === entry.key}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col gap-2 lg:gap-2.5">
        <p className="font-sora hidden px-0.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase lg:block">
          Agence
        </p>
        <div className="flex flex-shrink-0 gap-2 lg:flex-col">
          {AGENCY_TABS.map((entry) => (
            <TabPill
              key={entry.key}
              entry={entry}
              active={active === entry.key}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col gap-2 lg:gap-2.5">
        <p className="font-sora hidden px-0.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase lg:block">
          Préférences
        </p>
        <div className="flex flex-shrink-0 gap-2 lg:flex-col">
          {PREFERENCE_TABS.map((entry) => (
            <TabPill
              key={entry.key}
              entry={entry}
              active={active === entry.key}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
