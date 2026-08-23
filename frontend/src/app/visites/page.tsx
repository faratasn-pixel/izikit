'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  Plus,
  CalendarCheck,
  CheckCircle,
  Clock,
  XCircle,
  Table2,
  CalendarDays,
  Search,
  SlidersHorizontal,
  Calendar,
  Eye,
  Pencil,
  X,
  Loader2,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import {
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  TYPE_LABEL,
  TYPE_BADGE_CLASS,
  formatVisitDateTime,
  type Visit,
  type VisitStats,
  type VisitStatus,
} from '@/lib/visits';

type View = 'CALENDRIER' | 'LISTE';

const EMPTY_STATS: VisitStats = { total: 0, confirmees: 0, enAttente: 0, annulees: 0 };

export default function VisitesPage() {
  const user = useUser();
  const { toast } = useToast();

  const [view, setView] = useState<View>('CALENDRIER');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Visit[]>([]);
  const [stats, setStats] = useState<VisitStats>(EMPTY_STATS);
  const [loadingTable, setLoadingTable] = useState(true);

  const [viewingVisit, setViewingVisit] = useState<Visit | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState<'PRESENTIEL' | 'VIRTUELLE'>('PRESENTIEL');
  const [editStatus, setEditStatus] = useState<VisitStatus>('EN_ATTENTE');
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  async function refetchTable(currentSearch: string) {
    setLoadingTable(true);
    try {
      const qs = new URLSearchParams({ limit: '50' });
      if (currentSearch.trim()) qs.set('search', currentSearch.trim());
      const res = await api<{ items: Visit[]; stats: VisitStats }>(`/api/visits?${qs.toString()}`);
      setItems(res.items);
      setStats(res.stats);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Impossible de charger les visites.', 'error');
    } finally {
      setLoadingTable(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    const handle = setTimeout(() => {
      refetchTable(search);
    }, 300);
    return () => clearTimeout(handle);
  }, [user, search]);

  useEffect(() => {
    setEditDate('');
    setEditTime('');
    if (!editingVisit) return;
    const d = new Date(editingVisit.scheduledAt);
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(d.toISOString().slice(11, 16));
    setEditType(editingVisit.type);
    setEditStatus(editingVisit.status);
  }, [editingVisit]);

  async function handleSaveEdit() {
    if (!editingVisit) return;
    setSaving(true);
    try {
      await api(`/api/visits/${editingVisit.id}`, {
        method: 'PATCH',
        body: {
          status: editStatus,
          type: editType,
          scheduledAt: new Date(`${editDate}T${editTime}:00`).toISOString(),
        },
      });
      toast('Visite mise à jour.', 'success');
      setEditingVisit(null);
      await refetchTable(search);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Impossible de mettre à jour la visite.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(visit: Visit) {
    if (!window.confirm('Annuler cette visite ?')) return;
    setCancelingId(visit.id);
    try {
      await api(`/api/visits/${visit.id}`, { method: 'PATCH', body: { status: 'ANNULEE' } });
      toast('Visite annulée.', 'success');
      await refetchTable(search);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Impossible d'annuler la visite.", 'error');
    } finally {
      setCancelingId(null);
    }
  }

  if (!user) return null;

  return (
    <DashboardShell active="visits" searchPlaceholder="Rechercher une annonce, un contact…">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sora text-xl font-semibold text-neutral-900 lg:text-[22px]">
            Visites programmées
          </h1>
          <p className="text-[13.5px] text-gray-400">
            Gérez et suivez toutes vos visites de biens immobiliers.
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
            onClick={() => window.dispatchEvent(new CustomEvent('visits:open-create'))}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            <Plus className="h-[15px] w-[15px]" aria-hidden />
            <span className="lg:hidden">Planifier</span>
            <span className="hidden lg:inline">Planifier une visite</span>
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: CalendarCheck,
            iconBg: 'bg-brand/10',
            iconColor: 'text-brand',
            value: stats.total,
            label: 'Visites ce mois',
          },
          {
            icon: CheckCircle,
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-700',
            value: stats.confirmees,
            label: 'Confirmées',
          },
          {
            icon: Clock,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-700',
            value: stats.enAttente,
            label: 'En attente',
          },
          {
            icon: XCircle,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            value: stats.annulees,
            label: 'Annulées',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.iconBg)}>
                <s.icon className={cn('h-[18px] w-[18px]', s.iconColor)} aria-hidden />
              </span>
            </div>
            <p className="font-sora mb-0.5 text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="text-[12.5px] font-medium text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* VIEW TABS */}
      <div className="flex w-fit items-center gap-1 rounded-2xl border border-black/[0.08] bg-white p-1.5">
        <button
          type="button"
          onClick={() => setView('LISTE')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium',
            view === 'LISTE' ? 'bg-brand font-semibold text-white' : 'text-gray-400',
          )}
        >
          <Table2 className="h-[14px] w-[14px]" aria-hidden />
          Liste
        </button>
        <button
          type="button"
          onClick={() => setView('CALENDRIER')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium',
            view === 'CALENDRIER' ? 'bg-brand font-semibold text-white' : 'text-gray-400',
          )}
        >
          <CalendarDays className="h-[14px] w-[14px]" aria-hidden />
          Calendrier
        </button>
      </div>

      {/* VISITS TABLE */}
      <div className="rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] p-5">
          <p className="font-sora text-[15px] font-semibold text-neutral-900">Toutes les visites</p>
          <div className="flex items-center gap-2.5">
            <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-3 py-1.5">
              <Search className="h-[13px] w-[13px] flex-shrink-0 text-gray-400" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full bg-transparent text-[12.5px] text-neutral-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-black/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-gray-400"
            >
              <SlidersHorizontal className="h-[13px] w-[13px]" aria-hidden />
              Filtrer
            </button>
          </div>
        </div>

        {loadingTable ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
            <p className="text-sm text-gray-400">Chargement des visites…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <CalendarCheck className="mb-1 h-8 w-8 text-gray-300" aria-hidden />
            <p className="text-sm font-medium text-neutral-700">
              {search.trim() ? 'Aucune visite pour cette recherche' : 'Aucune visite programmée'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { label: '#', mobileHidden: true },
                    { label: 'Bien immobilier', mobileHidden: false },
                    { label: 'Client', mobileHidden: false },
                    { label: 'Date & heure', mobileHidden: false },
                    { label: 'Localisation', mobileHidden: true },
                    { label: 'Type', mobileHidden: true },
                    { label: 'Statut', mobileHidden: false },
                    { label: 'Actions', mobileHidden: false },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={cn(
                        'font-sora px-4 py-3 text-left text-[11.5px] font-semibold whitespace-nowrap text-gray-400 uppercase',
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
                {items.map((v) => {
                  const status = STATUS_LABEL[v.status];
                  const statusClass = STATUS_BADGE_CLASS[v.status];
                  const type = TYPE_LABEL[v.type];
                  const typeClass = TYPE_BADGE_CLASS[v.type];
                  return (
                    <tr key={v.id} className="border-b border-black/[0.06] last:border-0">
                      <td className="hidden px-4 py-3.5 font-mono text-[11px] whitespace-nowrap text-gray-400 uppercase lg:table-cell">
                        {v.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] font-semibold whitespace-nowrap text-neutral-900">
                          {v.inquiry.listing.title}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] font-medium whitespace-nowrap text-neutral-900">
                          {v.inquiry.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-neutral-700">
                          <Calendar className="h-3 w-3 text-gray-400" aria-hidden />
                          {formatVisitDateTime(v.scheduledAt)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3.5 text-xs whitespace-nowrap text-gray-400 lg:table-cell">
                        {v.inquiry.listing.city}, {v.inquiry.listing.country}
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            typeClass,
                          )}
                        >
                          {type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap',
                            statusClass,
                          )}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingVisit(v)}
                            title="Voir"
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-gray-400 hover:text-neutral-700"
                          >
                            <Eye className="h-[13px] w-[13px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingVisit(v)}
                            title="Modifier"
                            disabled={v.status === 'ANNULEE'}
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-gray-400 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil className="h-[13px] w-[13px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(v)}
                            title="Annuler"
                            disabled={v.status === 'ANNULEE' || cancelingId === v.id}
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-black/[0.08] bg-[#F9FAFB] text-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {cancelingId === v.id ? (
                              <Loader2 className="h-[13px] w-[13px] animate-spin" aria-hidden />
                            ) : (
                              <X className="h-[13px] w-[13px]" aria-hidden />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {viewingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-sora text-[15px] font-semibold text-neutral-900">
                Détail de la visite
              </p>
              <button type="button" onClick={() => setViewingVisit(null)} className="text-gray-400">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <p>
                <span className="text-gray-400">Bien : </span>
                <span className="font-medium text-neutral-900">
                  {viewingVisit.inquiry.listing.title}
                </span>
              </p>
              <p>
                <span className="text-gray-400">Client : </span>
                <span className="font-medium text-neutral-900">{viewingVisit.inquiry.name}</span>
              </p>
              <p>
                <span className="text-gray-400">Téléphone : </span>
                <span className="font-medium text-neutral-900">{viewingVisit.inquiry.phone}</span>
              </p>
              <p>
                <span className="text-gray-400">Date : </span>
                <span className="font-medium text-neutral-900">
                  {formatVisitDateTime(viewingVisit.scheduledAt)}
                </span>
              </p>
              <p>
                <span className="text-gray-400">Type : </span>
                <span className="font-medium text-neutral-900">
                  {TYPE_LABEL[viewingVisit.type]}
                </span>
              </p>
              <p>
                <span className="text-gray-400">Statut : </span>
                <span className="font-medium text-neutral-900">
                  {STATUS_LABEL[viewingVisit.status]}
                </span>
              </p>
              {viewingVisit.notes && (
                <p>
                  <span className="text-gray-400">Notes : </span>
                  <span className="font-medium text-neutral-900">{viewingVisit.notes}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-sora text-[15px] font-semibold text-neutral-900">
                Modifier la visite
              </p>
              <button type="button" onClick={() => setEditingVisit(null)} className="text-gray-400">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[12.5px] font-medium text-gray-400">
                Date
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                />
              </label>
              <label className="text-[12.5px] font-medium text-gray-400">
                Heure
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                />
              </label>
              <label className="text-[12.5px] font-medium text-gray-400">
                Type
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'PRESENTIEL' | 'VIRTUELLE')}
                  className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                >
                  <option value="PRESENTIEL">Présentiel</option>
                  <option value="VIRTUELLE">Virtuelle</option>
                </select>
              </label>
              <label className="text-[12.5px] font-medium text-gray-400">
                Statut
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as VisitStatus)}
                  className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] text-neutral-900"
                >
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="CONFIRMEE">Confirmée</option>
                  <option value="ANNULEE">Annulée</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving || !editDate || !editTime}
                className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-brand/40"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
