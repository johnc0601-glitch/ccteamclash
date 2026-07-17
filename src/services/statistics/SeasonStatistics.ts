import type {
  ChallengeResult,
  SeasonStatistics as SeasonStatisticsResult,
} from '@/services/statistics/StatisticsTypes';

export class SeasonStatistics {
  calculate(seasonId: string, results: ChallengeResult[]): SeasonStatisticsResult {
    const seasonResults = results.filter((result) => result.seasonId === seasonId);
    const margins = seasonResults.map((result) => Math.abs(result.homeScore - result.awayScore));
    const totalTeamPoints = seasonResults.reduce(
      (total, result) => total + result.homeScore + result.awayScore,
      0,
    );

    return {
      seasonId,
      challengesPlayed: seasonResults.length,
      totalTeamPoints,
      averageMargin: margins.length
        ? Math.round((margins.reduce((total, margin) => total + margin, 0) / margins.length) * 10) / 10
        : 0,
      closestChallenge: this.getByMargin(seasonResults, 'closest'),
      largestVictory: this.getByMargin(seasonResults, 'largest'),
      highestScoringChallenge: this.getHighestScoring(seasonResults),
    };
  }

  private getByMargin(
    results: ChallengeResult[],
    mode: 'closest' | 'largest',
  ): ChallengeResult | undefined {
    return [...results].sort((left, right) => {
      const leftMargin = Math.abs(left.homeScore - left.awayScore);
      const rightMargin = Math.abs(right.homeScore - right.awayScore);
      return mode === 'closest' ? leftMargin - rightMargin : rightMargin - leftMargin;
    })[0];
  }

  private getHighestScoring(results: ChallengeResult[]): ChallengeResult | undefined {
    return [...results].sort((left, right) =>
      (right.homeScore + right.awayScore) - (left.homeScore + left.awayScore),
    )[0];
  }
}
