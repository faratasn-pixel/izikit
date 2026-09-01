export type ContactStatus = 'EN_ATTENTE' | 'REPONDU' | 'VISITE_PLANIFIEE' | 'NON_QUALIFIE';

export interface ContactListing {
  id: string;
  title: string;
  city: string;
  country: string;
  transactionType: string;
  price: number;
  currency: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  type: string;
  status: ContactStatus;
  notes: string | null;
  createdAt: string;
  listing: ContactListing;
}

export interface ContactStats {
  total: number;
  nouveaux7j: number;
  enAttente: number;
  tauxConversion: number;
}

export const STATUS_LABEL: Record<ContactStatus, string> = {
  EN_ATTENTE: 'En attente',
  REPONDU: 'Répondu',
  VISITE_PLANIFIEE: 'Visite planifiée',
  NON_QUALIFIE: 'Non qualifié',
};

export const STATUS_BADGE_CLASS: Record<ContactStatus, string> = {
  EN_ATTENTE: 'bg-amber-100 text-amber-800',
  REPONDU: 'bg-emerald-100 text-emerald-800',
  VISITE_PLANIFIEE: 'bg-emerald-100 text-emerald-800',
  NON_QUALIFIE: 'bg-red-100 text-red-700',
};

export function formatContactDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
