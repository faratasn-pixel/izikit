'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Pencil,
  CheckCircle,
  XCircle,
  Hash,
  Calendar,
  FileText,
  ListChecks,
  Clock,
  User,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Activity,
  AlertTriangle,
  StickyNote,
  Plus,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import {
  MOCK_REQUESTS,
  PRIORITY_STYLE,
  STATUS_LABEL,
  TRANSACTION_BADGE,
} from '@/lib/requests-data';

export default function DemandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = useUser();
  const { id } = use(params);

  const request = MOCK_REQUESTS.find((r) => r.id === id);

  if (!user) return null;

  if (!request) {
    return (
      <DashboardShell active="requests" searchPlaceholder="Rechercher une annonce, un contact…">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-12 text-center">
          <p className="text-sm font-semibold text-neutral-900">Demande introuvable</p>
          <p className="text-xs text-gray-400">
            Cette demande n&apos;existe pas ou a été supprimée.
          </p>
          <Link href="/demandes" className="text-[13px] font-semibold text-brand">
            Retour à Demande Immobilière
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const priority = PRIORITY_STYLE[request.priority];
  const transaction = TRANSACTION_BADGE[request.transaction];

  return (
    <DashboardShell active="requests" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-center gap-3.5">
        <Link
          href="/demandes"
          className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-neutral-700"
        >
          <ArrowLeft className="h-[15px] w-[15px]" aria-hidden />
        </Link>
        <div className="flex items-center gap-1.5 text-[13px] text-gray-400">
          <span>Demande Immobilière</span>
          <ChevronRight className="h-[13px] w-[13px]" aria-hidden />
          <span className="font-semibold text-neutral-900">
            Détail de la demande #{request.ref}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-[13px] font-semibold text-gray-400"
          >
            <Pencil className="h-[13px] w-[13px]" aria-hidden />
            Modifier
          </button>
          <button
            type="button"
            disabled
            title="Bientôt disponible"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand/40 px-4 py-2 text-[13px] font-semibold text-white"
          >
            <CheckCircle className="h-[13px] w-[13px]" aria-hidden />
            Marquer traitée
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_340px]">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-5">
          {/* HERO CARD */}
          <div className="rounded-2xl bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.06] p-6">
              <div>
                <h1 className="font-sora mb-1.5 text-lg font-semibold text-neutral-900">
                  {request.title}
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-gray-400">
                  <Hash className="h-[13px] w-[13px]" aria-hidden />
                  {request.ref}
                  <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                  <Calendar className="h-3 w-3" aria-hidden />
                  {request.submittedLabel}
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                {request.priority === 'URGENT' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-red-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Urgent
                  </span>
                )}
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                    request.status === 'EN_ATTENTE'
                      ? 'bg-amber-100 text-amber-800'
                      : request.status === 'EN_COURS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-200 text-gray-700',
                  )}
                >
                  {STATUS_LABEL[request.status]}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                    transaction.className,
                  )}
                >
                  {transaction.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-black/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { label: 'Type de bien', value: request.propertyType },
                { label: 'Budget', value: request.budget, highlight: true },
                { label: 'Zone souhaitée', value: `${request.flag} ${request.zone}` },
                { label: 'Transaction', value: transaction.label },
                { label: 'Surface min.', value: request.surfaceMin },
                { label: 'Chambres min.', value: request.bedroomsMin },
              ].map((cell) => (
                <div key={cell.label} className="flex flex-col gap-1 px-5 py-4">
                  <span className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                    {cell.label}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      cell.highlight ? 'text-brand' : 'text-neutral-900',
                    )}
                  >
                    {cell.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10">
                <FileText className="h-3.5 w-3.5 text-brand" aria-hidden />
              </span>
              Description de la demande
            </h2>
            <p className="text-[13.5px] leading-relaxed text-neutral-700">{request.description}</p>
          </div>

          {/* CRITERIA */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                <ListChecks className="h-3.5 w-3.5 text-emerald-800" aria-hidden />
              </span>
              Critères recherchés
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {request.criteria.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-2.5 rounded-lg bg-[#F9FAFB] p-3.5"
                >
                  <span
                    className={cn(
                      'flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md',
                      c.iconBg,
                    )}
                  >
                    <c.icon className={cn('h-3.5 w-3.5', c.iconColor)} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] text-gray-400">{c.label}</p>
                    <p className="truncate text-[13px] font-semibold text-neutral-900">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TIMELINE */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100">
                <Clock className="h-3.5 w-3.5 text-gray-500" aria-hidden />
              </span>
              Historique des actions
            </h2>
            <div className="flex flex-col">
              {request.timeline.map((t, i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="flex w-6 flex-shrink-0 flex-col items-center">
                    <span
                      className={cn(
                        'mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-brand',
                        t.filled ? 'bg-brand' : 'bg-white',
                      )}
                    />
                    {i < request.timeline.length - 1 && (
                      <span className="mt-1 w-0.5 flex-1 bg-black/[0.08]" />
                    )}
                  </div>
                  <div
                    className={cn('min-w-0 flex-1', i < request.timeline.length - 1 && 'pb-4.5')}
                  >
                    <p
                      className={cn(
                        'text-[13px] font-medium',
                        t.filled ? 'text-neutral-900' : 'text-gray-400',
                      )}
                    >
                      {t.event}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-gray-400">{t.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex flex-col gap-4">
          {/* CLIENT INFO */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10">
                <User className="h-3.5 w-3.5 text-brand" aria-hidden />
              </span>
              Informations client
            </h2>
            <div className="mb-4.5 flex items-center gap-3.5 border-b border-black/[0.06] pb-4.5">
              <img
                src={request.avatarUrl}
                alt={request.clientName}
                className="h-[52px] w-[52px] flex-shrink-0 rounded-full object-cover"
              />
              <div>
                <p className="text-[15px] font-semibold text-neutral-900">{request.clientName}</p>
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                  <UserCheck className="h-2.5 w-2.5" aria-hidden />
                  {request.clientKind}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-b border-black/[0.06] py-2 text-[13px] text-neutral-700">
              <Phone className="h-[13px] w-[13px] flex-shrink-0 text-brand" aria-hidden />
              <span>{request.clientPhone}</span>
            </div>
            <div className="flex items-center gap-2.5 border-b border-black/[0.06] py-2 text-[13px] text-neutral-700">
              <Mail className="h-[13px] w-[13px] flex-shrink-0 text-brand" aria-hidden />
              <span className="truncate">{request.clientEmail}</span>
            </div>
            <div className="flex items-center gap-2.5 py-2 text-[13px] text-neutral-700">
              <MapPin className="h-[13px] w-[13px] flex-shrink-0 text-brand" aria-hidden />
              <span>{request.clientAddress}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-2 text-[12.5px] font-semibold text-gray-400"
              >
                <MessageCircle className="h-[13px] w-[13px]" aria-hidden />
                Message
              </button>
              <button
                type="button"
                disabled
                title="Bientôt disponible"
                className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-brand/40 px-2.5 py-2 text-[12.5px] font-semibold text-white"
              >
                <Phone className="h-[13px] w-[13px]" aria-hidden />
                Appeler
              </button>
            </div>
          </div>

          {/* STATUS CARD */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-3.5 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100">
                <Activity className="h-3.5 w-3.5 text-amber-700" aria-hidden />
              </span>
              Statut &amp; Priorité
            </h2>
            <div className="flex flex-col gap-2.5">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                  Statut actuel
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-3">
                  <Clock className="h-4 w-4 text-amber-700" aria-hidden />
                  <span className="text-[13.5px] font-semibold text-amber-900">
                    {request.status === 'EN_ATTENTE'
                      ? 'En attente de traitement'
                      : request.status === 'EN_COURS'
                        ? 'En cours de traitement'
                        : 'Clôturée'}
                  </span>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                  Niveau de priorité
                </p>
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-3',
                    request.priority === 'URGENT' ? 'bg-red-100' : 'bg-gray-100',
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4',
                      request.priority === 'URGENT' ? 'text-red-600' : 'text-gray-500',
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'text-[13.5px] font-semibold',
                      request.priority === 'URGENT' ? 'text-red-700' : 'text-neutral-700',
                    )}
                  >
                    {priority.label}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-400"
                >
                  <CheckCircle className="h-[13px] w-[13px]" aria-hidden />
                  Marquer comme traitée
                </button>
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-300"
                >
                  <XCircle className="h-[13px] w-[13px]" aria-hidden />
                  Clôturer la demande
                </button>
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-3 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100">
                <StickyNote className="h-3.5 w-3.5 text-gray-500" aria-hidden />
              </span>
              Notes internes
            </h2>
            <div className="min-h-[80px] rounded-lg border border-black/[0.08] bg-[#F9FAFB] p-3.5 text-[13px] leading-relaxed text-gray-400">
              {request.internalNotes}
            </div>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="mt-2.5 flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-[12.5px] font-semibold text-gray-400"
            >
              <Plus className="h-[13px] w-[13px]" aria-hidden />
              Ajouter une note
            </button>
          </div>

          {/* SUGGESTED LISTINGS */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-3.5 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10">
                <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
              </span>
              Annonces proposées
              <span className="ml-auto rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-brand">
                {request.suggestedListings.length} envoyées
              </span>
            </h2>
            {request.suggestedListings.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">
                Aucune annonce proposée pour le moment.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {request.suggestedListings.map((l, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg bg-[#F9FAFB] p-2.5">
                    <img
                      src={l.imageUrl}
                      alt={l.title}
                      className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-neutral-900">
                        {l.title}
                      </p>
                      <p className="text-[11.5px] text-gray-400">{l.price}</p>
                    </div>
                    <ExternalLink
                      className="h-[13px] w-[13px] flex-shrink-0 text-brand"
                      aria-hidden
                    />
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="mt-2.5 flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-[12.5px] font-semibold text-gray-400"
            >
              <Plus className="h-[13px] w-[13px]" aria-hidden />
              Suggérer une annonce
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
