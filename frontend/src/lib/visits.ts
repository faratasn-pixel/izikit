export type VisitStatus = 'CONFIRMEE' | 'EN_ATTENTE' | 'ANNULEE';
export type VisitType = 'PRESENTIEL' | 'VIRTUELLE';

export interface VisitListingSummary {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  transactionType: string;
  price: number;
  currency: string;
}

export interface VisitInquirySummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  listing: VisitListingSummary;
}

export interface Visit {
  id: string;
  scheduledAt: string;
  type: VisitType;
  status: VisitStatus;
  notes: string | null;
  createdAt: string;
  inquiry: VisitInquirySummary;
}

export interface VisitStats {
  total: number;
  confirmees: number;
  enAttente: number;
  annulees: number;
}

export interface EligibleInquiry {
  id: string;
  name: string;
  phone: string;
  message: string;
  createdAt: string;
  listing: { id: string; title: string; city: string };
}

export interface CalendarDayEvent {
  id: string;
  label: string;
  status: VisitStatus;
}

export interface CalendarCell {
  day: number;
  dateStr: string;
  otherMonth: boolean;
  events: CalendarDayEvent[];
}

export interface AgendaVisit {
  id: string;
  listingTitle: string;
  scheduledAt: string;
  clientName: string;
  status: VisitStatus;
}

export interface VisitsCalendarResponse {
  days: { date: string; events: CalendarDayEvent[] }[];
  today: AgendaVisit[];
  upcoming: AgendaVisit[];
}

export const STATUS_LABEL: Record<VisitStatus, string> = {
  CONFIRMEE: 'Confirmée',
  EN_ATTENTE: 'En attente',
  ANNULEE: 'Annulée',
};

export const STATUS_BADGE_CLASS: Record<VisitStatus, string> = {
  CONFIRMEE: 'bg-emerald-100 text-emerald-800',
  EN_ATTENTE: 'bg-amber-100 text-amber-800',
  ANNULEE: 'bg-red-100 text-red-700',
};

export const TYPE_LABEL: Record<VisitType, string> = {
  PRESENTIEL: 'Présentiel',
  VIRTUELLE: 'Virtuelle',
};

export const TYPE_BADGE_CLASS: Record<VisitType, string> = {
  PRESENTIEL: 'bg-brand/10 text-brand',
  VIRTUELLE: 'bg-purple-100 text-purple-700',
};

export const DATE_BLOCK_STYLE: Record<VisitStatus, { bg: string; text: string }> = {
  CONFIRMEE: { bg: 'bg-[#F0FDF4]', text: 'text-emerald-600' },
  EN_ATTENTE: { bg: 'bg-[#FEF9EE]', text: 'text-amber-600' },
  ANNULEE: { bg: 'bg-red-50', text: 'text-red-600' },
};

export function formatVisitTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h');
}

export function formatVisitDateTime(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return `${datePart} · ${formatVisitTime(iso)}`;
}

export function formatVisitDayMonth(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
  };
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Monday-start month grid. `month` is 1-12. `eventsByDate` keys are
 * `YYYY-MM-DD`. Always returns a multiple of 7 cells (5 or 6 full weeks),
 * padding with the trailing days of the previous/next month.
 */
export function buildCalendarGrid(
  year: number,
  month: number,
  eventsByDate: Record<string, CalendarDayEvent[]>,
): CalendarCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=Mon..6=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 2, day);
    cells.push({ day, dateStr: formatDateKey(d), otherMonth: true, events: [] });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dateStr = formatDateKey(d);
    cells.push({ day, dateStr, otherMonth: false, events: eventsByDate[dateStr] ?? [] });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailing = 7 - remainder;
    for (let day = 1; day <= trailing; day++) {
      const d = new Date(year, month, day);
      cells.push({ day, dateStr: formatDateKey(d), otherMonth: true, events: [] });
    }
  }
  return cells;
}
