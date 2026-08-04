'use client';

import { useMemo, useState } from 'react';
import {
  Download,
  Plus,
  Users,
  UserPlus,
  Clock,
  Percent,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Building2,
  ChevronDown,
  List,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Mail,
  Phone,
  Tag,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';

type Motif = 'ACHAT' | 'LOCATION';
type Statut = 'EN_ATTENTE' | 'REPONDU' | 'VISITE_PLANIFIEE' | 'NON_QUALIFIE';

interface ActivityEvent {
  text: string;
  time: string;
  dot: 'brand' | 'gray' | 'green';
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  location: string;
  listingRef: string;
  motif: Motif;
  statut: Statut;
  date: string;
  budget: string;
  activity: ActivityEvent[];
}

// Static demo data mirroring the Banani "Contacts Reçus" mockup — front-end
// only per user request, no Contact model exists yet.
const MOCK_CONTACTS: Contact[] = [
  {
    id: 'k1',
    name: 'Amavi Kodjovi',
    email: 'amavi.k@gmail.com',
    phone: '+228 90 34 12 78',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FAfrican%2F1',
    location: 'Lomé, Togo',
    listingRef: 'Villa F4 · Lomé-Bè',
    motif: 'ACHAT',
    statut: 'EN_ATTENTE',
    date: '12 juin 2025',
    budget: '85 000 000 FCFA',
    activity: [
      {
        text: 'Demande de contact envoyée sur Villa F4 · Lomé-Bè',
        time: "Aujourd'hui à 09:14",
        dot: 'brand',
      },
      { text: 'Consultation de la fiche annonce (3 fois)', time: 'Hier à 18:42', dot: 'gray' },
      { text: 'Ajout aux favoris', time: '10 juin à 14:30', dot: 'green' },
      { text: 'Visite virtuelle 360° effectuée', time: '9 juin à 11:05', dot: 'gray' },
    ],
  },
  {
    id: 'k2',
    name: 'Fatoumata Diallo',
    email: 'f.diallo@yahoo.fr',
    phone: '+221 77 56 89 03',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F2',
    location: 'Dakar, Sénégal',
    listingRef: 'Appt T3 · Dakar Plateau',
    motif: 'LOCATION',
    statut: 'REPONDU',
    date: '11 juin 2025',
    budget: '25 000 000 FCFA',
    activity: [
      { text: 'Réponse envoyée à la demande de contact', time: 'Hier à 10:20', dot: 'brand' },
      {
        text: 'Demande de contact envoyée sur Appt T3 · Dakar Plateau',
        time: '11 juin à 08:50',
        dot: 'gray',
      },
    ],
  },
  {
    id: 'k3',
    name: 'Koffi Assiongbon',
    email: 'k.assiongbon@outlook.com',
    phone: '+229 96 44 71 22',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F4',
    location: 'Cotonou, Bénin',
    listingRef: 'Bureau 80m² · Cotonou',
    motif: 'ACHAT',
    statut: 'VISITE_PLANIFIEE',
    date: '10 juin 2025',
    budget: '18 000 000 FCFA',
    activity: [
      {
        text: 'Visite planifiée pour Bureau 80m² · Cotonou',
        time: '10 juin à 16:00',
        dot: 'green',
      },
      { text: 'Demande de contact envoyée', time: '10 juin à 09:12', dot: 'gray' },
    ],
  },
  {
    id: 'k4',
    name: 'Ama Owusu',
    email: 'ama.owusu@gmail.com',
    phone: '+233 24 78 99 14',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F0',
    location: 'Abidjan, Côte d’Ivoire',
    listingRef: 'Villa duplex · Abidjan Cocody',
    motif: 'LOCATION',
    statut: 'EN_ATTENTE',
    date: '09 juin 2025',
    budget: '30 000 000 FCFA',
    activity: [
      {
        text: 'Demande de contact envoyée sur Villa duplex · Abidjan Cocody',
        time: '9 juin à 13:44',
        dot: 'brand',
      },
    ],
  },
  {
    id: 'k5',
    name: 'Sékou Traoré',
    email: 'sekou.t@orange.sn',
    phone: '+221 70 12 34 56',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F18-25%2FAfrican%2F5',
    location: 'Dakar, Sénégal',
    listingRef: 'Studio meublé · Dakar Mermoz',
    motif: 'LOCATION',
    statut: 'NON_QUALIFIE',
    date: '08 juin 2025',
    budget: '5 000 000 FCFA',
    activity: [
      {
        text: 'Marqué comme non qualifié — budget insuffisant',
        time: '8 juin à 15:10',
        dot: 'gray',
      },
      { text: 'Demande de contact envoyée', time: '8 juin à 09:30', dot: 'gray' },
    ],
  },
  {
    id: 'k6',
    name: 'Emmanuel Gbénou',
    email: 'e.gbenou@hotmail.fr',
    phone: '+229 95 67 43 10',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F50-65%2FAfrican%2F6',
    location: 'Porto-Novo, Bénin',
    listingRef: 'Terrain 500m² · Porto-Novo',
    motif: 'ACHAT',
    statut: 'REPONDU',
    date: '07 juin 2025',
    budget: '40 000 000 FCFA',
    activity: [
      { text: 'Réponse envoyée à la demande de contact', time: '7 juin à 17:00', dot: 'brand' },
      {
        text: 'Demande de contact envoyée sur Terrain 500m² · Porto-Novo',
        time: '7 juin à 10:05',
        dot: 'gray',
      },
    ],
  },
];

const MOTIF_BADGE: Record<Motif, string> = {
  ACHAT: 'Achat',
  LOCATION: 'Location',
};

const STATUT_BADGE: Record<Statut, { label: string; className: string }> = {
  EN_ATTENTE: { label: 'En attente', className: 'bg-amber-100 text-amber-800' },
  REPONDU: { label: 'Répondu', className: 'bg-emerald-100 text-emerald-800' },
  VISITE_PLANIFIEE: { label: 'Visite planifiée', className: 'bg-emerald-100 text-emerald-800' },
  NON_QUALIFIE: { label: 'Non qualifié', className: 'bg-red-100 text-red-700' },
};

const ACTIVITY_DOT: Record<ActivityEvent['dot'], string> = {
  brand: 'bg-brand',
  gray: 'bg-gray-300',
  green: 'bg-emerald-500',
};

export default function ContactsPage() {
  const user = useUser();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(MOCK_CONTACTS[0]!.id);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_CONTACTS;
    return MOCK_CONTACTS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.listingRef.toLowerCase().includes(q),
    );
  }, [search]);

  if (!user) return null;

  const selected = MOCK_CONTACTS.find((c) => c.id === selectedId) ?? MOCK_CONTACTS[0]!;
  const selectedStatut = STATUT_BADGE[selected.statut];

  return (
    <DashboardShell active="contacts" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Contacts reçus
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Gérez les prospects et acheteurs potentiels qui vous ont contacté.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-medium text-gray-400"
          >
            <Download className="h-[14px] w-[14px]" aria-hidden />
            <span className="hidden lg:inline">Exporter</span>
          </button>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Ajouter</span>
            <span className="hidden lg:inline">Ajouter un contact</span>
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total contacts',
            icon: Users,
            value: 148,
            trend: (
              <span className="flex items-center gap-1 text-emerald-600">
                <TrendingUp className="h-3 w-3" aria-hidden />
                +12% ce mois
              </span>
            ),
          },
          {
            label: 'Nouveaux (7j)',
            icon: UserPlus,
            value: 23,
            trend: (
              <span className="flex items-center gap-1 text-emerald-600">
                <TrendingUp className="h-3 w-3" aria-hidden />
                +5 vs semaine dernière
              </span>
            ),
          },
          {
            label: 'En attente de réponse',
            icon: Clock,
            value: 9,
            trend: (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="h-3 w-3" aria-hidden />
                Nécessite attention
              </span>
            ),
          },
          {
            label: 'Taux de conversion',
            icon: Percent,
            value: '34%',
            trend: (
              <span className="flex items-center gap-1 text-emerald-600">
                <TrendingUp className="h-3 w-3" aria-hidden />
                +4% vs mois dernier
              </span>
            ),
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-400">{s.label}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10">
                <s.icon className="h-4 w-4 text-brand" aria-hidden />
              </span>
            </div>
            <p className="font-sora mb-1.5 text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="text-xs">{s.trend}</p>
          </div>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* LEFT: filters + table */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* FILTERS BAR */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-white p-4">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-black/[0.08] bg-gray-50 px-3.5 py-2">
              <Search className="h-[14px] w-[14px] flex-shrink-0 text-gray-400" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un contact, une annonce…"
                className="w-full bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            {[
              { icon: Filter, label: 'Statut' },
              { icon: Calendar, label: 'Cette semaine' },
              { icon: Building2, label: 'Annonce' },
            ].map((f) => (
              <button
                key={f.label}
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-2 text-[12.5px] font-medium text-gray-400"
              >
                <f.icon className="h-[13px] w-[13px]" aria-hidden />
                {f.label}
                <ChevronDown className="h-3 w-3" aria-hidden />
              </button>
            ))}
          </div>

          {/* TABLE */}
          <div className="rounded-2xl bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] px-5 py-4">
              <div>
                <p className="font-sora text-[15px] font-semibold text-neutral-900">
                  Liste des contacts
                </p>
                <p className="text-[12.5px] text-gray-400">148 contacts au total</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-[12.5px] font-medium text-brand"
                >
                  <List className="h-[13px] w-[13px]" aria-hidden />
                  Liste
                </button>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-[12.5px] font-medium text-gray-400"
                >
                  <LayoutGrid className="h-[13px] w-[13px]" aria-hidden />
                  Grille
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                <Users className="mb-1 h-8 w-8 text-gray-300" aria-hidden />
                <p className="text-sm font-medium text-neutral-700">
                  Aucun résultat pour cette recherche
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        { label: 'Contact', mobileHidden: false },
                        { label: 'Téléphone', mobileHidden: true },
                        { label: 'Annonce concernée', mobileHidden: true },
                        { label: 'Motif', mobileHidden: true },
                        { label: 'Statut', mobileHidden: false },
                        { label: 'Date', mobileHidden: true },
                        { label: 'Actions', mobileHidden: false },
                      ].map((h) => (
                        <th
                          key={h.label}
                          className={cn(
                            'font-sora px-5 py-3 text-left text-[11.5px] font-semibold whitespace-nowrap text-gray-400 uppercase',
                            h.label === 'Actions' && 'text-center',
                            h.mobileHidden && 'hidden lg:table-cell',
                          )}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const statut = STATUT_BADGE[c.statut];
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            'cursor-pointer border-b border-black/[0.06] last:border-0',
                            c.id === selectedId ? 'bg-[#EEF3FF]' : 'hover:bg-gray-50',
                          )}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={c.avatarUrl}
                                alt={c.name}
                                className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                              />
                              <div>
                                <p className="text-[13.5px] font-semibold whitespace-nowrap text-neutral-900">
                                  {c.name}
                                </p>
                                <p className="text-[11.5px] whitespace-nowrap text-gray-400">
                                  {c.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-5 py-3.5 text-[13px] whitespace-nowrap text-neutral-700 lg:table-cell">
                            {c.phone}
                          </td>
                          <td className="hidden px-5 py-3.5 text-[12.5px] font-medium whitespace-nowrap text-brand lg:table-cell">
                            {c.listingRef}
                          </td>
                          <td className="hidden px-5 py-3.5 lg:table-cell">
                            <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-brand">
                              {MOTIF_BADGE[c.motif]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                                statut.className,
                              )}
                            >
                              {statut.label}
                            </span>
                          </td>
                          <td className="hidden px-5 py-3.5 text-[12.5px] whitespace-nowrap text-gray-400 lg:table-cell">
                            {c.date}
                          </td>
                          <td className="px-5 py-3.5">
                            <div
                              className="flex items-center justify-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {[MessageCircle, Calendar, MoreHorizontal].map((Icon, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  disabled
                                  title="Bientôt disponible"
                                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md bg-gray-50 text-gray-400"
                                >
                                  <Icon className="h-[13px] w-[13px]" aria-hidden />
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-black/[0.06] px-5 py-3.5">
              <span className="text-[12.5px] text-gray-400">
                Affichage de 1 à {filtered.length} sur 148 contacts
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md bg-gray-50 text-gray-400"
                >
                  <ChevronLeft className="h-[14px] w-[14px]" aria-hidden />
                </button>
                {[1, 2, 3].map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled
                    title="Bientôt disponible"
                    className={cn(
                      'flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md text-[13px] font-medium',
                      p === 1 ? 'bg-brand text-white' : 'bg-gray-50 text-neutral-700',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <span className="flex h-[30px] w-[30px] items-center justify-center text-[13px] text-gray-400">
                  …
                </span>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md bg-gray-50 text-[13px] font-medium text-neutral-700"
                >
                  25
                </button>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md bg-gray-50 text-gray-400"
                >
                  <ChevronRight className="h-[14px] w-[14px]" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: DETAIL PANEL */}
        <div className="order-last flex w-full flex-col gap-4 lg:sticky lg:top-6 lg:w-[300px] lg:flex-shrink-0">
          {/* Selected contact card */}
          <div className="rounded-2xl bg-white p-5">
            <p className="font-sora mb-3.5 text-[13.5px] font-semibold text-neutral-900">
              Fiche contact
            </p>
            <div className="mb-4 flex flex-col items-center gap-2 border-b border-black/[0.06] pb-4 text-center">
              <img
                src={selected.avatarUrl}
                alt={selected.name}
                className="h-[60px] w-[60px] rounded-full object-cover"
              />
              <p className="font-sora text-[15px] font-semibold text-neutral-900">
                {selected.name}
              </p>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  selectedStatut.className,
                )}
              >
                {selectedStatut.label}
              </span>
              <p className="text-xs text-gray-400">
                {selected.motif === 'ACHAT' ? 'Acheteur potentiel' : 'Locataire potentiel'} ·{' '}
                {selected.location}
              </p>
            </div>

            {[
              { icon: Mail, label: 'Email', value: selected.email },
              { icon: Phone, label: 'Tél.', value: selected.phone },
              { icon: Building2, label: 'Annonce', value: selected.listingRef, brand: true },
              { icon: Tag, label: 'Budget', value: selected.budget },
              { icon: Calendar, label: 'Contact le', value: selected.date },
            ].map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  'flex items-center gap-2 py-2 text-[13px]',
                  i < 4 && 'border-b border-black/[0.06]',
                )}
              >
                <row.icon className="h-[14px] w-[14px] flex-shrink-0 text-gray-400" aria-hidden />
                <span className="w-[70px] flex-shrink-0 text-xs text-gray-400">{row.label}</span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate font-medium',
                    row.brand ? 'text-brand' : 'text-neutral-900',
                  )}
                >
                  {row.value}
                </span>
              </div>
            ))}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-brand/40 px-4 py-2.5 text-[13px] font-semibold text-white"
              >
                <MessageCircle className="h-[14px] w-[14px]" aria-hidden />
                Envoyer un message
              </button>
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-semibold text-gray-400"
              >
                <CalendarPlus className="h-[14px] w-[14px]" aria-hidden />
                Planifier une visite
              </button>
            </div>
          </div>

          {/* Activity feed */}
          <div className="rounded-2xl bg-white p-5">
            <p className="font-sora mb-3.5 text-[13.5px] font-semibold text-neutral-900">
              Activité récente
            </p>
            <div className="flex flex-col">
              {selected.activity.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2.5 py-2',
                    i < selected.activity.length - 1 && 'border-b border-black/[0.06]',
                  )}
                >
                  <span
                    className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', ACTIVITY_DOT[a.dot])}
                  />
                  <div>
                    <p className="text-[12.5px] leading-snug text-neutral-900">{a.text}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes card */}
          <div className="rounded-2xl bg-white p-5">
            <p className="font-sora mb-3.5 text-[13.5px] font-semibold text-neutral-900">
              Notes internes
            </p>
            <textarea
              value={notes[selected.id] ?? ''}
              onChange={(e) => setNotes((prev) => ({ ...prev, [selected.id]: e.target.value }))}
              placeholder="Ajouter une note sur ce contact…"
              rows={3}
              className="w-full resize-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] p-3.5 text-[13px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
            />
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="cursor-not-allowed rounded-lg bg-brand/40 px-4 py-1.5 text-[12.5px] font-semibold text-white"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
