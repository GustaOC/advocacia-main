import { describe, expect, it } from 'vitest';
import { extractPublicationHistory, stripPublicationHistory } from './publication-history';

describe('publication history', () => {
  const first = { timestamp: '2026-09-01T10:00:00.000Z', user: 'Gustavo', action: 'Status alterado' };
  const second = { timestamp: '2026-09-01T11:00:00.000Z', user: 'Amábillin', action: 'Atribuição alterada' };
  const description = `Texto da publicação\n\n<!-- HISTORY: ${JSON.stringify([first])} -->\n\n<!-- HISTORY: ${JSON.stringify([second])} -->`;

  it('lê todos os blocos de histórico existentes', () => {
    expect(extractPublicationHistory(description)).toEqual([first, second]);
  });

  it('remove todos os blocos sem apagar a descrição', () => {
    expect(stripPublicationHistory(description)).toBe('Texto da publicação');
  });
});
