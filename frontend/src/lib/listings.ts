export interface Listing {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  price: number;
  currency: string;
  status: string;
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  VILLA: 'Villa',
  APARTMENT: 'Appartement',
  LAND: 'Terrain',
  DUPLEX: 'Duplex',
  OFFICE: 'Bureau',
};

export const STATUS_LABEL: Record<string, string> = {
  VERIFIED: 'Vérifié',
  PENDING: 'En attente',
  SOLD: 'Vendu',
};

export const STATUS_STYLE: Record<string, { label: string; className: string }> = {
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
