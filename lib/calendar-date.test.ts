import { describe, expect, it } from 'vitest';
import {
  combineDateAndTimePtBr,
  formatDatePtBr,
  formatIsoDate,
  maskDatePtBr,
  maskTime24,
  parseDatePtBr,
} from './calendar-date';

describe('calendar date formatting', () => {
  it('uses the Brazilian date format', () => {
    const date = new Date(2026, 7, 30, 14, 5);
    expect(formatDatePtBr(date)).toBe('30/08/2026');
    expect(formatIsoDate(date)).toBe('2026-08-30');
  });

  it('masks dates and 24-hour times while typing', () => {
    expect(maskDatePtBr('30082026')).toBe('30/08/2026');
    expect(maskTime24('1430')).toBe('14:30');
  });

  it('rejects invalid dates and times', () => {
    expect(parseDatePtBr('31/02/2026')).toBeNull();
    expect(Number.isNaN(combineDateAndTimePtBr('30/08/2026', '25:00', false).getTime())).toBe(true);
  });

  it('combines a valid date and time without changing locale', () => {
    const date = combineDateAndTimePtBr('30/08/2026', '14:30', false);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(30);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(30);
  });
});
