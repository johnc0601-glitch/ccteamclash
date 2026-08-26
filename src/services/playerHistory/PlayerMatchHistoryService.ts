import {
  toHistoricalHistoryEntry,
  type HistoricalPlayerHistoryEntry,
} from '@/domain/history/HistoricalPlayerMatchup';
import type {HistoricalPlayerMatchupRepository} from '@/domain/history/HistoricalPlayerMatchupRepository';
import type {PlayerMatchHistoryEntry} from '@/services/statistics';

export type CanonicalPlayerHistoryProvider = {
  getPlayerMatchHistory(playerId: string, limit?: number): Promise<PlayerMatchHistoryEntry[]>;
  getPlayerMatchHistoriesForPlayers(
    playerIds: string[],
    limit: number,
    seasonId?: string,
  ): Promise<Map<string, PlayerMatchHistoryEntry[]>>;
};

export class PlayerMatchHistoryService {
  constructor(
    private readonly canonical: CanonicalPlayerHistoryProvider,
    private readonly historical: HistoricalPlayerMatchupRepository,
  ) {}

  getCurrentSeasonMatches(
    playerIds: string[],
    activeSeasonId: string,
  ): Promise<Map<string, PlayerMatchHistoryEntry[]>> {
    return this.canonical.getPlayerMatchHistoriesForPlayers(playerIds, 3, activeSeasonId);
  }

  async getCompleteHistory(playerId: string): Promise<Array<PlayerMatchHistoryEntry | HistoricalPlayerHistoryEntry>> {
    const [canonical, historicalRows, historicalCi] = await Promise.all([
      this.canonical.getPlayerMatchHistory(playerId),
      this.historical.getByPlayerId(playerId),
      this.historical.getCiDeltasByPlayerId(playerId),
    ]);
    const combined = [
      ...canonical.sort((first, second) => second.date.localeCompare(first.date)),
      ...historicalRows.map((row) => {
        const entry = toHistoricalHistoryEntry(row);
        const ciDelta = historicalCi.get(row.deduplicationKey);
        return ciDelta === undefined ? entry : {...entry, ciDelta};
      }),
    ];
    const seen = new Set<string>();
    return combined.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }
}
