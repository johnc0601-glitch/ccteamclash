import type {RatedResult} from './RatedResult';

export type HistoricalRatingSeedRow = {
  season_id: string;
  player_name: string;
  source: string;
};

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function normalizedSource(source: string | null | undefined): string {
  const value = source?.trim().toLocaleUpperCase();
  if (value === 'PDGA') return 'PDGA';
  if (value === 'GHOST') return 'GHOST';
  return 'UNKNOWN';
}

/**
 * Adds seed-source confidence metadata to historical normalized results without
 * changing any rating, probability, or CI movement. Missing sources remain
 * UNKNOWN and are treated conservatively by the story context layer.
 */
export function annotateHistoricalRatingSeedSources(
  results: RatedResult[],
  seedRows: HistoricalRatingSeedRow[],
): RatedResult[] {
  const sourceBySeasonAndName = new Map<string, string>();
  for (const row of seedRows) {
    const key = `${row.season_id}\u0000${normalizeName(row.player_name)}`;
    const source = normalizedSource(row.source);
    const existing = sourceBySeasonAndName.get(key);
    if (!existing || existing === 'UNKNOWN' || source === 'PDGA') {
      sourceBySeasonAndName.set(key, source);
    }
  }

  return results.map((result) => ({
    ...result,
    subjectRatingSeedSources: result.subjectNames.map((name) =>
      sourceBySeasonAndName.get(`${result.seasonId}\u0000${normalizeName(name)}`) ?? 'UNKNOWN',
    ),
  }));
}
