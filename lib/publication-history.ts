export type PublicationHistoryEvent = {
  timestamp: string;
  user: string;
  action: string;
};

const HISTORY_PATTERN = /<!-- HISTORY: ([\s\S]*?) -->/g;

export function extractPublicationHistory(description?: string | null): PublicationHistoryEvent[] {
  if (!description) return [];

  const events: PublicationHistoryEvent[] = [];
  for (const match of description.matchAll(HISTORY_PATTERN)) {
    if (!match[1]) continue;
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) events.push(...parsed);
    } catch {
      // Ignora somente blocos antigos corrompidos e continua lendo os demais.
    }
  }

  return events;
}

export function stripPublicationHistory(description?: string | null): string {
  return (description || '').replace(/\s*<!-- HISTORY: [\s\S]*? -->/g, '').trim();
}
