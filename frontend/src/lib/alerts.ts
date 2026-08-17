import {
  type LucideIcon,
  Home,
  Building,
  Building2,
  Store,
  LandPlot,
  TreePine,
  House,
  PartyPopper,
  Presentation,
  Landmark,
} from 'lucide-react';

export type Frequency = 'QUOTIDIENNE' | 'HEBDOMADAIRE';

export interface AlertListItem {
  id: string;
  name: string;
  transactionType: string;
  propertyTypes: string[];
  country: string;
  cities: string[];
  priceMin: number | null;
  priceMax: number | null;
  frequency: string;
  active: boolean;
  createdAt: string;
}

export interface AlertMatchRequest {
  id: string;
  transactionType: string;
  propertyType: string;
  country: string;
  city: string;
  budgetMin: number | null;
  budgetMax: number | null;
  clientName: string;
  createdAt: string;
}

export interface AlertMatchItem {
  id: string;
  createdAt: string;
  propertyRequest: AlertMatchRequest;
}

export interface AlertDetail extends AlertListItem {
  matches: AlertMatchItem[];
}

export const PROPERTY_TYPE_ICON: Record<string, LucideIcon> = {
  VILLA: Home,
  APPARTEMENT: Building,
  PARCELLE: LandPlot,
  DOMAINE: TreePine,
  MAISON: House,
  BOUTIQUE: Store,
  BUREAU: Building2,
  SALLE_FETE: PartyPopper,
  SALLE_CONFERENCE: Presentation,
  IMMEUBLE: Landmark,
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  QUOTIDIENNE: 'Quotidienne',
  HEBDOMADAIRE: 'Hebdomadaire',
};

export const COUNTRY_FLAG: Record<string, string> = {
  Bénin: '🇧🇯',
  Togo: '🇹🇬',
  Sénégal: '🇸🇳',
  "Côte d'Ivoire": '🇨🇮',
};

export function formatBudget(min: number | null, max: number | null): string {
  const fmt = (n: number) => `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} FCFA`;
  if (min) return `À partir de ${fmt(min)} FCFA`;
  if (max) return `Jusqu'à ${fmt(max)} FCFA`;
  return 'Non précisé';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
