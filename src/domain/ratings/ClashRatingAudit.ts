import type {ResultContest, ResultContestOutcome, ResultContestPlayer} from '@/domain/results/MatchResult';
import {
  baseRatingMovement,
  CLASH_RATING_CONFIG,
  doublesTeamRating,
  expectedScore,
  type ClashRatingState,
} from '@/domain/ratings/ClashRatingEngine';

export type ClashContestLedgerRow = {
  sourceKey: string;
  sourceContestId: string;
  playerId: string;
  format: 'Singles' | 'Doubles';
  side: 'Home' | 'Away';
  outcome: 'W' | 'L' | 'T';
  ratingBefore: number;
  partnerPlayerId: string | null;
  partnerRating: number | null;
  opponentOnePlayerId: string;
  opponentOneRating: number;
  opponentTwoPlayerId: string | null;
  opponentTwoRating: number | null;
  ownPairRating: number | null;
  opponentPairRating: number | null;
  homeAdjustment: number;
  expectedScore: number;
  actualScore: 0 | 0.5 | 1;
  competitiveDelta: number;
  provisionalMultiplier: number;
  provisionalAdjustment: number;
  totalDelta: number;
};

export function buildClashContestLedger(
  contests: ResultContest[],
  states: ClashRatingState[],
): ClashContestLedgerRow[] {
  const stateByPlayer = new Map(states.map((state) => [state.playerId, state]));
  return contests.flatMap((contest) => contest.format === 'Singles'
    ? singlesRows(contest, stateByPlayer)
    : doublesRows(contest, stateByPlayer));
}

function singlesRows(
  contest: ResultContest,
  stateByPlayer: Map<string, ClashRatingState>,
): ClashContestLedgerRow[] {
  const home = requirePlayer(contest, 'Home', 1);
  const away = requirePlayer(contest, 'Away', 1);
  const homeState = requireState(stateByPlayer, home.playerId);
  const awayState = requireState(stateByPlayer, away.playerId);
  const homeExpected = expectedScore(homeState.rating + CLASH_RATING_CONFIG.homeAdvantage, awayState.rating);
  const homeActual = outcomeScore(contest.homeOutcome);
  const homeBase = baseRatingMovement(homeActual, homeExpected);

  return [
    makeRow({
      contest,
      player: home,
      state: homeState,
      outcome: contest.homeOutcome,
      opponentOne: away,
      opponentOneState: awayState,
      expected: homeExpected,
      competitiveDelta: homeBase,
      homeAdjustment: CLASH_RATING_CONFIG.homeAdvantage,
    }),
    makeRow({
      contest,
      player: away,
      state: awayState,
      outcome: contest.awayOutcome,
      opponentOne: home,
      opponentOneState: homeState,
      expected: 1 - homeExpected,
      competitiveDelta: -homeBase,
      homeAdjustment: 0,
    }),
  ];
}

function doublesRows(
  contest: ResultContest,
  stateByPlayer: Map<string, ClashRatingState>,
): ClashContestLedgerRow[] {
  const homePlayers = contest.players.filter((player) => player.side === 'Home').sort((a, b) => a.slot - b.slot);
  const awayPlayers = contest.players.filter((player) => player.side === 'Away').sort((a, b) => a.slot - b.slot);
  if (homePlayers.length !== 2 || awayPlayers.length !== 2) {
    throw new Error(`Doubles contest ${contest.id} must have two players per side.`);
  }
  const homeStates = homePlayers.map((player) => requireState(stateByPlayer, player.playerId));
  const awayStates = awayPlayers.map((player) => requireState(stateByPlayer, player.playerId));
  const homePair = doublesTeamRating(homeStates[0].rating, homeStates[1].rating);
  const awayPair = doublesTeamRating(awayStates[0].rating, awayStates[1].rating);
  const homeExpected = expectedScore(homePair + CLASH_RATING_CONFIG.homeAdvantage, awayPair);
  const teamBase = baseRatingMovement(outcomeScore(contest.homeOutcome), homeExpected);
  const homeBase = Math.round(teamBase / 2);
  const awayBase = -homeBase;

  return [
    ...homePlayers.map((player, index) => makeRow({
      contest,
      player,
      state: homeStates[index],
      outcome: contest.homeOutcome,
      partner: homePlayers[index === 0 ? 1 : 0],
      partnerState: homeStates[index === 0 ? 1 : 0],
      opponentOne: awayPlayers[0],
      opponentOneState: awayStates[0],
      opponentTwo: awayPlayers[1],
      opponentTwoState: awayStates[1],
      ownPairRating: homePair,
      opponentPairRating: awayPair,
      expected: homeExpected,
      competitiveDelta: homeBase,
      homeAdjustment: CLASH_RATING_CONFIG.homeAdvantage,
    })),
    ...awayPlayers.map((player, index) => makeRow({
      contest,
      player,
      state: awayStates[index],
      outcome: contest.awayOutcome,
      partner: awayPlayers[index === 0 ? 1 : 0],
      partnerState: awayStates[index === 0 ? 1 : 0],
      opponentOne: homePlayers[0],
      opponentOneState: homeStates[0],
      opponentTwo: homePlayers[1],
      opponentTwoState: homeStates[1],
      ownPairRating: awayPair,
      opponentPairRating: homePair,
      expected: 1 - homeExpected,
      competitiveDelta: awayBase,
      homeAdjustment: 0,
    })),
  ];
}

function makeRow(input: {
  contest: ResultContest;
  player: ResultContestPlayer;
  state: ClashRatingState;
  outcome: ResultContestOutcome;
  partner?: ResultContestPlayer;
  partnerState?: ClashRatingState;
  opponentOne: ResultContestPlayer;
  opponentOneState: ClashRatingState;
  opponentTwo?: ResultContestPlayer;
  opponentTwoState?: ClashRatingState;
  ownPairRating?: number;
  opponentPairRating?: number;
  expected: number;
  competitiveDelta: number;
  homeAdjustment: number;
}): ClashContestLedgerRow {
  const multiplier = provisionalMultiplier(input.state);
  const totalDelta = input.state.provisional
    ? Math.round(input.competitiveDelta * multiplier)
    : input.competitiveDelta;
  return {
    sourceKey: input.contest.id,
    sourceContestId: input.contest.id,
    playerId: input.player.playerId,
    format: input.contest.format,
    side: input.player.side,
    outcome: input.outcome,
    ratingBefore: input.state.rating,
    partnerPlayerId: input.partner?.playerId ?? null,
    partnerRating: input.partnerState?.rating ?? null,
    opponentOnePlayerId: input.opponentOne.playerId,
    opponentOneRating: input.opponentOneState.rating,
    opponentTwoPlayerId: input.opponentTwo?.playerId ?? null,
    opponentTwoRating: input.opponentTwoState?.rating ?? null,
    ownPairRating: input.ownPairRating ?? null,
    opponentPairRating: input.opponentPairRating ?? null,
    homeAdjustment: input.homeAdjustment,
    expectedScore: input.expected,
    actualScore: outcomeScore(input.outcome),
    competitiveDelta: input.competitiveDelta,
    provisionalMultiplier: multiplier,
    provisionalAdjustment: totalDelta - input.competitiveDelta,
    totalDelta,
  };
}

function provisionalMultiplier(state: ClashRatingState): number {
  if (!state.provisional) return 1;
  if (state.provisionalEventsPlayed <= 0) return 1.6;
  if (state.provisionalEventsPlayed === 1) return 1.3;
  if (state.provisionalEventsPlayed === 2) return 1.15;
  return 1;
}

function outcomeScore(outcome: ResultContestOutcome): 0 | 0.5 | 1 {
  if (outcome === 'W') return 1;
  if (outcome === 'T') return 0.5;
  return 0;
}

function requirePlayer(contest: ResultContest, side: 'Home' | 'Away', slot: 1 | 2) {
  const player = contest.players.find((candidate) => candidate.side === side && candidate.slot === slot);
  if (!player) throw new Error(`${contest.format} contest ${contest.id} is missing ${side} player ${slot}.`);
  return player;
}

function requireState(states: Map<string, ClashRatingState>, playerId: string) {
  const state = states.get(playerId);
  if (!state) throw new Error(`Missing Clash rating state for player ${playerId}.`);
  return state;
}
