import {effectiveDoublesCi, expectedContestPointShare, regularSeasonChanceOfVictoryFromExpectedPoints} from './TeamStrength';

export type FrozenTeamContestFact = {
  contest_id: string;
  player_id: string;
  side: 'Home' | 'Away';
  format: 'Singles' | 'Doubles';
  clash_index_before: number;
  actual_points: number | string;
};

/** Same retrospective model as Match Lineup analysis, using frozen contest facts.
 * Each doubles side contributes once. Official-score residuals retain automatic,
 * bonus and penalty points without folding those adjustments into player CI.
 */
export function analyzeFrozenTeamMatch(input: {
  facts: readonly FrozenTeamContestFact[];
  venue: 'Home' | 'Neutral';
  homeScore: number | null;
  awayScore: number | null;
}) {
  const {homeScore, awayScore} = input;
  if (homeScore == null || awayScore == null
    || !Number.isFinite(homeScore) || !Number.isFinite(awayScore)
    || homeScore < 0 || awayScore < 0) return undefined;

  const contests = new Map<string, FrozenTeamContestFact[]>();
  for (const fact of input.facts) {
    const rows = contests.get(fact.contest_id) ?? [];
    rows.push(fact);
    contests.set(fact.contest_id, rows);
  }

  let homeRatedExpected = 0;
  let awayRatedExpected = 0;
  let homeRatedActual = 0;
  let awayRatedActual = 0;
  let ratedContests = 0;
  for (const rows of contests.values()) {
    const format = rows[0].format;
    const home = rows.filter((row) => row.side === 'Home');
    const away = rows.filter((row) => row.side === 'Away');
    const count = format === 'Doubles' ? 2 : 1;
    // Partial facts must not be mistaken for automatic points or a full match.
    if (home.length !== count || away.length !== count
      || rows.some((row) => row.format !== format
        || !Number.isFinite(row.clash_index_before) || row.clash_index_before <= 0)
      || new Set(rows.map((row) => row.player_id)).size !== rows.length) return undefined;

    const homeActual = Number(home[0].actual_points);
    const awayActual = Number(away[0].actual_points);
    if (![0, 0.5, 1].includes(homeActual) || homeActual + awayActual !== 1
      || home.some((row) => Number(row.actual_points) !== homeActual)
      || away.some((row) => Number(row.actual_points) !== awayActual)) return undefined;

    const strength = (side: FrozenTeamContestFact[]) => format === 'Singles'
      ? side[0].clash_index_before
      : effectiveDoublesCi(side[0].clash_index_before, side[1].clash_index_before);
    const share = expectedContestPointShare(strength(home), strength(away), input.venue);
    const weight = format === 'Doubles' ? 2 : 1;
    homeRatedExpected += share * weight;
    awayRatedExpected += (1 - share) * weight;
    homeRatedActual += homeActual * weight;
    awayRatedActual += awayActual * weight;
    ratedContests += 1;
  }
  if (!ratedContests) return undefined;

  const homeStructuralAdjustment = homeScore - homeRatedActual;
  const awayStructuralAdjustment = awayScore - awayRatedActual;
  const homeExpectedPoints = homeRatedExpected + homeStructuralAdjustment;
  const awayExpectedPoints = awayRatedExpected + awayStructuralAdjustment;
  const homeChanceOfVictory = regularSeasonChanceOfVictoryFromExpectedPoints(homeExpectedPoints, awayExpectedPoints);
  if (homeChanceOfVictory == null) return undefined;
  return {
    homeExpectedPoints,
    awayExpectedPoints,
    homeStructuralAdjustment,
    awayStructuralAdjustment,
    homeChanceOfVictory,
    awayChanceOfVictory: 1 - homeChanceOfVictory,
  };
}
