import {ClashIndexMovement, type PlayerCiMovement} from '@/services/statistics/ClashIndexMovement';
import {HeadToHeadStatistics} from '@/services/statistics/HeadToHeadStatistics';
import {PlayerStatistics} from '@/services/statistics/PlayerStatistics';
import type {StatisticsRepository} from '@/services/statistics/StatisticsRepository';
import {SeasonStatistics} from '@/services/statistics/SeasonStatistics';
import {TeamStatistics} from '@/services/statistics/TeamStatistics';
import type {
  HeadToHeadStatistics as HeadToHeadStatisticsResult,
  PlayerMatchHistoryEntry,
  PlayerStatistics as PlayerStatisticsResult,
  SeasonStatistics as SeasonStatisticsResult,
  TeamStatistics as TeamStatisticsResult,
} from '@/services/statistics/StatisticsTypes';

export class StatisticsEngine {
  private readonly teamStatistics = new TeamStatistics();
  private readonly playerStatistics = new PlayerStatistics();
  private readonly ciMovement = new ClashIndexMovement();
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

  async getPlayerCareerStatistics(playerId: string): Promise<PlayerStatisticsResult> {
    const results = await this.repository.getPublishedChallengeResults();
    return this.playerStatistics.calculateCareer(playerId, results);
  }

  async getPlayerCareerStatisticsForPlayers(playerIds: string[]): Promise<PlayerStatisticsResult[]> {
    const results = await this.repository.getPublishedChallengeResults();
    return playerIds.map((playerId) => this.playerStatistics.calculateCareer(playerId, results));
  }

  async getPlayerCiMovement(playerId: string, seasonId: string): Promise<PlayerCiMovement | undefined> {
    const results = await this.repository.getPublishedChallengeResults();
    return this.ciMovement.calculateForSeason(playerId, seasonId, results);
  }

  async getPlayerCareerCiMovement(playerId: string): Promise<PlayerCiMovement | undefined> {
    const results = await this.repository.getPublishedChallengeResults();
    return this.ciMovement.calculateCareer(playerId, results);
  }

  async getPlayerCiMovementsForPlayers(
    playerIds: string[],
    seasonId: string,
  ): Promise<Map<string, PlayerCiMovement>> {
    const results = await this.repository.getPublishedChallengeResults();
    const movements = playerIds.flatMap((playerId) => {
      const movement = this.ciMovement.calculateForSeason(playerId, seasonId, results);
      return movement ? [[playerId, movement] as const] : [];
    });
    return new Map(movements);
  }

  async getPlayerSeasonStatisticsSnapshot(playerIds: string[], seasonId: string): Promise<{
    statistics: PlayerStatisticsResult[];
    ciMovements: Map<string, PlayerCiMovement>;
  }> {
    const results = await this.repository.getPublishedChallengeResults();
    const statistics = playerIds.map((playerId) => this.playerStatistics.calculate(playerId, seasonId, results));
    const ciMovements = new Map(playerIds.flatMap((playerId) => {
      const movement = this.ciMovement.calculateForSeason(playerId, seasonId, results);
      return movement ? [[playerId, movement] as const] : [];
    }));
    return {statistics, ciMovements};
  }

  async getPlayerMatchHistory(playerId: string, limit?: number): Promise<PlayerMatchHistoryEntry[]> {
    const results = await this.repository.getPublishedChallengeResults();
    return this.playerStatistics.getMatchHistory(playerId, results, limit);
  }

  async getPlayerMatchHistoriesForPlayers(
    playerIds: string[],
    limit: number,
    seasonId?: string,
  ): Promise<Map<string, PlayerMatchHistoryEntry[]>> {
    const results = await this.repository.getPublishedChallengeResults();
    return new Map(playerIds.map((playerId) => [
      playerId,
      this.playerStatistics.getMatchHistory(playerId, results, limit, seasonId),
    ]));
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
