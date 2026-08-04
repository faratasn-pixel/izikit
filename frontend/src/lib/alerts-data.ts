import { type LucideIcon, Home, Building, Warehouse, Building2 } from 'lucide-react';

export type Transaction = 'VENTE' | 'LOCATION';

export interface AlertCriterion {
  icon?: LucideIcon;
  label: string;
  highlight?: boolean;
  muted?: boolean;
}

export interface AlertMatch {
  id: string;
  imageUrl: string;
  title: string;
  zoneFlag: string;
  zone: string;
  size: string;
  detail: string;
  timeLabel: string;
  isNew: boolean;
  price: string;
  transaction: Transaction;
  saved?: boolean;
}

export interface AlertStats {
  newToday: number;
  totalMatches: number;
  viewed: number;
  saved: number;
}

export interface SectorAlert {
  id: string;
  title: string;
  flag: string;
  country: string;
  transaction: Transaction;
  active: boolean;
  criteria: AlertCriterion[];
  lastMatch: string;
  createdLabel: string;
  frequencyLabel: string;
  stats: AlertStats;
  matches: AlertMatch[];
}

export const TRANSACTION_BADGE: Record<Transaction, { label: string; className: string }> = {
  VENTE: { label: 'Vente', className: 'bg-brand/10 text-brand' },
  LOCATION: { label: 'Location', className: 'bg-emerald-50 text-emerald-700' },
};

// Static demo data mirroring the Banani "Alerte Secteur" / "Alerte Detail"
// mockups — front-end only per user request, no Alert/Match Prisma model
// exists yet. `a1`'s detail matches are the literal 6 rows from the Banani
// "Alerte Detail" mockup; the other alerts' matches are illustrative,
// reusing the same country/zone as their card on `/alertes`.
export const MOCK_ALERTS: SectorAlert[] = [
  {
    id: 'a1',
    title: 'Villas à Cocody, Abidjan',
    flag: '🇨🇮',
    country: "Côte d'Ivoire",
    transaction: 'VENTE',
    active: true,
    criteria: [
      { icon: Home, label: 'Villa' },
      { label: '80M – 200M FCFA', highlight: true },
      { label: '200m²+' },
      { label: '4+ pièces' },
      { label: 'Piscine' },
      { label: 'Gardien' },
    ],
    lastMatch: '3 nouvelles',
    createdLabel: 'Créée le 5 jan. 2025',
    frequencyLabel: 'Immédiate',
    stats: { newToday: 3, totalMatches: 18, viewed: 11, saved: 4 },
    matches: [
      {
        id: 'm1',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/2fb8b1e1-634b-42fb-bfa0-caa613e3da13.jpg',
        title: 'Villa prestige 5 ch. piscine & jardin – Les II Plateaux',
        zoneFlag: '🇨🇮',
        zone: 'Les II Plateaux, Cocody',
        size: '320 m²',
        detail: '5 ch.',
        timeLabel: 'Il y a 1h',
        isNew: true,
        price: '185 000 000 FCFA',
        transaction: 'VENTE',
      },
      {
        id: 'm2',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/3e938660-e2cc-43e1-9539-5b18fd6b5ee2.jpg',
        title: 'Belle villa 5 pièces avec piscine – Cocody Danga',
        zoneFlag: '🇨🇮',
        zone: 'Cocody Danga, Abidjan',
        size: '280 m²',
        detail: '5 ch.',
        timeLabel: 'Il y a 2h',
        isNew: true,
        price: '145 000 000 FCFA',
        transaction: 'VENTE',
        saved: true,
      },
      {
        id: 'm3',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/5835305e-fc3a-4a65-bf53-499d305a3912.jpg',
        title: 'Villa sécurisée 4 ch. – Riviera Golf, Cocody',
        zoneFlag: '🇨🇮',
        zone: 'Riviera Golf, Cocody',
        size: '240 m²',
        detail: '4 ch.',
        timeLabel: 'Il y a 4h',
        isNew: true,
        price: '120 000 000 FCFA',
        transaction: 'VENTE',
      },
      {
        id: 'm4',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/e7babd59-e179-490b-b3e3-937f67b32703.jpg',
        title: 'Grand domaine familial 6 pièces – Angré 7e tranche',
        zoneFlag: '🇨🇮',
        zone: 'Angré, Cocody',
        size: '380 m²',
        detail: '6 ch.',
        timeLabel: 'Hier',
        isNew: false,
        price: '195 000 000 FCFA',
        transaction: 'VENTE',
        saved: true,
      },
      {
        id: 'm5',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/663a474a-b95a-4868-abab-b3df986a0b82.jpg',
        title: 'Villa contemporaine 4 ch. avec dépendance – Cocody',
        zoneFlag: '🇨🇮',
        zone: 'Cocody Centre, Abidjan',
        size: '260 m²',
        detail: '4 ch.',
        timeLabel: '3 jan.',
        isNew: false,
        price: '98 000 000 FCFA',
        transaction: 'VENTE',
      },
      {
        id: 'm6',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/34a05d63-b483-4599-941f-4c7c7c51642b.jpg',
        title: 'Villa de standing 5 pièces vue dégagée – Riviera 3',
        zoneFlag: '🇨🇮',
        zone: 'Riviera 3, Cocody',
        size: '210 m²',
        detail: '5 ch.',
        timeLabel: '2 jan.',
        isNew: false,
        price: '135 000 000 FCFA',
        transaction: 'VENTE',
        saved: true,
      },
    ],
  },
  {
    id: 'a2',
    title: 'Appartements à Dakar Plateau',
    flag: '🇸🇳',
    country: 'Sénégal',
    transaction: 'LOCATION',
    active: true,
    criteria: [
      { icon: Building, label: 'Appartement' },
      { label: '15M – 40M FCFA', highlight: true },
      { label: '3 pièces' },
      { label: 'Meublé' },
    ],
    lastMatch: '1 nouvelle',
    createdLabel: 'Créée le 8 jan. 2025',
    frequencyLabel: 'Quotidienne',
    stats: { newToday: 1, totalMatches: 6, viewed: 4, saved: 1 },
    matches: [
      {
        id: 'm1',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/8cc29858-d03e-447b-a0ab-bb26f1479c62.jpg',
        title: 'Appartement meublé 3 pièces – Almadies Dakar',
        zoneFlag: '🇸🇳',
        zone: 'Almadies, Dakar',
        size: '95 m²',
        detail: '3 pièces',
        timeLabel: 'Il y a 5h',
        isNew: true,
        price: '28 000 000 FCFA',
        transaction: 'LOCATION',
      },
      {
        id: 'm2',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/169d3a9b-854c-4c6b-8728-cc537f9f0364.jpg',
        title: 'Appartement 3P lumineux vue mer – Mermoz',
        zoneFlag: '🇸🇳',
        zone: 'Mermoz, Dakar',
        size: '88 m²',
        detail: '3 pièces',
        timeLabel: '2 jan.',
        isNew: false,
        price: '22 000 000 FCFA',
        transaction: 'LOCATION',
      },
    ],
  },
  {
    id: 'a3',
    title: 'Terrains à Lomé, Bè',
    flag: '🇹🇬',
    country: 'Togo',
    transaction: 'VENTE',
    active: true,
    criteria: [
      { icon: Warehouse, label: 'Terrain' },
      { label: '20M – 80M FCFA', highlight: true },
      { label: '500m²+' },
      { label: 'Titré' },
    ],
    lastMatch: '5 nouvelles',
    createdLabel: 'Créée le 2 jan. 2025',
    frequencyLabel: 'Hebdomadaire',
    stats: { newToday: 5, totalMatches: 12, viewed: 7, saved: 2 },
    matches: [
      {
        id: 'm1',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/cdae6458-9b12-4e4e-979f-cfdfb3b92f3b.jpg',
        title: 'Terrain titré 800m² viabilisé – Bè, Lomé',
        zoneFlag: '🇹🇬',
        zone: 'Bè, Lomé',
        size: '800 m²',
        detail: 'Titré',
        timeLabel: 'Hier',
        isNew: true,
        price: '55 000 000 FCFA',
        transaction: 'VENTE',
      },
    ],
  },
  {
    id: 'a4',
    title: 'Bureaux à Cotonou Plateau',
    flag: '🇧🇯',
    country: 'Bénin',
    transaction: 'LOCATION',
    active: false,
    criteria: [
      { icon: Building2, label: 'Bureau', muted: true },
      { label: '5M – 15M FCFA', muted: true },
      { label: '50m²+', muted: true },
    ],
    lastMatch: 'Aucune',
    createdLabel: 'Créée le 15 déc. 2024',
    frequencyLabel: 'Quotidienne',
    stats: { newToday: 0, totalMatches: 0, viewed: 0, saved: 0 },
    matches: [],
  },
  {
    id: 'a5',
    title: 'Villas à Abidjan Marcory',
    flag: '🇨🇮',
    country: "Côte d'Ivoire",
    transaction: 'VENTE',
    active: true,
    criteria: [
      { icon: Home, label: 'Villa' },
      { label: '50M – 120M FCFA', highlight: true },
      { label: 'Piscine' },
      { label: 'Gardien' },
    ],
    lastMatch: '2 nouvelles',
    createdLabel: 'Créée le 10 jan. 2025',
    frequencyLabel: 'Immédiate',
    stats: { newToday: 2, totalMatches: 9, viewed: 5, saved: 2 },
    matches: [
      {
        id: 'm1',
        imageUrl:
          'https://storage.googleapis.com/banani-generated-images/generated-images/3cde2648-74f4-4739-827b-ab9b6ab5e152.jpg',
        title: 'Villa sécurisée 4 ch. avec jardin – Marcory',
        zoneFlag: '🇨🇮',
        zone: 'Marcory, Abidjan',
        size: '220 m²',
        detail: '4 chambres',
        timeLabel: 'Hier',
        isNew: true,
        price: '98 000 000 FCFA',
        transaction: 'VENTE',
      },
    ],
  },
];
