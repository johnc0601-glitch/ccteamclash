import type {
  RankingEntry,
  RankingPlayerProvider,
  RankingStatisticsProvider,
} from '@/services/rankings/RankingTypes';

const OVERALL_LIMIT = 25;
const WOMENS_LIMIT = 10;

function rankingPoints(entry: Omit<RankingEntry, 'rank'>): number {
  return entry.statistics.overallRecord.wins + entry.statistics.overallRecord.ties * .5;
}

function hasSameRankingScore(left: Omit<RankingEntry, 'rank'>, right: Omit<RankingEntry, 'rank'>): boolean {
  return rankingPoints(left) === rankingPoints(right)
    && left.statistics.winPercentage === right.statistics.winPercentage;
}

export class RankingsService {
  private readonly players: RankingPlayerProvider;
  private readonly statistics: RankingStatisticsProvider;

  constructor(players: RankingPlayerProvider, statistics: RankingStatisticsProvider) {
    this.players = players;
    this.statistics = statistics;
  }

  async getOverallRankings(seasonId: string, limit = OVERALL_LIMIT): Promise<RankingEntry[]> {
    return this.getRankings(seasonId, limit, false);
  }

  async getWomensRankings(seasonId: string, limit = WOMENS_LIMIT): Promise<RankingEntry[]> {
    return this.getRankings(seasonId, limit, true);
  }

  async getTotalRankings(seasonId: string): Promise<RankingEntry[]> {
    return this.getRankings(seasonId, undefined, false);
  }

  private async getRankings(
    seasonId: string,
    limit: number | undefined,
    womensOnly: boolean,
  ): Promise<RankingEntry[]> {
    const players = await this.players.getAll({status: 'active'});
    const eligiblePlayers = womensOnly
      ? players.filter((player) => player.gender === 'Female')
      : players;
    const entries = await Promise.all(eligiblePlayers.map(async (player) => ({
      player,
      statistics: await this.statistics.getPlayerStatistics(player.id, seasonId),
    })));

    const rankedEntries = entries
      .filter((entry) => entry.statistics.matchesPlayed > 0)
      .sort((left, right) =>
        rankingPoints(right) - rankingPoints(left)
        || right.statistics.winPercentage - left.statistics.winPercentage
        || left.player.name.localeCompare(right.player.name, undefined, {sensitivity: 'base'}),
      );
    const limitedEntries = typeof limit === 'number'
      ? rankedEntries.slice(0, Math.max(0, limit))
      : rankedEntries;

    let previous: Omit<RankingEntry, 'rank'> | undefined;
    let previousRank = 0;
    return limitedEntries.map((entry, index) => {
      const rank = previous && hasSameRankingScore(previous, entry) ? previousRank : index + 1;
      previous = entry;
      previousRank = rank;
      return {...entry, rank};
    });
  }
}
