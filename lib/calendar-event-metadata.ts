export type CalendarEventType = 'task' | 'meeting' | 'hearing' | 'deadline';

export interface CalendarEventMetadata {
  version: 1;
  type: CalendarEventType;
  start: string;
  end: string;
  allDay: boolean;
}

const METADATA_PATTERN = /\n?<!--agenda-meta:([A-Za-z0-9+/=]+)-->/g;

function isCalendarEventMetadata(value: unknown): value is CalendarEventMetadata {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Partial<CalendarEventMetadata>;
  return metadata.version === 1
    && ['task', 'meeting', 'hearing', 'deadline'].includes(metadata.type || '')
    && typeof metadata.start === 'string'
    && typeof metadata.end === 'string'
    && typeof metadata.allDay === 'boolean'
    && !Number.isNaN(new Date(metadata.start).getTime())
    && !Number.isNaN(new Date(metadata.end).getTime());
}

export function decodeCalendarDescription(storedDescription?: string | null): {
  description: string;
  calendarMetadata: CalendarEventMetadata | null;
} {
  const value = storedDescription || '';
  let calendarMetadata: CalendarEventMetadata | null = null;

  const description = value.replace(METADATA_PATTERN, (_match, encoded: string) => {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const candidate = JSON.parse(decoded) as unknown;
      if (isCalendarEventMetadata(candidate)) calendarMetadata = candidate;
    } catch {
      // Metadados inválidos são removidos sem impedir a leitura da tarefa.
    }
    return '';
  }).trimEnd();

  return { description, calendarMetadata };
}

export function encodeCalendarDescription(
  description?: string | null,
  calendarMetadata?: CalendarEventMetadata | null,
): string {
  const cleanDescription = decodeCalendarDescription(description).description;
  if (!calendarMetadata || !isCalendarEventMetadata(calendarMetadata)) return cleanDescription;

  const encoded = Buffer.from(JSON.stringify(calendarMetadata), 'utf8').toString('base64');
  return `${cleanDescription}${cleanDescription ? '\n\n' : ''}<!--agenda-meta:${encoded}-->`;
}
