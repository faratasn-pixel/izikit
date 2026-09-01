// /settings — Banani "Settings Page" (screenId OH2_l1aYeEhL), see
// .planning/banani/settings-page.md for the full design plan and the
// product decisions behind each card (2FA/KYC placeholders, real session
// revoke, real notification toggles, real danger zone via anonymization).
//
// The Banani mockup ships a persistent settings sub-nav (`.settings-sidenav`:
// Compte / Agence / Préférences groups) alongside the content. "Compte"
// entries (Profil/Sécurité/Notifications), "Mon agence" and "Documents
// légaux" are real tabs — only the selected section renders, per the user's
// explicit ask. Danger zone lives under Sécurité (thematically
// account-security, confirmed with the user rather than assumed). "Mon
// agence" itself ships identity + zones for real this pass (logo upload +
// team invites are phase 2 — see .planning/banani/mon-agence.md). "Documents
// légaux" ships real upload + status for real this pass (admin verification
// is phase 2 — see .planning/banani/documents-legaux.md). "Abonnement &
// paiement" ships a real plan + real one-time-charge plan change via the
// existing Order/Bictorys pipeline (jetons VR/moyens de paiement/historique
// stay illustrative — see .planning/banani/abonnement-paiement.md). "Langue
// & région" and "Apparence" both ship real, persisted preferences —
// dormant until an i18n library / dark-mode CSS is wired, respectively (see
// .planning/banani/langue-region.md and apparence-settings.md). Every
// SettingsSideNav entry is now a real tab — none render inert anymore.
'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useUser } from '@/contexts/AuthContext';
import { SettingsSideNav, type SettingsTabKey } from '@/components/settings/SettingsSideNav';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { SecurityCard } from '@/components/settings/SecurityCard';
import { NotificationsCard } from '@/components/settings/NotificationsCard';
import { DangerZoneCard } from '@/components/settings/DangerZoneCard';
import { AgencyCard } from '@/components/settings/AgencyCard';
import { AgencyZonesCard } from '@/components/settings/AgencyZonesCard';
import { AgencyTeamCard } from '@/components/settings/AgencyTeamCard';
import { LegalDocumentsCard } from '@/components/settings/LegalDocumentsCard';
import { SubscriptionCard } from '@/components/settings/SubscriptionCard';
import { TokensCard } from '@/components/settings/TokensCard';
import { PaymentMethodsCard } from '@/components/settings/PaymentMethodsCard';
import { PaymentHistoryCard } from '@/components/settings/PaymentHistoryCard';
import { LanguageRegionCard } from '@/components/settings/LanguageRegionCard';
import { AppearanceCard } from '@/components/settings/AppearanceCard';

export default function SettingsPage() {
  const user = useUser();
  const [tab, setTab] = useState<SettingsTabKey>('profil');
  if (!user) return null;

  return (
    <DashboardShell active="settings" searchPlaceholder="Rechercher…">
      <div className="mb-1">
        <h1 className="font-sora text-xl font-semibold text-neutral-900">Paramètres</h1>
        <p className="text-[13.5px] text-gray-500">
          Gérez vos informations personnelles et professionnelles.
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <SettingsSideNav active={tab} onSelect={setTab} />

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {tab === 'profil' && <ProfileCard user={user} />}
          {tab === 'securite' && (
            <>
              <SecurityCard user={user} />
              <DangerZoneCard user={user} />
            </>
          )}
          {tab === 'notifications' && <NotificationsCard />}
          {tab === 'agence' && (
            <>
              <AgencyCard />
              <AgencyZonesCard />
              <AgencyTeamCard />
            </>
          )}
          {tab === 'documents' && <LegalDocumentsCard />}
          {tab === 'abonnement' && (
            <>
              <SubscriptionCard />
              <TokensCard />
              <PaymentMethodsCard />
              <PaymentHistoryCard />
            </>
          )}
          {tab === 'langue' && <LanguageRegionCard />}
          {tab === 'apparence' && <AppearanceCard />}
        </div>
      </div>
    </DashboardShell>
  );
}
