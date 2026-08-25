import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';

export interface HistoricalPlayerMatchupRepository {
  getByPlayerId(playerId: string): Promise<HistoricalPlayerMatchup[]>;
  /** CI movement keyed by historical matchup deduplication key. */
  getCiDeltasByPlayerId(playerId: string): Promise<Map<string, number>>;
  upsert(rows: HistoricalPlayerMatchup[]): Promise<number>;
}

export class InMemoryHistoricalPlayerMatchupRepository implements HistoricalPlayerMatchupRepository {
  private readonly rows = new Map<string, HistoricalPlayerMatchup>();
  private readonly ciDeltas = new Map<string, number>();

  async getByPlayerId(playerId: string): Promise<HistoricalPlayerMatchup[]> {
    return [...this.rows.values()]
      .filter((row) => row.playerId === playerId)
      .sort(compareHistoricalRows)
      .map((row) => ({...row}));
  }

  async getCiDeltasByPlayerId(playerId: string): Promise<Map<string, number>> {
    const keys = new Set(
      [...this.rows.values()].filter((row) => row.playerId === playerId).map((row) => row.deduplicationKey),
    );
    return new Map([...this.ciDeltas].filter(([key]) => keys.has(key)));
  }

  setCiDelta(deduplicationKey: string, ciDelta: number): void {
    this.ciDeltas.set(deduplicationKey, ciDelta);
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
