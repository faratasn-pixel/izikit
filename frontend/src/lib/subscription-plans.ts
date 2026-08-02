// Single source of truth for the 3 subscription plans (Banani "Abonnement &
// Paiement" screen). Shared between the API routes (validate `planKey`,
// resolve the charge amount) and the settings UI (render the plan cards) so
// price/features never drift between what's charged and what's displayed.
// No secrets here — safe to import from client components.

export const PLAN_KEYS = ['FREE', 'PRO_AGENT', 'AGENCY_PREMIUM'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export interface PlanDefinition {
  key: PlanKey;
  label: string;
  description: string;
  priceFcfa: number; // 0 for the free plan; smallest currency unit (FCFA has no decimals)
  features: string[];
}

export const SUBSCRIPTION_CURRENCY = 'XOF';

export const PLAN_CATALOG: Record<PlanKey, PlanDefinition> = {
  FREE: {
    key: 'FREE',
    label: 'Gratuit',
    description: 'Pour démarrer et tester la plateforme',
    priceFcfa: 0,
    features: ['3 annonces publiées', 'Messagerie basique'],
  },
  PRO_AGENT: {
    key: 'PRO_AGENT',
    label: 'Pro Agent',
    description: 'Pour les agents actifs avec un portefeuille établi',
    priceFcfa: 29_900,
    features: [
      '30 annonces publiées',
      'Messagerie avancée',
      '5 visites virtuelles/mois',
      'Statistiques complètes',
    ],
  },
  AGENCY_PREMIUM: {
    key: 'AGENCY_PREMIUM',
    label: 'Agence Premium',
    description: 'Pour les agences à fort volume et multi-agents',
    priceFcfa: 89_900,
    features: [
      'Annonces illimitées',
      "Jusqu'à 10 agents",
      'Visites VR illimitées',
      'Statistiques avancées',
      'Support dédié 24/7',
    ],
  },
};

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && (PLAN_KEYS as readonly string[]).includes(value);
}
