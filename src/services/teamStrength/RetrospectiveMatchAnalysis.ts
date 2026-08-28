import type {ResultContest, ResultContestOutcome} from '@/domain/results/MatchResult';

import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import {
  DOUBLES_TEAM_POINTS_PER_CONTEST,
  effectiveDoublesCi,
  expectedContestPointShare,
  regularSeasonChanceOfVictoryFromExpectedMargin,
  TEAM_STRENGTH_VERSION,
  type TeamVenue,
} from './TeamStrength';

export type RetrospectiveWinner = 'Home' | 'Away' | 'Tie';

export type RetrospectiveMatchAnalysis = {
  version: typeof TEAM_STRENGTH_VERSION;
  source: 'postMatchActualMatchups';
  snapshotSource: 'matchLineup';
  matchId: string;
  snapshotCapturedAt: string;
  venue: TeamVenue;
  ratedSinglesContestCount: number;
  ratedDoublesContestCount: number;
  ratedContestMaximumPoints: number;
  homeRatedExpectedPoints: number;
  awayRatedExpectedPoints: number;
  homeRatedActualPoints: number;
  awayRatedActualPoints: number;
  /**
   * Official-score residual outside ordinary CI-rated contests. This may include
   * automatic points, women bonus points, penalties, or another official Clash
   * scoring adjustment. V1 deliberately does not guess the category.
   */
  homeStructuralAdjustment: number;
  awayStructuralAdjustment: number;
  officialHomeScore: number;
  officialAwayScore: number;
  homeExpectedPoints: number;
  awayExpectedPoints: number;
  expectedPointMargin: number;
  homeChanceOfVictory: number;
  awayChanceOfVictory: number;
  actualWinner: RetrospectiveWinner;
  predictedWinner: RetrospectiveWinner;
  winnerCorrect?: boolean;
};

type FrozenCiMaps = {
  home: ReadonlyMap<string, number | null>;
  away: ReadonlyMap<string, number | null>;
};

type RatedContestAnalysis = {
  maximumPoints: number;
  homeExpectedPoints: number;
  awayExpectedPoints: number;
  homeActualPoints: number;
  awayActualPoints: number;
};

/**
 * Replays a completed match with only information that was legitimately frozen
 * before play: the Match Lineup snapshot's per-player CI and venue. Actual
 * Singles opponents and Doubles pairs come from the published result contests.
 * The official team score remains the truth for structural scoring.
 *
 * No current player rating is accepted by this function. If a player required
 * for a complete rated contest has no frozen CI, the analysis is unavailable
 * rather than silently leaking a later rating into calibration.
 */
export function analyzeRetrospectiveMatch(input: {
  snapshot: TeamStrengthPredictionSnapshot;
  contests: readonly ResultContest[];
  officialHomeScore: number;
  officialAwayScore: number;
}): RetrospectiveMatchAnalysis | undefined {
  const {snapshot, contests} = input;
  if (
    snapshot.side !== 'Home'
    || snapshot.source !== 'matchLineup'
    || !validOfficialScore(input.officialHomeScore)
    || !validOfficialScore(input.officialAwayScore)
    || contests.some((contest) => contest.matchId !== snapshot.matchId)
  ) return undefined;

  const frozenCi = buildFrozenCiMaps(snapshot);
  if (!frozenCi) return undefined;

  let ratedSinglesContestCount = 0;
  let ratedDoublesContestCount = 0;
  let ratedContestMaximumPoints = 0;
  let homeRatedExpectedPoints = 0;
  let awayRatedExpectedPoints = 0;
  let homeRatedActualPoints = 0;
  let awayRatedActualPoints = 0;

  for (const contest of contests) {
    const rated = analyzeRatedContest(contest, frozenCi, snapshot.venue);
    if (rated === 'invalid') return undefined;
    if (!rated) continue;

    if (contest.format === 'Singles') ratedSinglesContestCount += 1;
    else ratedDoublesContestCount += 1;

    ratedContestMaximumPoints += rated.maximumPoints;
    homeRatedExpectedPoints += rated.homeExpectedPoints;
    awayRatedExpectedPoints += rated.awayExpectedPoints;
    homeRatedActualPoints += rated.homeActualPoints;
    awayRatedActualPoints += rated.awayActualPoints;
  }

  if (!ratedContestMaximumPoints) return undefined;

  // Result contests describe normal CI-rated play. Any difference between those
  // actual player-points and the official team score is retained separately as
  // structural scoring instead of being forced into player strength.
  const homeStructuralAdjustment = input.officialHomeScore - homeRatedActualPoints;
  const awayStructuralAdjustment = input.officialAwayScore - awayRatedActualPoints;
  const homeExpectedPoints = homeRatedExpectedPoints + homeStructuralAdjustment;
  const awayExpectedPoints = awayRatedExpectedPoints + awayStructuralAdjustment;
  const expectedPointMargin = homeExpectedPoints - awayExpectedPoints;
  const homeChanceOfVictory = regularSeasonChanceOfVictoryFromExpectedMargin(
    expectedPointMargin,
  );
  if (homeChanceOfVictory == null) return undefined;

  const actualWinner = winnerFromScores(input.officialHomeScore, input.officialAwayScore);
  const predictedWinner = winnerFromScores(homeChanceOfVictory, 1 - homeChanceOfVictory);

  return {
    version: TEAM_STRENGTH_VERSION,
    source: 'postMatchActualMatchups',
    snapshotSource: 'matchLineup',
    matchId: snapshot.matchId,
    snapshotCapturedAt: snapshot.capturedAt,
    venue: snapshot.venue,
    ratedSinglesContestCount,
    ratedDoublesContestCount,
    ratedContestMaximumPoints,
    homeRatedExpectedPoints,
    awayRatedExpectedPoints,
    homeRatedActualPoints,
    awayRatedActualPoints,
    homeStructuralAdjustment,
    awayStructuralAdjustment,
    officialHomeScore: input.officialHomeScore,
    officialAwayScore: input.officialAwayScore,
    homeExpectedPoints,
    awayExpectedPoints,
    expectedPointMargin,
    homeChanceOfVictory,
    awayChanceOfVictory: 1 - homeChanceOfVictory,
    actualWinner,
    predictedWinner,
    winnerCorrect: actualWinner === 'Tie' ? undefined : actualWinner === predictedWinner,
  };
}

function analyzeRatedContest(
  contest: ResultContest,
  frozenCi: FrozenCiMaps,
  venue: TeamVenue,
): RatedContestAnalysis | undefined | 'invalid' {
  if (!outcomesAreConsistent(contest.homeOutcome, contest.awayOutcome)) return 'invalid';

  const homePlayers = contest.players.filter((player) => player.side === 'Home');
  const awayPlayers = contest.players.filter((player) => player.side === 'Away');
  const expectedPlayerCount = contest.format === 'Singles' ? 1 : 2;

  if (homePlayers.length > expectedPlayerCount || awayPlayers.length > expectedPlayerCount) {
    return 'invalid';
  }

  // Incomplete result slots are structural (forfeit/automatic/etc.), not a
  // normal CI-vs-CI contest. The official-score residual accounts for them.
  if (homePlayers.length !== expectedPlayerCount || awayPlayers.length !== expectedPlayerCount) {
    return undefined;
  }

  const homeCis = homePlayers.map((player) => frozenCi.home.get(player.playerId));
  const awayCis = awayPlayers.map((player) => frozenCi.away.get(player.playerId));
  if (
    homeCis.some((ci) => !isValidFrozenCi(ci))
    || awayCis.some((ci) => !isValidFrozenCi(ci))
  ) return 'invalid';

  const homeContestCi = contest.format === 'Singles'
    ? homeCis[0] as number
    : effectiveDoublesCi(homeCis[0] as number, homeCis[1] as number);
  const awayContestCi = contest.format === 'Singles'
    ? awayCis[0] as number
    : effectiveDoublesCi(awayCis[0] as number, awayCis[1] as number);
  const maximumPoints = contest.format === 'Singles' ? 1 : DOUBLES_TEAM_POINTS_PER_CONTEST;
  const homeShare = expectedContestPointShare(homeContestCi, awayContestCi, venue);
  const homeActualPoints = actualPointsForOutcome(contest.homeOutcome, maximumPoints);

  return {
    maximumPoints,
    homeExpectedPoints: homeShare * maximumPoints,
    awayExpectedPoints: (1 - homeShare) * maximumPoints,
    homeActualPoints,
    awayActualPoints: maximumPoints - homeActualPoints,
  };
}

function buildFrozenCiMaps(snapshot: TeamStrengthPredictionSnapshot): FrozenCiMaps | undefined {
  const home = frozenCiMap(snapshot.teamPlayerClashIndexes);
  const away = frozenCiMap(snapshot.opponentPlayerClashIndexes);
  if (!home || !away) return undefined;
  return {home, away};
}

function frozenCiMap(
  entries: TeamStrengthPredictionSnapshot['teamPlayerClashIndexes'],
): ReadonlyMap<string, number | null> | undefined {
  const result = new Map<string, number | null>();
  for (const entry of entries) {
    if (!entry.playerId.trim() || result.has(entry.playerId)) return undefined;
    result.set(entry.playerId, entry.clashIndex);
  }
  return result;
}

function outcomesAreConsistent(home: ResultContestOutcome, away: ResultContestOutcome): boolean {
  return (home === 'W' && away === 'L')
    || (home === 'L' && away === 'W')
    || (home === 'T' && away === 'T');
}

function actualPointsForOutcome(outcome: ResultContestOutcome, maximumPoints: number): number {
  if (outcome === 'W') return maximumPoints;
  if (outcome === 'T') return maximumPoints / 2;
  return 0;
}

function validOfficialScore(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isValidFrozenCi(value: number | null | undefined): value is number {
  return Number.isFinite(value) && (value ?? 0) > 0;
}

function winnerFromScores(home: number, away: number): RetrospectiveWinner {
  if (home > away) return 'Home';
  if (away > home) return 'Away';
  return 'Tie';
}
