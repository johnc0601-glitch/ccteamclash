import type {Player} from '@/models/Player';
import type {PlayerStatistics} from '@/services/statistics';
import type {PlayerQuery} from '@/types/player';

export type RankingEntry = {
  rank: number;
  player: Player;
  statistics: PlayerStatistics;
};

export interface RankingPlayerProvider {
  getAll(query?: Partial<PlayerQuery>): Promise<Player[]>;
}

export interface RankingStatisticsProvider {
  getPlayerStatistics(playerId: string, seasonId: string): Promise<PlayerStatistics>;
}
