'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Plus,
  Users,
  UserPlus,
  Clock,
  Percent,
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
  Loader2,
} from 'lucide-react';
import { useUser } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { cn } from '@/lib/utils';
import { TRANSACTION_TYPE_LABEL, formatListingPrice } from '@/lib/listings';
import {
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  formatContactDate,
  type ContactInquiry,
  type ContactStats,
  type ContactStatus,
} from '@/lib/contacts';

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const EMPTY_STATS: ContactStats = { total: 0, nouveaux7j: 0, enAttente: 0, tauxConversion: 0 };

export default function ContactsPage() {
  const user = useUser();
  const { toast } = useToast();

  const [items, setItems] = useState<ContactInquiry[]>([]);
  const [stats, setStats] = useState<ContactStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api<{ items: ContactInquiry[]; stats: ContactStats }>('/api/listings/inquiries?limit=50')
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setStats(res.stats);
        setSelectedId((current) => current ?? res.items[0]?.id ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        toast(e instanceof ApiError ? e.message : 'Impossible de charger les contacts.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) => c.name.toLowerCase().includes(q) || c.listing.title.toLowerCase().includes(q),
    );
  }, [items, search]);

  const selected = items.find((c) => c.id === selectedId) ?? items[0] ?? null;

  useEffect(() => {
    setNoteDraft(selected?.notes ?? '');
  }, [selected?.id, selected?.notes]);

  async function handleStatusChange(next: ContactStatus) {
    if (!selected) return;
    const previous = items;
    setUpdatingStatus(true);
    setItems((rows) => rows.map((r) => (r.id === selected.id ? { ...r, status: next } : r)));
    try {
      await api(`/api/listings/inquiries/${selected.id}`, {
        method: 'PATCH',
        body: { status: next },
      });
    } catch (e) {
      setItems(previous);
      toast(e instanceof ApiError ? e.message : 'Impossible de mettre à jour le statut.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSaveNote() {
    if (!selected) return;
    setSavingNote(true);
    try {
      await api(`/api/listings/inquiries/${selected.id}`, {
        method: 'PATCH',
        body: { notes: noteDraft },
      });
      setItems((rows) => rows.map((r) => (r.id === selected.id ? { ...r, notes: noteDraft } : r)));
      toast('Note enregistrée.', 'success');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Impossible d'enregistrer la note.", 'error');
    } finally {
      setSavingNote(false);
    }
  }

  if (!user) return null;

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
          { label: 'Total contacts', icon: Users, value: stats.total },
          { label: 'Nouveaux (7j)', icon: UserPlus, value: stats.nouveaux7j },
          { label: 'En attente de réponse', icon: Clock, value: stats.enAttente },
          { label: 'Taux de conversion', icon: Percent, value: `${stats.tauxConversion}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-400">{s.label}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10">
                <s.icon className="h-4 w-4 text-brand" aria-hidden />
              </span>
            </div>
            <p className="font-sora text-2xl font-semibold text-neutral-900">{s.value}</p>
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
                <p className="text-[12.5px] text-gray-400">{stats.total} contacts au total</p>
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

            {loading ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" aria-hidden />
                <p className="text-sm text-gray-400">Chargement des contacts…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                <Users className="mb-1 h-8 w-8 text-gray-300" aria-hidden />
                <p className="text-sm font-medium text-neutral-700">
                  {items.length === 0
                    ? "Aucun contact reçu pour l'instant"
                    : 'Aucun résultat pour cette recherche'}
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
                    {filtered.map((c) => (
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
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand">
                              {initials(c.name)}
                            </span>
                            <div>
                              <p className="text-[13.5px] font-semibold whitespace-nowrap text-neutral-900">
                                {c.name}
                              </p>
                              <p className="text-[11.5px] whitespace-nowrap text-gray-400">
                                {c.email ?? '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-5 py-3.5 text-[13px] whitespace-nowrap text-neutral-700 lg:table-cell">
                          {c.phone}
                        </td>
                        <td className="hidden px-5 py-3.5 text-[12.5px] font-medium whitespace-nowrap text-brand lg:table-cell">
                          {c.listing.title} · {c.listing.city}
                        </td>
                        <td className="hidden px-5 py-3.5 lg:table-cell">
                          <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-brand">
                            {TRANSACTION_TYPE_LABEL[c.listing.transactionType] ??
                              c.listing.transactionType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                              STATUS_BADGE_CLASS[c.status],
                            )}
                          >
                            {STATUS_LABEL[c.status]}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3.5 text-[12.5px] whitespace-nowrap text-gray-400 lg:table-cell">
                          {formatContactDate(c.createdAt)}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-black/[0.06] px-5 py-3.5">
              <span className="text-[12.5px] text-gray-400">
                Affichage de 1 à {filtered.length} sur {stats.total} contacts
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
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-md bg-brand text-[13px] font-medium text-white"
                >
                  1
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
          {!selected ? (
            <div className="rounded-2xl bg-white p-5 text-center text-[13px] text-gray-400">
              Sélectionnez un contact dans la liste pour voir sa fiche.
            </div>
          ) : (
            <>
              {/* Selected contact card */}
              <div className="rounded-2xl bg-white p-5">
                <p className="font-sora mb-3.5 text-[13.5px] font-semibold text-neutral-900">
                  Fiche contact
                </p>
                <div className="mb-4 flex flex-col items-center gap-2 border-b border-black/[0.06] pb-4 text-center">
                  <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-brand/10 text-lg font-semibold text-brand">
                    {initials(selected.name)}
                  </span>
                  <p className="font-sora text-[15px] font-semibold text-neutral-900">
                    {selected.name}
                  </p>
                  <select
                    value={selected.status}
                    disabled={updatingStatus}
                    onChange={(e) => handleStatusChange(e.target.value as ContactStatus)}
                    className={cn(
                      'cursor-pointer rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold focus:ring-2 focus:ring-brand focus:outline-none',
                      STATUS_BADGE_CLASS[selected.status],
                    )}
                  >
                    {(['EN_ATTENTE', 'REPONDU', 'VISITE_PLANIFIEE', 'NON_QUALIFIE'] as const).map(
                      (s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ),
                    )}
                  </select>
                  <p className="text-xs text-gray-400">
                    {TRANSACTION_TYPE_LABEL[selected.listing.transactionType] ??
                      selected.listing.transactionType}{' '}
                    · {selected.listing.city}, {selected.listing.country}
                  </p>
                </div>

                {[
                  { icon: Mail, label: 'Email', value: selected.email ?? '—' },
                  { icon: Phone, label: 'Tél.', value: selected.phone },
                  {
                    icon: Building2,
                    label: 'Annonce',
                    value: selected.listing.title,
                    brand: true,
                  },
                  {
                    icon: Tag,
                    label: 'Budget',
                    value: formatListingPrice(selected.listing.price, selected.listing.currency),
                  },
                  {
                    icon: Calendar,
                    label: 'Contact le',
                    value: formatContactDate(selected.createdAt),
                  },
                ].map((row, i) => (
                  <div
                    key={row.label}
                    className={cn(
                      'flex items-center gap-2 py-2 text-[13px]',
                      i < 4 && 'border-b border-black/[0.06]',
                    )}
                  >
                    <row.icon
                      className="h-[14px] w-[14px] flex-shrink-0 text-gray-400"
                      aria-hidden
                    />
                    <span className="w-[70px] flex-shrink-0 text-xs text-gray-400">
                      {row.label}
                    </span>
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

              {/* Message */}
              <div className="rounded-2xl bg-white p-5">
                <p className="font-sora mb-3.5 text-[13.5px] font-semibold text-neutral-900">
                  Message
                </p>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {selected.message}
                </p>
              </div>

              {/* Notes card */}
              <div className="rounded-2xl bg-white p-5">
                <p className="font-sora mb-3.5 text-[13.5px] font-semibold text-neutral-900">
                  Notes internes
                </p>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Ajouter une note sur ce contact…"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-black/[0.08] bg-[#F9FAFB] p-3.5 text-[13px] text-neutral-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
                />
                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={savingNote || noteDraft === (selected.notes ?? '')}
                    className="rounded-lg bg-brand px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-brand/40"
                  >
                    {savingNote ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
