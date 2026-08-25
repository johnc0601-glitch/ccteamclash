import {
  CLASH_MODEL_VERSION,
  doublesPairCi,
  eloProbability,
  performanceAboveExpectation,
  SINGLES_HOME_BONUS,
  type ClashFormat,
  type ClashSide,
  type ClashVenue,
} from './ClashPrediction';

export type ContestOutcome = 'W' | 'L' | 'T';

export type RatedContestPlayer = {
  playerId: string;
  teamId: string;
  playerName: string;
  teamName: string;
  side: ClashSide;
  clashIndexBefore: number;
};

export type ContestRatingFact = RatedContestPlayer & {
  contestId: string;
  matchId: string;
  venue: ClashVenue;
  format: ClashFormat;
  outcome: ContestOutcome;
  opponentEffectiveCi: number;
  winProbability: number;
  actualPoints: number;
  expectedPoints: number;
  performanceVsExpected: number;
  /** This contest's contribution only. Final CI is calculated once per Matchday. */
  ciDelta: number;
  algorithmVersion: string;
  calculatedAt: string;
};

export function outcomePoints(outcome: ContestOutcome): number {
  if (outcome === 'W') return 1;
  if (outcome === 'T') return 0.5;
  return 0;
}

export function buildSinglesRatingFact(input: {
  contestId: string;
  matchId: string;
  player: RatedContestPlayer;
  opponent: RatedContestPlayer;
  outcome: ContestOutcome;
  ciDelta: number;
  venue?: ClashVenue;
  calculatedAt?: string;
}): ContestRatingFact {
  const venue = input.venue ?? 'Home';
  const playerEffectiveCi = effectiveSinglesCi(input.player, venue);
  const opponentEffectiveCi = effectiveSinglesCi(input.opponent, venue);
  const probability = eloProbability(playerEffectiveCi, opponentEffectiveCi);

  return buildFact({...input, venue, format: 'Singles', opponentEffectiveCi, probability});
}

export function buildDoublesRatingFacts(input: {
  contestId: string;
  matchId: string;
  players: readonly [RatedContestPlayer, RatedContestPlayer];
  opponents: readonly [RatedContestPlayer, RatedContestPlayer];
  outcome: ContestOutcome;
  ciDeltas: readonly [number, number];
  venue?: ClashVenue;
  calculatedAt?: string;
}): readonly [ContestRatingFact, ContestRatingFact] {
  const venue = input.venue ?? 'Home';
  const opponentPairCi = doublesPairCi(input.opponents[0].clashIndexBefore, input.opponents[1].clashIndexBefore);
  const playerPairCi = doublesPairCi(input.players[0].clashIndexBefore, input.players[1].clashIndexBefore);
  const probability = eloProbability(playerPairCi, opponentPairCi);

  return input.players.map((player, index) => buildFact({
    contestId: input.contestId,
    matchId: input.matchId,
    player,
    outcome: input.outcome,
    ciDelta: input.ciDeltas[index],
    venue,
    calculatedAt: input.calculatedAt,
    format: 'Doubles',
    opponentEffectiveCi: opponentPairCi,
    probability,
  })) as unknown as readonly [ContestRatingFact, ContestRatingFact];
}

function effectiveSinglesCi(player: RatedContestPlayer, venue: ClashVenue): number {
  return player.clashIndexBefore + (venue === 'Home' && player.side === 'Home' ? SINGLES_HOME_BONUS : 0);
}

function buildFact(input: {
  contestId: string;
  matchId: string;
  player: RatedContestPlayer;
  outcome: ContestOutcome;
  ciDelta: number;
  venue: ClashVenue;
  calculatedAt?: string;
  format: ClashFormat;
  opponentEffectiveCi: number;
  probability: number;
}): ContestRatingFact {
  const actual = outcomePoints(input.outcome);
  return {
    ...input.player,
    contestId: input.contestId,
    matchId: input.matchId,
    venue: input.venue,
    format: input.format,
    outcome: input.outcome,
    opponentEffectiveCi: input.opponentEffectiveCi,
    winProbability: input.probability,
    actualPoints: actual,
    expectedPoints: input.probability,
    performanceVsExpected: performanceAboveExpectation(actual, input.probability),
    ciDelta: input.ciDelta,
    algorithmVersion: CLASH_MODEL_VERSION,
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
  };
}
