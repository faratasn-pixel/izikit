'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Phone,
  CalendarPlus,
  MoreHorizontal,
  Eye,
  Paperclip,
  Smile,
  Send,
  Calendar,
  Clock,
  MapPin,
  CalendarCheck,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';

type FilterTab = 'TOUS' | 'NON_LUS' | 'VISITES' | 'ARCHIVES';

interface ChatMessage {
  id: string;
  from: 'client' | 'agent';
  text: string;
  time: string;
  dateLabel?: string;
  isVisitCard?: boolean;
  visitDate?: string;
  visitTime?: string;
  visitLocation?: string;
}

interface Conversation {
  id: string;
  name: string;
  avatarUrl: string;
  online: boolean;
  time: string;
  preview: string;
  propertyTag: string;
  unread: boolean;
  hasVisit: boolean;
  propertyTitle: string;
  propertyLocation: string;
  propertyRef: string;
  propertyPrice: string;
  propertyImage: string;
  propertyVerified: boolean;
  messages: ChatMessage[];
}

// Static demo data mirroring the Banani "Messages Inbox" mockup — front-end
// only per user request, no Conversation/Message model exists yet.
// Conversation `c1` (Aïcha Diallo) is the mockup's own selected conversation
// — its property context + full 8-message transcript (incl. visit-request
// card + typing indicator) are the literal fetched content. The other 6
// conversations get a short illustrative 2-message transcript.
const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    name: 'Aïcha Diallo',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F25-35%2FAfrican%2F2',
    online: true,
    time: '10:42',
    preview: 'Bonjour, est-ce que la villa est toujours disponible ?',
    propertyTag: 'Villa Cocody — Abidjan',
    unread: true,
    hasVisit: true,
    propertyTitle: 'Villa moderne avec piscine, Cocody',
    propertyLocation: "Abidjan, Côte d'Ivoire · #AN-0041",
    propertyRef: 'AN-0041',
    propertyPrice: '185 000 000 FCFA',
    propertyImage:
      'https://storage.googleapis.com/banani-generated-images/generated-images/bf63d4b0-aaa6-46d3-b729-f5e6b912cdab.jpg',
    propertyVerified: true,
    messages: [
      {
        id: 'm1',
        from: 'client',
        dateLabel: 'Hier, 14 juillet 2025',
        text: "Bonjour Monsieur Mensah ! J'ai vu votre annonce pour la villa à Cocody. Elle m'intéresse vraiment. Est-ce qu'elle est toujours disponible ?",
        time: '14:22',
      },
      {
        id: 'm2',
        from: 'agent',
        text: "Bonjour Madame Diallo ! Oui, la villa est toujours disponible. C'est une propriété de 380 m² avec 5 chambres et une piscine dans un quartier très calme.",
        time: '14:35',
      },
      {
        id: 'm3',
        from: 'client',
        text: 'Parfait ! Est-ce que le titre foncier est disponible ? Et y a-t-il une possibilité de négocier sur le prix ?',
        time: '14:48',
      },
      {
        id: 'm4',
        from: 'agent',
        text: 'Le titre foncier est entièrement validé — vous pouvez voir le statut "Vérifié" sur l\'annonce. Concernant le prix, il y a une légère marge possible. Je vous propose de visiter d\'abord ?',
        time: '15:02',
      },
      {
        id: 'm5',
        from: 'agent',
        isVisitCard: true,
        text: '',
        time: '15:05',
        visitDate: 'Samedi 19 juillet 2025',
        visitTime: '10h00 – 11h30',
        visitLocation: 'Villa Cocody, Abidjan',
      },
      {
        id: 'm6',
        from: 'client',
        dateLabel: "Aujourd'hui, 15 juillet 2025",
        text: 'Bonjour, est-ce que la villa est toujours disponible ? Je confirme bien ma visite pour samedi 19 juillet à 10h.',
        time: '10:42',
      },
    ],
  },
  {
    id: 'c2',
    name: 'Moussa Koné',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F25-35%2FWest%20African%2F5',
    online: false,
    time: '09:15',
    preview: 'Je voudrais planifier une visite ce samedi.',
    propertyTag: 'Duplex Tokoin — Lomé',
    unread: true,
    hasVisit: false,
    propertyTitle: 'Duplex récent 4 pièces, Tokoin',
    propertyLocation: 'Lomé, Togo · #AN-0058',
    propertyRef: 'AN-0058',
    propertyPrice: '62 000 000 FCFA',
    propertyImage:
      'https://storage.googleapis.com/banani-generated-images/generated-images/cdae6458-9b12-4e4e-979f-cfdfb3b92f3b.jpg',
    propertyVerified: true,
    messages: [
      {
        id: 'm1',
        from: 'client',
        dateLabel: 'Aujourd’hui',
        text: 'Je voudrais planifier une visite ce samedi.',
        time: '09:15',
      },
      {
        id: 'm2',
        from: 'agent',
        text: 'Bonjour Monsieur Koné, avec plaisir — quel créneau vous conviendrait le mieux ?',
        time: '09:20',
      },
    ],
  },
  {
    id: 'c3',
    name: 'Fatou Sow',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FAfrican%2F7',
    online: false,
    time: 'Hier',
    preview: "Merci pour les documents. J'ai une question.",
    propertyTag: 'Appt T3 Plateau — Dakar',
    unread: true,
    hasVisit: false,
    propertyTitle: 'Appartement T3 rénové, Plateau',
    propertyLocation: 'Dakar, Sénégal · #AN-0033',
    propertyRef: 'AN-0033',
    propertyPrice: '32 000 000 FCFA',
    propertyImage:
      'https://storage.googleapis.com/banani-generated-images/generated-images/8cc29858-d03e-447b-a0ab-bb26f1479c62.jpg',
    propertyVerified: true,
    messages: [
      {
        id: 'm1',
        from: 'client',
        dateLabel: 'Hier',
        text: "Merci pour les documents. J'ai une question.",
        time: '17:10',
      },
      {
        id: 'm2',
        from: 'agent',
        text: 'Bonjour Madame Sow, je vous en prie — je vous écoute.',
        time: '17:22',
      },
    ],
  },
  {
    id: 'c4',
    name: 'Émile Agossou',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F50-65%2FAfrican%2F1',
    online: false,
    time: 'Hier',
    preview: 'Le prix est-il négociable pour ce terrain ?',
    propertyTag: 'Terrain Z.I. — Cotonou',
    unread: true,
    hasVisit: false,
    propertyTitle: 'Terrain viabilisé, Zone Industrielle',
    propertyLocation: 'Cotonou, Bénin · #AN-0072',
    propertyRef: 'AN-0072',
    propertyPrice: '45 000 000 FCFA',
    propertyImage:
      'https://storage.googleapis.com/banani-generated-images/generated-images/3cde2648-74f4-4739-827b-ab9b6ab5e152.jpg',
    propertyVerified: false,
    messages: [
      {
        id: 'm1',
        from: 'client',
        dateLabel: 'Hier',
        text: 'Le prix est-il négociable pour ce terrain ?',
        time: '16:05',
      },
      {
        id: 'm2',
        from: 'agent',
        text: 'Bonjour Monsieur Agossou, une petite marge est envisageable selon les modalités de paiement.',
        time: '16:30',
      },
    ],
  },
  {
    id: 'c5',
    name: 'Kwame Asante',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F18-25%2FAfrican%2F4',
    online: false,
    time: 'Lun',
    preview: 'Quand puis-je obtenir le titre foncier ?',
    propertyTag: 'Bureau Affaires — Cotonou',
    unread: true,
    hasVisit: false,
    propertyTitle: "Espace de bureau centre d'affaires",
    propertyLocation: 'Cotonou, Bénin · #AN-0019',
    propertyRef: 'AN-0019',
    propertyPrice: '9 500 000 FCFA/an',
    propertyImage:
      'https://storage.googleapis.com/banani-generated-images/generated-images/431c1324-e0ee-42fe-984e-9a942a8a11ba.jpg',
    propertyVerified: true,
    messages: [
      {
        id: 'm1',
        from: 'client',
        dateLabel: 'Lundi',
        text: 'Quand puis-je obtenir le titre foncier ?',
        time: '11:00',
      },
      {
        id: 'm2',
        from: 'agent',
        text: 'Bonjour Monsieur Asante, le dossier est en cours de finalisation, je reviens vers vous sous 48h.',
        time: '11:40',
      },
    ],
  },
  {
    id: 'c6',
    name: 'Amina Touré',
    avatarUrl:
      'https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F18-25%2FEast%20Asian%2F3',
    online: false,
    time: 'Dim',
    preview: "D'accord, à bientôt pour la visite.",
    propertyTag: 'Villa Cocody — Abidjan',
    unread: false,
    hasVisit: false,
    propertyTitle: 'Villa moderne avec piscine, Cocody',
    propertyLocation: "Abidjan, Côte d'Ivoire · #AN-0041",
    propertyRef: 'AN-0041',
    propertyPrice: '185 000 000 FCFA',
    propertyImage:
      'https://storage.googleapis.com/banani-generated-images/generated-images/bf63d4b0-aaa6-46d3-b729-f5e6b912cdab.jpg',
    propertyVerified: true,
    messages: [
      { id: 'm1', from: 'agent', dateLabel: 'Dimanche', text: 'À samedi alors !', time: '18:00' },
      { id: 'm2', from: 'client', text: "D'accord, à bientôt pour la visite.", time: '18:04' },
    ],
  },
  {
    id: 'c7',
    name: 'Sékou Camara',
    avatarUrl: 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F6',
    online: false,
    time: 'Sam',
    preview: 'Merci beaucoup pour votre aide.',
    propertyTag: 'Appt T3 Plateau — Dakar',
    unread: false,
    hasVisit: false,
    propertyTitle: 'Appartement T3 rénové, Plateau',
    propertyLocation: 'Dakar, Sénégal · #AN-0033',
    propertyRef: 'AN-0033',
    propertyPrice: '32 000 000 FCFA',
    propertyImage:
      'https://storage.googleapis.com/banani-generated-images/generated-images/8cc29858-d03e-447b-a0ab-bb26f1479c62.jpg',
    propertyVerified: true,
    messages: [
      { id: 'm1', from: 'agent', dateLabel: 'Samedi', text: 'Avec plaisir !', time: '13:00' },
      { id: 'm2', from: 'client', text: 'Merci beaucoup pour votre aide.', time: '13:05' },
    ],
  },
];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'TOUS', label: 'Tous' },
  { key: 'NON_LUS', label: 'Non lus' },
  { key: 'VISITES', label: 'Visites' },
  { key: 'ARCHIVES', label: 'Archivés' },
];

export default function MessagesPage() {
  const user = useUser();
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [activeId, setActiveId] = useState(CONVERSATIONS[0]!.id);
  const [filter, setFilter] = useState<FilterTab>('TOUS');
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const unreadCount = conversations.filter((c) => c.unread).length;
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]!;

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === 'NON_LUS' && !c.unread) return false;
      if (filter === 'VISITES' && !c.hasVisit) return false;
      if (filter === 'ARCHIVES') return false;
      if (q && !(c.name.toLowerCase().includes(q) || c.propertyTag.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [conversations, filter, search]);

  if (!user) return null;

  function selectConversation(id: string) {
    setActiveId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
    setMobileView('chat');
  }

  return (
    <DashboardShell active="messages" searchPlaceholder="Rechercher une annonce, un contact…">
      <div className="flex h-[75vh] min-h-[560px] overflow-hidden rounded-2xl bg-white">
        {/* LEFT: CONVERSATION LIST */}
        <div
          className={cn(
            'flex w-full flex-shrink-0 flex-col border-black/[0.06] lg:flex lg:w-[320px] lg:border-r',
            mobileView === 'chat' && 'hidden lg:flex',
          )}
        >
          <div className="border-b border-black/[0.06] p-5">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="font-sora text-base font-semibold text-neutral-900">Messages</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount} non lus
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-2">
              <Search className="h-[14px] w-[14px] flex-shrink-0 text-gray-400" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une conversation…"
                className="w-full bg-transparent text-[13px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-b border-black/[0.06] px-5 py-3">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                  filter === tab.key ? 'bg-brand/10 font-semibold text-brand' : 'text-gray-400',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-5 py-10 text-center">
                <MessageCircle className="mb-1 h-7 w-7 text-gray-300" aria-hidden />
                <p className="text-[13px] font-medium text-neutral-700">Aucune conversation</p>
                <p className="text-xs text-gray-400">
                  {filter === 'ARCHIVES'
                    ? "Vous n'avez aucune conversation archivée."
                    : 'Modifiez vos filtres pour voir d’autres conversations.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-l-[3px] px-5 py-3 text-left',
                    c.id === activeId
                      ? 'border-brand bg-[#EEF3FF]'
                      : 'border-transparent hover:bg-gray-50',
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      className="h-[42px] w-[42px] rounded-full object-cover"
                    />
                    {c.online && (
                      <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-[13.5px]',
                          c.unread
                            ? 'font-semibold text-neutral-900'
                            : 'font-medium text-neutral-900',
                        )}
                      >
                        {c.name}
                      </span>
                      <span className="flex-shrink-0 text-[11px] text-gray-400">{c.time}</span>
                    </div>
                    <p
                      className={cn(
                        'mb-1 truncate text-[12.5px]',
                        c.unread ? 'font-medium text-neutral-700' : 'text-gray-400',
                      )}
                    >
                      {c.preview}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate rounded-sm bg-[#EEF3FF] px-1.5 py-0.5 text-[10.5px] text-brand">
                        {c.propertyTag}
                      </span>
                      {c.unread && (
                        <span className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-brand" />
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: CHAT PANEL */}
        <div
          className={cn('flex min-w-0 flex-1 flex-col', mobileView === 'list' && 'hidden lg:flex')}
        >
          {/* Chat header */}
          <div className="flex items-center gap-3.5 border-b border-black/[0.06] p-4">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-neutral-700 lg:hidden"
            >
              <ArrowLeft className="h-[16px] w-[16px]" aria-hidden />
            </button>
            <img
              src={active.avatarUrl}
              alt={active.name}
              className="h-[42px] w-[42px] flex-shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-sora truncate text-[15px] font-semibold text-neutral-900">
                {active.name}
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-gray-400">
                {active.online && <span className="h-[7px] w-[7px] rounded-full bg-emerald-500" />}
                {active.online ? 'En ligne · ' : ''}Intéressé(e) par{' '}
                {active.propertyTag.split(' — ')[0]}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="hidden h-[34px] w-[34px] cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 text-gray-400 sm:flex"
              >
                <Phone className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="hidden h-[34px] w-[34px] cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 text-gray-400 sm:flex"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex h-[34px] w-[34px] cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 text-gray-400"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="hidden cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-3.5 py-2 text-xs font-semibold text-white sm:flex"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Voir l&apos;annonce
              </button>
            </div>
          </div>

          {/* Property context */}
          <div className="flex items-center gap-3 border-b border-black/[0.06] p-3">
            <img
              src={active.propertyImage}
              alt={active.propertyTitle}
              className="h-9 w-12 flex-shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-neutral-900">
                {active.propertyTitle}
              </p>
              <p className="truncate text-[11.5px] text-gray-400">{active.propertyLocation}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {active.propertyVerified && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-emerald-800">
                  ✓ Vérifié
                </span>
              )}
              <span className="text-[13px] font-semibold whitespace-nowrap text-brand">
                {active.propertyPrice}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto p-5">
            {active.messages.map((m) => (
              <div key={m.id} className="contents">
                {m.dateLabel && (
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-black/[0.06]" />
                    <span className="flex-shrink-0 text-[11px] whitespace-nowrap text-gray-400">
                      {m.dateLabel}
                    </span>
                    <div className="h-px flex-1 bg-black/[0.06]" />
                  </div>
                )}
                {m.isVisitCard ? (
                  <div className="flex flex-row-reverse items-end gap-2">
                    <img
                      src="https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F3"
                      alt="Agent"
                      className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                    />
                    <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[60%]">
                      <div className="flex w-[280px] max-w-full flex-col gap-3.5 rounded-2xl border border-black/[0.08] bg-white p-4">
                        <p className="font-sora flex items-center gap-1.5 text-[13px] font-semibold text-neutral-900">
                          <CalendarCheck className="h-[15px] w-[15px] text-brand" aria-hidden />
                          Demande de visite
                        </p>
                        <div className="flex flex-col gap-2">
                          <p className="flex items-center gap-2 text-[12.5px] text-neutral-700">
                            <Calendar className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                            {m.visitDate}
                          </p>
                          <p className="flex items-center gap-2 text-[12.5px] text-neutral-700">
                            <Clock className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                            {m.visitTime}
                          </p>
                          <p className="flex items-center gap-2 text-[12.5px] text-neutral-700">
                            <MapPin className="h-[13px] w-[13px] text-gray-400" aria-hidden />
                            {m.visitLocation}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled
                            title="Bientôt disponible"
                            className="flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg bg-brand/40 px-3 text-xs font-semibold text-white"
                          >
                            Confirmer
                          </button>
                          <button
                            type="button"
                            disabled
                            title="Bientôt disponible"
                            className="flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 px-3 text-center text-xs leading-tight text-gray-500"
                          >
                            Proposer
                            <br />
                            autre date
                          </button>
                        </div>
                      </div>
                      <span className="text-[10.5px] text-gray-400">{m.time}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn('flex items-end gap-2', m.from === 'agent' && 'flex-row-reverse')}
                  >
                    <img
                      src={
                        m.from === 'agent'
                          ? 'https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F3'
                          : active.avatarUrl
                      }
                      alt=""
                      className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                    />
                    <div
                      className={cn(
                        'flex max-w-[85%] flex-col gap-1 sm:max-w-[60%]',
                        m.from === 'agent' && 'items-end',
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed',
                          m.from === 'agent'
                            ? 'rounded-br-md bg-brand text-white'
                            : 'rounded-bl-md bg-[#F9FAFB] text-neutral-900',
                        )}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10.5px] text-gray-400">{m.time}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {active.id === 'c1' && (
              <div className="flex items-end gap-2">
                <img
                  src="https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FAfrican%2F3"
                  alt="Agent"
                  className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                />
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[#F9FAFB] px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300" />
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex items-end gap-2.5 border-t border-black/[0.06] p-4">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex h-9 w-9 flex-shrink-0 cursor-not-allowed items-center justify-center text-gray-400"
            >
              <Paperclip className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex min-h-11 flex-1 items-center gap-2.5 rounded-2xl border border-black/[0.08] bg-[#F9FAFB] px-4 py-2.5">
              <span className="flex-1 text-[13.5px] text-gray-400">Écrire un message…</span>
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex h-7 w-7 flex-shrink-0 cursor-not-allowed items-center justify-center text-gray-400"
              >
                <Smile className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex h-11 w-11 flex-shrink-0 cursor-not-allowed items-center justify-center rounded-2xl bg-brand/40 text-white"
            >
              <Send className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
