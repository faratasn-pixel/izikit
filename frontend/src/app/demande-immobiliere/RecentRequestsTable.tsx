'use client';

import { useEffect, useState } from 'react';
import { Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL } from '@/lib/listings';
import {
  PROPERTY_TYPE_ICON,
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  COUNTRY_FLAG,
  formatBudget,
  formatDate,
  type Status,
} from '@/lib/requests';

interface RecentPropertyRequest {
  id: string;
  transactionType: string;
  propertyType: string;
  country: string;
  city: string;
  budgetMin: number | null;
  budgetMax: number | null;
  status: Status;
  createdAt: string;
}

const TABLE_HEADERS = [
  'Type de bien',
  'Localisation',
  'Transaction',
  'Budget',
  'Statut',
  'Déposé le',
];

export function RecentRequestsTable() {
  const [items, setItems] = useState<RecentPropertyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<{ items: RecentPropertyRequest[] }>('/api/public/property-requests')
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-black/[0.06] bg-gray-50 p-10 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement des demandes…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-gray-50 p-10 text-center text-sm text-gray-500">
        Aucune demande déposée pour l&apos;instant.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-black/[0.06]">
      <table className="w-full min-w-[820px]">
        <thead>
          <tr className="border-b border-black/[0.06]">
            {TABLE_HEADERS.map((h) => (
              <th
                key={h}
                className="px-3.5 py-3 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-gray-400 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => {
            const TypeIcon = PROPERTY_TYPE_ICON[r.propertyType] ?? Circle;
            return (
              <tr
                key={r.id}
                className={cn(
                  'border-b border-black/[0.06] last:border-0',
                  i % 2 === 1 && 'bg-gray-50',
                )}
              >
                <td className="px-3.5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold whitespace-nowrap text-brand">
                    <TypeIcon className="h-3 w-3" aria-hidden />
                    {PROPERTY_TYPE_LABEL[r.propertyType] ?? r.propertyType}
                  </span>
                </td>
                <td className="px-3.5 py-3.5 text-[13.5px] whitespace-nowrap">
                  {COUNTRY_FLAG[r.country] ?? ''} {r.city}
                </td>
                <td className="px-3.5 py-3.5 text-[13.5px] font-semibold whitespace-nowrap">
                  {TRANSACTION_TYPE_LABEL[r.transactionType] ?? r.transactionType}
                </td>
                <td className="px-3.5 py-3.5 text-[13.5px] font-semibold whitespace-nowrap">
                  {formatBudget(r.budgetMin, r.budgetMax)}
                </td>
                <td className="px-3.5 py-3.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap',
                      STATUS_BADGE_CLASS[r.status],
                    )}
                  >
                    <Circle className="h-2 w-2 fill-current" aria-hidden />
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-3.5 py-3.5 text-[13px] whitespace-nowrap text-gray-500">
                  {formatDate(r.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
