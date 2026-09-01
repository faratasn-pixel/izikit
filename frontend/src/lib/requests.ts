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

export type Status = 'EN_ATTENTE' | 'EN_COURS' | 'CLOTUREE';
export type Priority = 'Urgent' | 'Normale' | 'Basse';

export interface PropertyRequestListItem {
  id: string;
  transactionType: string;
  propertyType: string;
  country: string;
  city: string;
  budgetMin: number | null;
  budgetMax: number | null;
  priority: string;
  status: string;
  clientName: string;
  clientPhone: string;
  createdAt: string;
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

export const STATUS_LABEL: Record<Status, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  CLOTUREE: 'Clôturée',
};

export const STATUS_BADGE_CLASS: Record<Status, string> = {
  EN_ATTENTE: 'bg-amber-100 text-amber-800',
  EN_COURS: 'bg-emerald-100 text-emerald-800',
  CLOTUREE: 'bg-gray-200 text-gray-700',
};

export const PRIORITY_STYLE: Record<Priority, { dot: string; text: string; badge: string }> = {
  Urgent: { dot: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  Normale: { dot: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  Basse: { dot: 'bg-gray-400', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' },
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
