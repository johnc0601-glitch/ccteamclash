import type {ResultSourceDetails} from './MatchResult';

export function parseResultSourceDetails(value: unknown): ResultSourceDetails | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.sourceMatchId !== 'string' || !row.sourceMatchId.trim() || row.sourceMatchId.length > 200
    || (row.sourceRound !== 'Singles' && row.sourceRound !== 'Doubles')) return undefined;
  for (const key of ['card', 'homeStrokes', 'awayStrokes']) {
    if (row[key] !== undefined && (typeof row[key] !== 'number' || !Number.isInteger(row[key]) || Number(row[key]) < 0 || Number(row[key]) > 1000)) return undefined;
  }
  for (const key of ['resultText', 'startingHole']) {
    if (row[key] !== undefined && (typeof row[key] !== 'string' || String(row[key]).length > 200)) return undefined;
  }
  return {sourceMatchId: row.sourceMatchId, sourceRound: row.sourceRound,
    card: row.card as number | undefined, startingHole: row.startingHole as string | undefined,
    resultText: row.resultText as string | undefined, homeStrokes: row.homeStrokes as number | undefined, awayStrokes: row.awayStrokes as number | undefined};
}
