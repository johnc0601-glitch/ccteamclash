import type {
  ChallengeResult,
  TeamStatistics as TeamStatisticsResult,
} from '@/services/statistics/StatisticsTypes';
import {
  emptyRecord,
  getStreak,
  getTeamOutcome,
  recordOutcome,
  roundPercentage,
  sortByDate,
} from '@/services/statistics/statisticsUtils';

export class TeamStatistics {
  calculate(teamId: string, seasonId: string, results: ChallengeResult[]): TeamStatisticsResult {
    const teamResults = sortByDate(results).filter((result) =>
      result.seasonId === seasonId
      && (result.homeTeamId === teamId || result.awayTeamId === teamId),
    );
    const record = emptyRecord();
    const homeRecord = emptyRecord();
    const awayRecord = emptyRecord();
    const outcomes: string[] = [];
    let pointsFor = 0;
    let pointsAgainst = 0;

    teamResults.forEach((result) => {
      const isHome = result.homeTeamId === teamId;
      const teamScore = isHome ? result.homeScore : result.awayScore;
      const opponentScore = isHome ? result.awayScore : result.homeScore;
      const outcome = getTeamOutcome(result, teamId);
      recordOutcome(record, outcome);
      recordOutcome(isHome ? homeRecord : awayRecord, outcome);
      outcomes.push(outcome[0]);
      pointsFor += teamScore;
      pointsAgainst += opponentScore;
    });

    const totalAvailablePoints = pointsFor + pointsAgainst;
    return {
      teamId,
      seasonId,
      matchesPlayed: teamResults.length,
      record,
      homeRecord,
      awayRecord,
      pointsFor,
      pointsAgainst,
      pointDifferential: pointsFor - pointsAgainst,
      pointsPercentage: totalAvailablePoints
        ? roundPercentage((pointsFor / totalAvailablePoints) * 100)
        : 0,
      currentStreak: getStreak(outcomes),
      lastFive: outcomes.slice(-5),
    };
  }
}
