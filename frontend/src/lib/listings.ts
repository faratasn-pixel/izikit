export interface Listing {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  transactionType: string;
  price: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface ListingCounts {
  total: number;
  verified: number;
  pending: number;
  sold: number;
}

/**
 * Injects Cloudinary's f_auto,q_auto (+ optional width cap) into a
 * delivery URL to cut bandwidth — the biggest cost driver on Cloudinary's
 * metered plans since photos are served at upload resolution otherwise.
 * No-ops on non-Cloudinary URLs (anything without the `/upload/` segment).
 */
export function cloudinaryOptimize(url: string, width?: number): string {
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const transform = width ? `f_auto,q_auto,w_${width}` : 'f_auto,q_auto';
  return `${url.slice(0, idx + marker.length)}${transform}/${url.slice(idx + marker.length)}`;
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  VILLA: 'Villa',
  APPARTEMENT: 'Appartement',
  PARCELLE: 'Parcelle',
  DOMAINE: 'Domaine',
  MAISON: 'Maison',
  BOUTIQUE: 'Boutique',
  BUREAU: 'Bureau',
  SALLE_FETE: 'Salle de fête',
  SALLE_CONFERENCE: 'Salle de conférence',
  IMMEUBLE: 'Immeuble',
};

export const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  VENTE: 'Vente',
  LOCATION: 'Location',
  SEJOUR: 'Séjour',
  AUBERGE: 'Auberge',
};

export const STANDING_LABEL: Record<string, string> = {
  BASIC: 'Standard',
  MID: 'Moyen standing',
  HIGH: 'Haut standing',
};

export const AMENITY_LABEL: Record<string, string> = {
  POOL: 'Piscine',
  PARKING: 'Parking / Garage',
  AC: 'Climatisation',
  GARDEN: 'Jardin / Cour',
  GENERATOR: 'Groupe électrogène',
  RUNNING_WATER: 'Eau courante',
  SECURITY: 'Gardiennage',
  TERRACE: 'Terrasse',
  FIBER: 'Fibre internet',
  ELEVATOR: 'Ascenseur',
  INTERCOM: 'Interphone',
  FITTED_KITCHEN: 'Cuisine équipée',
};

export const LISTING_DOCUMENT_TYPE_LABEL: Record<string, string> = {
  LAND_TITLE: 'Titre foncier',
  SALE_MANDATE: 'Mandat de vente',
  CADASTRAL_PLAN: 'Plan cadastral',
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  VERIFIED: 'Vérifié',
  PENDING: 'En attente',
  SOLD: 'Vendu',
};

export const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: STATUS_LABEL.DRAFT!, className: 'bg-gray-100 text-gray-600' },
  VERIFIED: {
    label: `✓ ${STATUS_LABEL.VERIFIED!}`,
    className: 'bg-emerald-100 text-emerald-800',
  },
  PENDING: {
    label: `⏳ ${STATUS_LABEL.PENDING!}`,
    className: 'bg-amber-100 text-amber-800',
  },
  SOLD: { label: STATUS_LABEL.SOLD!, className: 'bg-red-100 text-red-800' },
};

/** Format a listing price stored in its smallest currency unit (e.g. XOF has no decimals). */
export function formatListingPrice(price: number, currency: string): string {
  return `${price.toLocaleString('fr-FR')} ${currency === 'XOF' ? 'FCFA' : currency}`;
}
