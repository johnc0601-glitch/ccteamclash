import type {
  ChallengeResult,
  PlayerMatchHistoryEntry,
  PlayerStatistics as PlayerStatisticsResult,
} from '@/services/statistics/StatisticsTypes';
import {
  emptyRecord,
  getStreak,
  getWinPercentage,
  recordOutcome,
  sortByDate,
} from '@/services/statistics/statisticsUtils';

export const FINALS_QUALIFYING_MATCHES = 2;

export class PlayerStatistics {
  calculate(playerId: string, seasonId: string, results: ChallengeResult[]): PlayerStatisticsResult {
    return this.calculateResults(
      playerId,
      seasonId,
      results.filter((result) => result.seasonId === seasonId),
    );
  }

  calculateCareer(playerId: string, results: ChallengeResult[]): PlayerStatisticsResult {
    return this.calculateResults(playerId, 'career', results);
  }

  getMatchHistory(
    playerId: string,
    results: ChallengeResult[],
    limit?: number,
    seasonId?: string,
  ): PlayerMatchHistoryEntry[] {
    const eligibleResults = seasonId
      ? results.filter((result) => result.seasonId === seasonId)
      : results;
    const history = sortByDate(eligibleResults).reverse().flatMap((result) => {
      const playerResults = result.playerResults.filter((entry) => entry.playerId === playerId);
      if (!playerResults.length) return [];

      return playerResults.flatMap((entry): PlayerMatchHistoryEntry[] => {
        const contestId = entry.contestId ?? entry.format;
        const participants = result.playerResults.filter((candidate) =>
          (candidate.contestId ?? candidate.format) === contestId);
        const opponents = participants.filter((candidate) => candidate.teamId !== entry.teamId);
        if (!opponents.length) return [];
        const partners = participants.filter((candidate) =>
          candidate.teamId === entry.teamId && candidate.playerId !== playerId);
        if (entry.format === 'Doubles' && (partners.length < 1 || opponents.length < 2)) return [];
        const opponentScore = opponents.find((candidate) => candidate.score !== undefined)?.score;

        return [{
          id: entry.id,
          challengeId: result.challengeId,
          seasonId: result.seasonId,
          date: result.date,
          teamId: entry.teamId,
          opponentTeamId: result.homeTeamId === entry.teamId
            ? result.awayTeamId
            : result.homeTeamId,
          format: entry.format,
          outcome: entry.outcome,
          isHome: result.homeTeamId === entry.teamId,
          opponentPlayerNames: opponents.map((candidate) => candidate.playerName),
          partnerPlayerNames: partners.map((candidate) => candidate.playerName),
          playerScore: entry.score,
          opponentScore,
          ciDelta: entry.ciDelta,
        }];
      });
    });
    return limit === undefined ? history : history.slice(0, limit);
  }

  private calculateResults(
    playerId: string,
    seasonId: string,
    results: ChallengeResult[],
  ): PlayerStatisticsResult {
    const singlesRecord = emptyRecord();
    const doublesRecord = emptyRecord();
    const overallRecord = emptyRecord();
    const teamIds = new Set<string>();
    const outcomes: string[] = [];
    let playerName = playerId;
    let pointsEarned = 0;
    let matchesPlayed = 0;

    sortByDate(results).forEach((result) => {
      const playerResults = result.playerResults
        .filter((playerResult) => playerResult.playerId === playerId);

      if (playerResults.length > 0) {
        matchesPlayed += 1;
      }

      playerResults.forEach((playerResult) => {
        playerName = playerResult.playerName;
        teamIds.add(playerResult.teamId);
        pointsEarned += playerResult.pointsEarned;
        recordOutcome(overallRecord, playerResult.outcome);
        recordOutcome(
          playerResult.format === 'Singles' ? singlesRecord : doublesRecord,
          playerResult.outcome,
        );
        outcomes.push(playerResult.outcome[0]);
      });
    });

    return {
      playerId,
      playerName,
      seasonId,
      teamIds: [...teamIds],
      matchesPlayed,
      finalsQualified: matchesPlayed >= FINALS_QUALIFYING_MATCHES,
      singlesRecord,
      doublesRecord,
      overallRecord,
      winPercentage: getWinPercentage(overallRecord),
      pointsEarned,
      currentStreak: getStreak(outcomes),
    };
  }
}
