import {
  type LucideIcon,
  Home,
  Building,
  Warehouse,
  Building2,
  Expand,
  BedDouble,
  Bath,
  Trees,
  Car,
  Waves,
  CalendarX,
  MapPin,
} from 'lucide-react';

export type PropertyType = 'Villa' | 'Appartement' | 'Terrain' | 'Bureau' | 'Local commercial';
export type Transaction = 'VENTE' | 'LOCATION';
export type Priority = 'URGENT' | 'NORMALE' | 'BASSE';
export type Status = 'EN_ATTENTE' | 'EN_COURS' | 'CLOTUREE';
export type ClientKind = 'Particulier' | 'Entreprise';

export interface CriterionItem {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}

export interface TimelineEvent {
  event: string;
  meta: string;
  filled: boolean;
}

export interface SuggestedListing {
  imageUrl: string;
  title: string;
  price: string;
}

export interface PropertyRequest {
  id: string;
  ref: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientKind: ClientKind;
  avatarUrl: string;
  propertyType: PropertyType;
  flag: string;
  country: string;
  zone: string;
  budget: string;
  surfaceMin: string;
  bedroomsMin: string;
  transaction: Transaction;
  priority: Priority;
  status: Status;
  date: string;
  submittedLabel: string;
  title: string;
  description: string;
  criteria: CriterionItem[];
  timeline: TimelineEvent[];
  internalNotes: string;
  suggestedListings: SuggestedListing[];
}

export const PROPERTY_TYPE_ICON: Record<PropertyType, LucideIcon> = {
  Villa: Home,
  Appartement: Building,
  Terrain: Warehouse,
  Bureau: Building2,
  'Local commercial': Building2,
};

export const PRIORITY_STYLE: Record<Priority, { label: string; dot: string; text: string }> = {
  URGENT: { label: 'Urgent', dot: 'bg-red-500', text: 'text-red-600' },
  NORMALE: { label: 'Normale', dot: 'bg-amber-500', text: 'text-amber-600' },
  BASSE: { label: 'Basse', dot: 'bg-gray-400', text: 'text-gray-500' },
};

export const STATUS_LABEL: Record<Status, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  CLOTUREE: 'Clôturée',
};

export const TRANSACTION_BADGE: Record<Transaction, { label: string; className: string }> = {
  VENTE: { label: 'Vente', className: 'bg-brand/10 text-brand' },
  LOCATION: { label: 'Location', className: 'bg-emerald-50 text-emerald-700' },
};

// Static demo data mirroring the Banani "Demande Immobilière Agent" (list)
// and "Demande Detail" mockups — no PropertyRequest model exists yet, this
// is front-end only per user request. `r1` (Kouassi Brou / DEM-2025-001) is
// the literal record from the fetched "Demande Detail" screen; the other 7
// requests get shorter, illustrative detail content built to match the same
// shape (description/criteria/timeline/notes), reusing their list-row data.
export const MOCK_REQUESTS: PropertyRequest[] = [
  {
    id: 'r1',
    ref: 'DEM-2025-001',
    clientName: 'Kouassi Brou',
    clientPhone: '+225 07 45 12 38',
    clientEmail: 'kouassi.brou@gmail.com',
    clientAddress: "Abidjan, Côte d'Ivoire",
    clientKind: 'Particulier',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F1',
    propertyType: 'Villa',
    flag: '🇨🇮',
    country: "Côte d'Ivoire",
    zone: 'Cocody, Abidjan',
    budget: '80M – 150M FCFA',
    surfaceMin: '250 m²',
    bedroomsMin: '4 chambres',
    transaction: 'VENTE',
    priority: 'URGENT',
    status: 'EN_ATTENTE',
    date: '12 jan. 2025',
    submittedLabel: 'Soumise le 12 janvier 2025',
    title: "Recherche d'une villa à Cocody, Abidjan",
    description:
      "Je recherche une villa spacieuse dans le quartier de Cocody, de préférence près des zones résidentielles de Riviera ou Angré. Le bien doit disposer d'un jardin, d'un parking pour au moins 2 voitures et idéalement d'une piscine. La propriété doit être en bon état ou récemment rénovée. Je suis flexible sur la date d'acquisition mais souhaite finaliser la transaction avant fin mars 2025.",
    criteria: [
      {
        icon: Expand,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Surface',
        value: '250 m² minimum',
      },
      {
        icon: BedDouble,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Chambres',
        value: '4 minimum',
      },
      {
        icon: Bath,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Salles de bain',
        value: '3 minimum',
      },
      {
        icon: Trees,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-800',
        label: 'Jardin',
        value: 'Indispensable',
      },
      {
        icon: Car,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-800',
        label: 'Parking',
        value: '2 voitures min.',
      },
      {
        icon: Waves,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        label: 'Piscine',
        value: 'Souhaitable',
      },
      {
        icon: CalendarX,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        label: "Délai d'acquisition",
        value: 'Avant mars 2025',
      },
      {
        icon: MapPin,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Quartier préféré',
        value: 'Riviera ou Angré',
      },
    ],
    timeline: [
      {
        event: 'Demande créée',
        meta: '12 jan. 2025 à 14h32 — Kouassi Brou (client)',
        filled: true,
      },
      {
        event: 'Demande assignée à Kofi Mensah',
        meta: '12 jan. 2025 à 15h10 — Système automatique',
        filled: true,
      },
      {
        event: 'Premier contact pris avec le client',
        meta: '13 jan. 2025 à 10h05 — Kofi Mensah (agent)',
        filled: true,
      },
      {
        event: 'Budget mis à jour (70M → 80M FCFA min.)',
        meta: '13 jan. 2025 à 11h22 — Kofi Mensah (agent)',
        filled: false,
      },
      {
        event: "3 propositions d'annonces envoyées au client",
        meta: '14 jan. 2025 à 09h48 — Kofi Mensah (agent)',
        filled: false,
      },
    ],
    internalNotes:
      'Client très sérieux, budget confirmé par virement. Préfère les visites le week-end. A déjà visité 2 villas à Riviera — non retenues car trop petites.',
    suggestedListings: [
      {
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/a8ffb511-7c17-4998-b3ba-a221b48ffdd4.jpg',
        title: 'Villa 5 pièces – Riviera 3',
        price: '120 000 000 FCFA',
      },
      {
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/431c1324-e0ee-42fe-984e-9a942a8a11ba.jpg',
        title: 'Villa avec piscine – Angré 8',
        price: '145 000 000 FCFA',
      },
      {
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/4281ba52-aa6b-4b43-be67-54a104303216.jpg',
        title: 'Villa 4ch – Cocody Ambassades',
        price: '98 000 000 FCFA',
      },
    ],
  },
  {
    id: 'r2',
    ref: 'DEM-2025-002',
    clientName: 'Aminata Diallo',
    clientPhone: '+221 77 832 10 45',
    clientEmail: 'aminata.diallo@gmail.com',
    clientAddress: 'Dakar, Sénégal',
    clientKind: 'Particulier',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F2',
    propertyType: 'Appartement',
    flag: '🇸🇳',
    country: 'Sénégal',
    zone: 'Almadies, Dakar',
    budget: '20M – 50M FCFA',
    surfaceMin: '80 m²',
    bedroomsMin: '2 chambres',
    transaction: 'LOCATION',
    priority: 'NORMALE',
    status: 'EN_COURS',
    date: '10 jan. 2025',
    submittedLabel: 'Soumise le 10 janvier 2025',
    title: 'Recherche un appartement meublé à Almadies, Dakar',
    description:
      'Cliente recherche un appartement meublé de 2 chambres proche des Almadies, idéalement avec vue mer ou dégagée. Budget location mensuelle, disponibilité souhaitée sous 1 mois.',
    criteria: [
      {
        icon: Expand,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Surface',
        value: '80 m² minimum',
      },
      {
        icon: BedDouble,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Chambres',
        value: '2 minimum',
      },
      {
        icon: MapPin,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Quartier préféré',
        value: 'Almadies',
      },
    ],
    timeline: [
      {
        event: 'Demande créée',
        meta: '10 jan. 2025 à 09h15 — Aminata Diallo (client)',
        filled: true,
      },
      {
        event: 'Demande assignée à Kofi Mensah',
        meta: '10 jan. 2025 à 09h40 — Système automatique',
        filled: true,
      },
      {
        event: 'Premier contact pris avec le client',
        meta: '11 jan. 2025 à 16h20 — Kofi Mensah (agent)',
        filled: false,
      },
    ],
    internalNotes: 'Aucune note pour le moment.',
    suggestedListings: [],
  },
  {
    id: 'r3',
    ref: 'DEM-2025-003',
    clientName: 'Koffi Agbenyega',
    clientPhone: '+228 90 12 34 56',
    clientEmail: 'koffi.agbenyega@gmail.com',
    clientAddress: 'Lomé, Togo',
    clientKind: 'Particulier',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F5',
    propertyType: 'Terrain',
    flag: '🇹🇬',
    country: 'Togo',
    zone: 'Bè, Lomé',
    budget: '30M – 70M FCFA',
    surfaceMin: '500 m²',
    bedroomsMin: '—',
    transaction: 'VENTE',
    priority: 'URGENT',
    status: 'EN_ATTENTE',
    date: '09 jan. 2025',
    submittedLabel: 'Soumise le 9 janvier 2025',
    title: 'Recherche un terrain titré à Bè, Lomé',
    description:
      "Client souhaite acquérir un terrain titré d'au moins 500 m² dans le quartier de Bè, en vue d'une construction résidentielle. Titre foncier obligatoire, pas de terrain coutumier.",
    criteria: [
      {
        icon: Expand,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Surface',
        value: '500 m² minimum',
      },
      {
        icon: MapPin,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Quartier préféré',
        value: 'Bè',
      },
      {
        icon: CalendarX,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        label: "Délai d'acquisition",
        value: 'Sous 2 mois',
      },
    ],
    timeline: [
      {
        event: 'Demande créée',
        meta: '9 jan. 2025 à 11h00 — Koffi Agbenyega (client)',
        filled: true,
      },
      {
        event: 'Demande assignée à Kofi Mensah',
        meta: '9 jan. 2025 à 11h30 — Système automatique',
        filled: true,
      },
    ],
    internalNotes: 'Aucune note pour le moment.',
    suggestedListings: [],
  },
  {
    id: 'r4',
    ref: 'DEM-2025-004',
    clientName: 'Fatoumata Koné',
    clientPhone: '+225 05 67 89 01',
    clientEmail: 'fatoumata.kone@gmail.com',
    clientAddress: "Abidjan, Côte d'Ivoire",
    clientKind: 'Entreprise',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F4',
    propertyType: 'Bureau',
    flag: '🇨🇮',
    country: "Côte d'Ivoire",
    zone: 'Plateau, Abidjan',
    budget: '5M – 12M FCFA/an',
    surfaceMin: '120 m²',
    bedroomsMin: '—',
    transaction: 'LOCATION',
    priority: 'BASSE',
    status: 'EN_COURS',
    date: '07 jan. 2025',
    submittedLabel: 'Soumise le 7 janvier 2025',
    title: 'Recherche un bureau au Plateau, Abidjan',
    description:
      'Entreprise cherche un espace de bureau au Plateau pour une équipe de 10 personnes, avec parking et climatisation centralisée.',
    criteria: [
      {
        icon: Expand,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Surface',
        value: '120 m² minimum',
      },
      {
        icon: Car,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-800',
        label: 'Parking',
        value: 'Indispensable',
      },
    ],
    timeline: [
      {
        event: 'Demande créée',
        meta: '7 jan. 2025 à 08h50 — Fatoumata Koné (client)',
        filled: true,
      },
      {
        event: 'Demande assignée à Kofi Mensah',
        meta: '7 jan. 2025 à 09h05 — Système automatique',
        filled: true,
      },
      {
        event: 'Premier contact pris avec le client',
        meta: '8 jan. 2025 à 14h10 — Kofi Mensah (agent)',
        filled: false,
      },
    ],
    internalNotes: 'Aucune note pour le moment.',
    suggestedListings: [],
  },
  {
    id: 'r5',
    ref: 'DEM-2025-005',
    clientName: 'Moussa Traoré',
    clientPhone: '+229 96 23 45 67',
    clientEmail: 'moussa.traore@gmail.com',
    clientAddress: 'Cotonou, Bénin',
    clientKind: 'Particulier',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F50-65%2FAfrican%2F6',
    propertyType: 'Villa',
    flag: '🇧🇯',
    country: 'Bénin',
    zone: 'Cotonou',
    budget: '100M – 250M FCFA',
    surfaceMin: '300 m²',
    bedroomsMin: '5 chambres',
    transaction: 'VENTE',
    priority: 'NORMALE',
    status: 'EN_ATTENTE',
    date: '05 jan. 2025',
    submittedLabel: 'Soumise le 5 janvier 2025',
    title: 'Recherche une grande villa familiale à Cotonou',
    description:
      'Client recherche une villa familiale haut de gamme à Cotonou, minimum 5 chambres, avec dépendance pour le personnel de maison.',
    criteria: [
      {
        icon: Expand,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Surface',
        value: '300 m² minimum',
      },
      {
        icon: BedDouble,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Chambres',
        value: '5 minimum',
      },
    ],
    timeline: [
      {
        event: 'Demande créée',
        meta: '5 jan. 2025 à 17h05 — Moussa Traoré (client)',
        filled: true,
      },
      {
        event: 'Demande assignée à Kofi Mensah',
        meta: '5 jan. 2025 à 17h30 — Système automatique',
        filled: true,
      },
    ],
    internalNotes: 'Aucune note pour le moment.',
    suggestedListings: [],
  },
  {
    id: 'r6',
    ref: 'DEM-2025-006',
    clientName: 'Nadia Seck',
    clientPhone: '+221 70 456 78 90',
    clientEmail: 'nadia.seck@gmail.com',
    clientAddress: 'Dakar, Sénégal',
    clientKind: 'Particulier',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F18-25%2FAfrican%2F0',
    propertyType: 'Appartement',
    flag: '🇸🇳',
    country: 'Sénégal',
    zone: 'Mermoz, Dakar',
    budget: '15M – 35M FCFA',
    surfaceMin: '60 m²',
    bedroomsMin: '2 chambres',
    transaction: 'LOCATION',
    priority: 'BASSE',
    status: 'CLOTUREE',
    date: '02 jan. 2025',
    submittedLabel: 'Soumise le 2 janvier 2025',
    title: 'Recherche un appartement à Mermoz, Dakar',
    description: 'Demande clôturée — la cliente a finalement trouvé un bien via une autre agence.',
    criteria: [
      {
        icon: Expand,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Surface',
        value: '60 m² minimum',
      },
    ],
    timeline: [
      { event: 'Demande créée', meta: '2 jan. 2025 à 10h00 — Nadia Seck (client)', filled: true },
      {
        event: 'Demande clôturée par le client',
        meta: '15 jan. 2025 à 12h00 — Nadia Seck (client)',
        filled: true,
      },
    ],
    internalNotes: 'Cliente a trouvé un bien ailleurs — demande clôturée sans suite.',
    suggestedListings: [],
  },
  {
    id: 'r7',
    ref: 'DEM-2025-007',
    clientName: 'Hervé Dossou',
    clientPhone: '+229 97 34 56 78',
    clientEmail: 'herve.dossou@gmail.com',
    clientAddress: 'Cotonou, Bénin',
    clientKind: 'Particulier',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F7',
    propertyType: 'Terrain',
    flag: '🇧🇯',
    country: 'Bénin',
    zone: 'Akpakpa, Cotonou',
    budget: '25M – 60M FCFA',
    surfaceMin: '400 m²',
    bedroomsMin: '—',
    transaction: 'VENTE',
    priority: 'URGENT',
    status: 'EN_ATTENTE',
    date: '29 déc. 2024',
    submittedLabel: 'Soumise le 29 décembre 2024',
    title: 'Recherche un terrain à Akpakpa, Cotonou',
    description:
      'Client souhaite un terrain viabilisé à Akpakpa pour un projet de construction rapide.',
    criteria: [
      {
        icon: Expand,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Surface',
        value: '400 m² minimum',
      },
      {
        icon: CalendarX,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        label: "Délai d'acquisition",
        value: 'Sous 1 mois',
      },
    ],
    timeline: [
      {
        event: 'Demande créée',
        meta: '29 déc. 2024 à 09h30 — Hervé Dossou (client)',
        filled: true,
      },
      {
        event: 'Demande assignée à Kofi Mensah',
        meta: '29 déc. 2024 à 10h00 — Système automatique',
        filled: true,
      },
    ],
    internalNotes: 'Aucune note pour le moment.',
    suggestedListings: [],
  },
  {
    id: 'r8',
    ref: 'DEM-2025-008',
    clientName: 'Adjoua Konan',
    clientPhone: '+225 01 23 45 67',
    clientEmail: 'adjoua.konan@gmail.com',
    clientAddress: "Abidjan, Côte d'Ivoire",
    clientKind: 'Entreprise',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F8',
    propertyType: 'Local commercial',
    flag: '🇨🇮',
    country: "Côte d'Ivoire",
    zone: 'Marcory, Abidjan',
    budget: '8M – 20M FCFA/an',
    surfaceMin: '90 m²',
    bedroomsMin: '—',
    transaction: 'LOCATION',
    priority: 'NORMALE',
    status: 'EN_COURS',
    date: '27 déc. 2024',
    submittedLabel: 'Soumise le 27 décembre 2024',
    title: 'Recherche un local commercial à Marcory, Abidjan',
    description:
      'Cliente cherche un local commercial en rez-de-chaussée avec vitrine, bien passant.',
    criteria: [
      {
        icon: Expand,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Surface',
        value: '90 m² minimum',
      },
      {
        icon: MapPin,
        iconBg: 'bg-brand/10',
        iconColor: 'text-brand',
        label: 'Quartier préféré',
        value: 'Marcory',
      },
    ],
    timeline: [
      {
        event: 'Demande créée',
        meta: '27 déc. 2024 à 15h20 — Adjoua Konan (client)',
        filled: true,
      },
      {
        event: 'Demande assignée à Kofi Mensah',
        meta: '27 déc. 2024 à 15h45 — Système automatique',
        filled: true,
      },
      {
        event: 'Premier contact pris avec le client',
        meta: '28 déc. 2024 à 09h00 — Kofi Mensah (agent)',
        filled: false,
      },
    ],
    internalNotes: 'Aucune note pour le moment.',
    suggestedListings: [],
  },
];
