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
    const [canonical, historicalRows] = await Promise.all([
      this.canonical.getPlayerMatchHistory(playerId),
      this.historical.getByPlayerId(playerId),
    ]);
    const combined = [
      ...canonical.sort((first, second) => second.date.localeCompare(first.date)),
      ...historicalRows.map(toHistoricalHistoryEntry),
    ];
    const seen = new Set<string>();
    return combined.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }
}
