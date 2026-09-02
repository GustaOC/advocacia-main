import { describe, expect, it } from 'vitest';
import { decodeCalendarDescription, encodeCalendarDescription, type CalendarEventMetadata } from './calendar-event-metadata';

const metadata: CalendarEventMetadata = {
  version: 1,
  type: 'meeting',
  start: '2026-09-02T14:30:00.000Z',
  end: '2026-09-02T15:30:00.000Z',
  allDay: false,
};

describe('calendar event metadata', () => {
  it('stores metadata without altering the visible description', () => {
    const stored = encodeCalendarDescription('Reunião com o cliente', metadata);
    expect(stored).toContain('<!--agenda-meta:');
    expect(decodeCalendarDescription(stored)).toEqual({
      description: 'Reunião com o cliente',
      calendarMetadata: metadata,
    });
  });

  it('keeps ordinary task descriptions compatible', () => {
    expect(decodeCalendarDescription('Prazo comum')).toEqual({
      description: 'Prazo comum',
      calendarMetadata: null,
    });
  });

  it('removes invalid internal metadata safely', () => {
    expect(decodeCalendarDescription('Texto\n\n<!--agenda-meta:bmFvLWpzb24=-->')).toEqual({
      description: 'Texto',
      calendarMetadata: null,
    });
  });
});
