'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileStack,
  Upload,
  Download,
  RefreshCw,
} from 'lucide-react';
import { API_URL, COOKIE_PREFIX } from '@/lib/constants';
import { ApiError, api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type DocumentType =
  | 'ID_CARD'
  | 'PRO_CARD'
  | 'RCCM'
  | 'TAX_CERTIFICATE'
  | 'MANAGEMENT_MANDATE'
  | 'LIABILITY_INSURANCE';

type DocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

interface UploadedDocument {
  status: DocumentStatus;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface DocumentEntry {
  type: DocumentType;
  document: UploadedDocument | null;
}

interface Stats {
  verified: number;
  pending: number;
  missing: number;
  total: number;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  ID_CARD: "Pièce d'identité nationale (CNIB / Passeport)",
  PRO_CARD: "Carte professionnelle d'agent immobilier",
  RCCM: "Registre de commerce de l'agence (RCCM)",
  TAX_CERTIFICATE: 'Attestation fiscale (IFU / NIF)',
  MANAGEMENT_MANDATE: 'Mandat de gestion signé (modèle plateforme)',
  LIABILITY_INSURANCE: 'Assurance responsabilité civile professionnelle',
};

// Client-side mirror of the /api/legal-documents route's allowlist — used
// only for the file picker's `accept` attribute; the server remains the
// trust boundary (magic-byte sniff + MIME re-check).
const ACCEPT = 'application/pdf,image/jpeg,image/png';
const MAX_BYTES = 10 * 1024 * 1024;

function readCsrfToken(): string {
  if (typeof window === 'undefined') return '';
  const name = `${COOKIE_PREFIX}-csrf`;
  const fromStorage = localStorage.getItem(name);
  if (fromStorage) return fromStorage;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match && match[1] ? decodeURIComponent(match[1]) : '';
}

async function uploadDocument(type: DocumentType, file: File): Promise<UploadedDocument> {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/legal-documents`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'x-csrf-token': readCsrfToken() },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? `Error ${res.status}`, body);
  }
  const body = await res.json();
  return body.document as UploadedDocument;
}

function StatusBadge({ document }: { document: UploadedDocument | null }) {
  if (!document) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-800">
        <AlertCircle className="h-2.5 w-2.5" aria-hidden />
        Manquant
      </span>
    );
  }
  if (document.status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
        <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
        Vérifié
      </span>
    );
  }
  if (document.status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-800">
        <AlertCircle className="h-2.5 w-2.5" aria-hidden />
        Rejeté
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
      <Clock className="h-2.5 w-2.5" aria-hidden />
      En attente
    </span>
  );
}

function DocumentRow({
  entry,
  onUploaded,
}: {
  entry: DocumentEntry;
  onUploaded: (type: DocumentType, doc: UploadedDocument) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { document, type } = entry;

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast('Fichier trop volumineux (max 10 Mo).', 'error');
      return;
    }
    setBusy(true);
    try {
      const doc = await uploadDocument(type, file);
      onUploaded(type, doc);
      toast('Document envoyé — en attente de vérification.', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Erreur réseau. Réessaie.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const canReplace = !document || document.status !== 'VERIFIED';

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[13.5px] font-semibold text-neutral-900">{TYPE_LABELS[type]}</div>
        <div className="text-xs text-gray-500">
          {document
            ? `Téléversé le ${new Date(document.createdAt).toLocaleDateString('fr-FR')} · ${document.filename}`
            : 'Document requis — non encore déposé'}
          {document?.status === 'REJECTED' && document.rejectionReason && (
            <span className="block text-red-600">{document.rejectionReason}</span>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <StatusBadge document={document} />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => void onFileChosen(e)}
        />
        {document?.status === 'VERIFIED' ? (
          <a
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-[12.5px] font-semibold text-neutral-800 hover:bg-gray-50"
          >
            <Download className="h-3 w-3" aria-hidden />
            Télécharger
          </a>
        ) : canReplace ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={
              document
                ? 'inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-[12.5px] font-semibold text-neutral-800 hover:bg-gray-50 disabled:opacity-50'
                : 'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-brand/90 disabled:opacity-50'
            }
          >
            {document ? (
              <RefreshCw className="h-3 w-3" aria-hidden />
            ) : (
              <Upload className="h-3 w-3" aria-hidden />
            )}
            {busy ? 'Envoi…' : document ? 'Remplacer' : 'Déposer'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function LegalDocumentsCard() {
  const [entries, setEntries] = useState<DocumentEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ documents: DocumentEntry[]; stats: Stats }>('/api/legal-documents')
      .then((res) => {
        if (cancelled) return;
        setEntries(res.documents);
        setStats(res.stats);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onUploaded(type: DocumentType, doc: UploadedDocument) {
    setEntries((prev) => prev.map((e) => (e.type === type ? { type, document: doc } : e)));
    setStats((prev) =>
      prev
        ? {
            ...prev,
            pending: prev.pending + (doc.status === 'PENDING' ? 1 : 0),
            missing: Math.max(0, prev.missing - 1),
          }
        : prev,
    );
  }

  return (
    <>
      <div className="mb-3 flex items-start gap-3 rounded-lg bg-brand/5 p-4">
        <FileStack className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" aria-hidden />
        <p className="text-[13px] leading-relaxed text-neutral-700">
          <span className="font-sora block font-semibold text-neutral-900">
            Pourquoi ces documents sont-ils nécessaires ?
          </span>
          La vérification de vos documents légaux renforce la confiance des acheteurs et vendeurs,
          et vous permet d&apos;afficher le badge <strong>Agent Vérifié</strong> sur vos annonces et
          votre profil public.
        </p>
      </div>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatChip
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden />}
            iconBg="bg-emerald-100"
            value={stats.verified}
            label="Documents validés"
          />
          <StatChip
            icon={<Clock className="h-5 w-5 text-amber-700" aria-hidden />}
            iconBg="bg-amber-100"
            value={stats.pending}
            label="En attente de vérification"
          />
          <StatChip
            icon={<AlertCircle className="h-5 w-5 text-red-700" aria-hidden />}
            iconBg="bg-red-100"
            value={stats.missing}
            label="Document manquant"
          />
          <StatChip
            icon={<FileStack className="h-5 w-5 text-brand" aria-hidden />}
            iconBg="bg-brand/10"
            value={stats.total}
            label="Documents au total"
          />
        </div>
      )}

      <section className="rounded-xl bg-white p-6 lg:p-7">
        <h2 className="font-sora text-[15px] font-semibold text-neutral-900">Mes documents</h2>
        <p className="mb-2 text-[13px] text-gray-500">
          Déposez et suivez le statut de chaque document requis par la plateforme.
        </p>
        {!loaded && <p className="py-4 text-[13px] text-gray-400">Chargement…</p>}
        <div className="divide-y divide-black/[0.06]">
          {entries.map((entry) => (
            <DocumentRow key={entry.type} entry={entry} onUploaded={onUploaded} />
          ))}
        </div>
      </section>
    </>
  );
}

function StatChip({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
      <div>
        <div className="font-sora text-xl leading-none font-semibold text-neutral-900">{value}</div>
        <div className="text-[11.5px] text-gray-500">{label}</div>
      </div>
    </div>
  );
}
