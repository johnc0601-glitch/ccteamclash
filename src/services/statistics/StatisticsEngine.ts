import {HeadToHeadStatistics} from '@/services/statistics/HeadToHeadStatistics';
import {PlayerStatistics} from '@/services/statistics/PlayerStatistics';
import type {StatisticsRepository} from '@/services/statistics/StatisticsRepository';
import {SeasonStatistics} from '@/services/statistics/SeasonStatistics';
import {TeamStatistics} from '@/services/statistics/TeamStatistics';
import type {
  HeadToHeadStatistics as HeadToHeadStatisticsResult,
  PlayerStatistics as PlayerStatisticsResult,
  SeasonStatistics as SeasonStatisticsResult,
  TeamStatistics as TeamStatisticsResult,
} from '@/services/statistics/StatisticsTypes';

export class StatisticsEngine {
  private readonly teamStatistics = new TeamStatistics();
  private readonly playerStatistics = new PlayerStatistics();
  private readonly seasonStatistics = new SeasonStatistics();
  private readonly headToHeadStatistics = new HeadToHeadStatistics();
  private readonly repository: StatisticsRepository;

  constructor(repository: StatisticsRepository) {
    this.repository = repository;
  }

  async getTeamStatistics(teamId: string, seasonId: string): Promise<TeamStatisticsResult> {
    const results = await this.repository.getPublishedChallengeResults();
    return this.teamStatistics.calculate(teamId, seasonId, results);
  }

  async getPlayerStatistics(playerId: string, seasonId: string): Promise<PlayerStatisticsResult> {
    const results = await this.repository.getPublishedChallengeResults();
    return this.playerStatistics.calculate(playerId, seasonId, results);
  }

  async getPlayerStatisticsForPlayers(
    playerIds: string[],
    seasonId: string,
  ): Promise<PlayerStatisticsResult[]> {
    const results = await this.repository.getPublishedChallengeResults();
    return playerIds.map((playerId) =>
      this.playerStatistics.calculate(playerId, seasonId, results));
  }

  async getSeasonStatistics(seasonId: string): Promise<SeasonStatisticsResult> {
    const results = await this.repository.getPublishedChallengeResults();
    return this.seasonStatistics.calculate(seasonId, results);
  }

  async getLeagueStatistics(seasonId: string): Promise<SeasonStatisticsResult> {
    return this.getSeasonStatistics(seasonId);
  }

  async getHeadToHead(
    teamAId: string,
    teamBId: string,
    seasonId: string,
  ): Promise<HeadToHeadStatisticsResult> {
    const results = await this.repository.getPublishedChallengeResults();
    return this.headToHeadStatistics.calculate(teamAId, teamBId, seasonId, results);
  }
}
