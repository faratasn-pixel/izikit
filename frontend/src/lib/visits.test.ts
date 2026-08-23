import { describe, it, expect } from 'vitest';
import { buildCalendarGrid, formatDateKey } from './visits';

describe('buildCalendarGrid', () => {
  it('builds the July 2025 grid with correct leading/trailing days (Tue 1st → Thu 31st)', () => {
    const cells = buildCalendarGrid(2025, 7, {});
    // Monday-start week: July 1 2025 is a Tuesday, so 1 leading day (June 30),
    // 31 days of July, then 3 trailing days (Aug 1-3) to complete the last week.
    expect(cells).toHaveLength(35);
    expect(cells[0]).toMatchObject({ day: 30, dateStr: '2025-06-30', otherMonth: true });
    expect(cells[1]).toMatchObject({ day: 1, dateStr: '2025-07-01', otherMonth: false });
    expect(cells[31]).toMatchObject({ day: 31, dateStr: '2025-07-31', otherMonth: false });
    expect(cells[32]).toMatchObject({ day: 1, dateStr: '2025-08-01', otherMonth: true });
    expect(cells[34]).toMatchObject({ day: 3, dateStr: '2025-08-03', otherMonth: true });
  });

  it('attaches events from eventsByDate to the matching day, empty array otherwise', () => {
    const events = {
      '2025-07-15': [{ id: 'v1', label: 'Villa, Lomé', status: 'CONFIRMEE' as const }],
    };
    const cells = buildCalendarGrid(2025, 7, events);
    const day15 = cells.find((c) => c.dateStr === '2025-07-15');
    expect(day15?.events).toEqual(events['2025-07-15']);
    const day14 = cells.find((c) => c.dateStr === '2025-07-14');
    expect(day14?.events).toEqual([]);
  });

  it('handles a January boundary (leading days roll back to the previous December)', () => {
    const cells = buildCalendarGrid(2026, 1, {});
    // Jan 1 2026 is a Thursday → 3 leading days from Dec 2025.
    expect(cells[0]).toMatchObject({ day: 29, dateStr: '2025-12-29', otherMonth: true });
    expect(cells[3]).toMatchObject({ day: 1, dateStr: '2026-01-01', otherMonth: false });
  });
});

describe('formatDateKey', () => {
  it('formats a Date as YYYY-MM-DD using local date parts', () => {
    expect(formatDateKey(new Date(2025, 6, 5))).toBe('2025-07-05');
  });
});
