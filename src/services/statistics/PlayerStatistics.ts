import type {
  ChallengeResult,
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
    const singlesRecord = emptyRecord();
    const doublesRecord = emptyRecord();
    const overallRecord = emptyRecord();
    const teamIds = new Set<string>();
    const outcomes: string[] = [];
    let playerName = playerId;
    let pointsEarned = 0;
    let matchesPlayed = 0;

    sortByDate(results)
      .filter((result) => result.seasonId === seasonId)
      .forEach((result) => {
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
