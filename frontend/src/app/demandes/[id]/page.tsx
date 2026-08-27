'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Pencil,
  CheckCircle,
  XCircle,
  Hash,
  Calendar,
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
  Loader2,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL, AMENITY_LABEL } from '@/lib/listings';
import { STATUS_LABEL, COUNTRY_FLAG, formatBudget, formatDate, type Status } from '@/lib/requests';

interface PropertyRequestDetail {
  id: string;
  transactionType: string;
  propertyType: string;
  country: string;
  city: string;
  bedrooms: string | null;
  salons: string | null;
  surfaceM2: number | null;
  capacity: number | null;
  amenities: string[];
  priority: string;
  budgetMin: number | null;
  budgetMax: number | null;
  financing: string;
  delay: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  clientType: string;
  source: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function DemandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = useUser();
  const { toast } = useToast();
  const { id } = use(params);

  const [request, setRequest] = useState<PropertyRequestDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<{ propertyRequest: PropertyRequestDetail }>(`/api/requests/${id}`)
      .then((res) => {
        if (!cancelled) setRequest(res.propertyRequest);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setRequest(null);
        } else {
          toast(e instanceof ApiError ? e.message : 'Impossible de charger la demande.', 'error');
          setRequest(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  if (!user) return null;

  if (request === undefined) {
    return (
      <DashboardShell active="requests" searchPlaceholder="Rechercher une annonce, un contact…">
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-14 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
          <p className="text-xs text-gray-400">Chargement de la demande…</p>
        </div>
      </DashboardShell>
    );
  }

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

  const status = request.status as Status;
  const propertyLabel = PROPERTY_TYPE_LABEL[request.propertyType] ?? request.propertyType;
  const transactionLabel =
    TRANSACTION_TYPE_LABEL[request.transactionType] ?? request.transactionType;
  const shortRef = request.id.slice(-8).toUpperCase();

  const characteristics = [
    request.bedrooms && { label: 'Chambres', value: request.bedrooms },
    request.salons && { label: 'Salon', value: request.salons },
    request.surfaceM2 && { label: 'Superficie', value: `${request.surfaceM2} m²` },
    request.capacity && { label: 'Nombre de places', value: `${request.capacity}` },
  ].filter((c): c is { label: string; value: string } => Boolean(c));

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
          <span className="font-semibold text-neutral-900">Détail de la demande #{shortRef}</span>
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
                  Recherche {propertyLabel.toLowerCase()} à {request.city}
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-gray-400">
                  <Hash className="h-[13px] w-[13px]" aria-hidden />
                  {shortRef}
                  <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                  <Calendar className="h-3 w-3" aria-hidden />
                  Soumise le {formatDate(request.createdAt)}
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                {request.priority === 'Urgent' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-red-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Urgent
                  </span>
                )}
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                    status === 'EN_ATTENTE'
                      ? 'bg-amber-100 text-amber-800'
                      : status === 'EN_COURS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-200 text-gray-700',
                  )}
                >
                  {STATUS_LABEL[status]}
                </span>
                <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-brand">
                  {transactionLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-black/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { label: 'Type de bien', value: propertyLabel },
                {
                  label: 'Budget',
                  value: formatBudget(request.budgetMin, request.budgetMax),
                  highlight: true,
                },
                {
                  label: 'Zone souhaitée',
                  value: `${COUNTRY_FLAG[request.country] ?? ''} ${request.city}`,
                },
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

          {/* CARACTÉRISTIQUES */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
                <ListChecks className="h-3.5 w-3.5 text-emerald-800" aria-hidden />
              </span>
              Caractéristiques du bien recherché
            </h2>
            {characteristics.length > 0 && (
              <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {characteristics.map((c) => (
                  <div
                    key={c.label}
                    className="flex flex-col gap-0.5 rounded-lg bg-[#F9FAFB] p-3.5"
                  >
                    <p className="text-[11.5px] text-gray-400">{c.label}</p>
                    <p className="text-[13px] font-semibold text-neutral-900">{c.value}</p>
                  </div>
                ))}
              </div>
            )}
            {request.amenities.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11.5px] font-semibold text-gray-400 uppercase">
                  Équipements souhaités
                </p>
                <div className="flex flex-wrap gap-2">
                  {request.amenities.map((key) => (
                    <span
                      key={key}
                      className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-neutral-700"
                    >
                      {AMENITY_LABEL[key] ?? key}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5 rounded-lg bg-[#F9FAFB] p-3.5">
                <p className="text-[11.5px] text-gray-400">Financement</p>
                <p className="text-[13px] font-semibold text-neutral-900">{request.financing}</p>
              </div>
              <div className="flex flex-col gap-0.5 rounded-lg bg-[#F9FAFB] p-3.5">
                <p className="text-[11.5px] text-gray-400">Délai de recherche</p>
                <p className="text-[13px] font-semibold text-neutral-900">{request.delay}</p>
              </div>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-sora mb-4 flex items-center gap-2 text-[14px] font-semibold text-neutral-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100">
                <Clock className="h-3.5 w-3.5 text-gray-500" aria-hidden />
              </span>
              Historique
            </h2>
            <div className="flex flex-col">
              {[
                { event: 'Demande créée', meta: formatDate(request.createdAt) },
                ...(request.updatedAt !== request.createdAt
                  ? [{ event: 'Dernière mise à jour', meta: formatDate(request.updatedAt) }]
                  : []),
              ].map((t, i, arr) => (
                <div key={t.event} className="flex gap-3.5">
                  <div className="flex w-6 flex-shrink-0 flex-col items-center">
                    <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-brand bg-brand" />
                    {i < arr.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-black/[0.08]" />}
                  </div>
                  <div className={cn('min-w-0 flex-1', i < arr.length - 1 && 'pb-4.5')}>
                    <p className="text-[13px] font-medium text-neutral-900">{t.event}</p>
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
              <span className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-[15px] font-semibold text-brand">
                {initials(request.clientName)}
              </span>
              <div>
                <p className="text-[15px] font-semibold text-neutral-900">{request.clientName}</p>
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                  <UserCheck className="h-2.5 w-2.5" aria-hidden />
                  {request.clientType}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-b border-black/[0.06] py-2 text-[13px] text-neutral-700">
              <Phone className="h-[13px] w-[13px] flex-shrink-0 text-brand" aria-hidden />
              <span>{request.clientPhone}</span>
            </div>
            {request.clientEmail && (
              <div className="flex items-center gap-2.5 border-b border-black/[0.06] py-2 text-[13px] text-neutral-700">
                <Mail className="h-[13px] w-[13px] flex-shrink-0 text-brand" aria-hidden />
                <span className="truncate">{request.clientEmail}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 py-2 text-[13px] text-neutral-700">
              <MapPin className="h-[13px] w-[13px] flex-shrink-0 text-brand" aria-hidden />
              <span>
                {COUNTRY_FLAG[request.country] ?? ''} {request.city}, {request.country}
              </span>
            </div>
            {request.source && (
              <p className="mt-2 text-[11.5px] text-gray-400">Connu via : {request.source}</p>
            )}
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
                    {status === 'EN_ATTENTE'
                      ? 'En attente de traitement'
                      : status === 'EN_COURS'
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
                    request.priority === 'Urgent' ? 'bg-red-100' : 'bg-gray-100',
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4',
                      request.priority === 'Urgent' ? 'text-red-600' : 'text-gray-500',
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'text-[13.5px] font-semibold',
                      request.priority === 'Urgent' ? 'text-red-700' : 'text-neutral-700',
                    )}
                  >
                    {request.priority}
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
        </div>
      </div>
    </DashboardShell>
  );
}
