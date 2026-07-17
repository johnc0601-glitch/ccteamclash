import type {
  ChallengeResult,
  HeadToHeadStatistics as HeadToHeadStatisticsResult,
} from '@/services/statistics/StatisticsTypes';
import {
  emptyRecord,
  getStreak,
  getTeamOutcome,
  recordOutcome,
  sortByDate,
} from '@/services/statistics/statisticsUtils';

export class HeadToHeadStatistics {
  calculate(
    teamAId: string,
    teamBId: string,
    seasonId: string,
    results: ChallengeResult[],
  ): HeadToHeadStatisticsResult {
    const meetings = sortByDate(results).filter((result) =>
      result.seasonId === seasonId
      && this.isMeeting(result, teamAId, teamBId),
    );
    const recordForTeamA = emptyRecord();
    const outcomes: string[] = [];
    let totalPointsForTeamA = 0;
    let totalPointsForTeamB = 0;

    meetings.forEach((result) => {
      const teamAIsHome = result.homeTeamId === teamAId;
      const teamAPoints = teamAIsHome ? result.homeScore : result.awayScore;
      const teamBPoints = teamAIsHome ? result.awayScore : result.homeScore;
      const outcome = getTeamOutcome(result, teamAId);
      recordOutcome(recordForTeamA, outcome);
      outcomes.push(outcome[0]);
      totalPointsForTeamA += teamAPoints;
      totalPointsForTeamB += teamBPoints;
    });

    return {
      seasonId,
      teamAId,
      teamBId,
      recordForTeamA,
      totalPointsForTeamA,
      totalPointsForTeamB,
      lastMeeting: meetings.at(-1),
      currentStreak: getStreak(outcomes),
    };
  }

  private isMeeting(result: ChallengeResult, teamAId: string, teamBId: string): boolean {
    return (result.homeTeamId === teamAId && result.awayTeamId === teamBId)
      || (result.homeTeamId === teamBId && result.awayTeamId === teamAId);
  }
}
