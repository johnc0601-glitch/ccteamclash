import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';

export interface HistoricalPlayerMatchupRepository {
  getByPlayerId(playerId: string): Promise<HistoricalPlayerMatchup[]>;
  upsert(rows: HistoricalPlayerMatchup[]): Promise<number>;
}

export class InMemoryHistoricalPlayerMatchupRepository implements HistoricalPlayerMatchupRepository {
  private readonly rows = new Map<string, HistoricalPlayerMatchup>();

  async getByPlayerId(playerId: string): Promise<HistoricalPlayerMatchup[]> {
    return [...this.rows.values()]
      .filter((row) => row.playerId === playerId)
      .sort(compareHistoricalRows)
      .map((row) => ({...row}));
  }

  async upsert(rows: HistoricalPlayerMatchup[]): Promise<number> {
    for (const row of rows) this.rows.set(row.deduplicationKey, {...row});
    return rows.length;
  }
}

export function compareHistoricalRows(first: HistoricalPlayerMatchup, second: HistoricalPlayerMatchup): number {
  return second.seasonId.localeCompare(first.seasonId)
    || second.eventOrder - first.eventOrder
    || second.sourceRow - first.sourceRow
    || first.deduplicationKey.localeCompare(second.deduplicationKey);
}
