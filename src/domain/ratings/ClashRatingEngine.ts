import type {ResultContest} from '@/domain/results/MatchResult';

export const CLASH_RATING_CONFIG = {
  expectationDivisor: 100,
  upsetExponent: 1.8,
  minMovement: 2,
  maxMovement: 28,
  homeAdvantage: 15,
  doublesStrongPlayerWeight: 0.8,
  doublesWeakPlayerWeight: 0.2,
  openProvisionalStart: 850,
  womenProvisionalStart: 725,
} as const;

export type ClashDivision = 'Open' | 'Women' | 'Junior';

export type ClashRatingState = {
  playerId: string;
  rating: number;
  provisional: boolean;
  provisionalEventsPlayed: number;
  ratedResults: number;
};

export type StartingRatingInput = {
  playerId: string;
  division: ClashDivision;
  pdgaRating?: number | null;
  historicalPdgaRating?: number | null;
  priorClashRating?: number | null;
  priorRatedResults?: number;
};

export type StartingRating = ClashRatingState & {
  source: 'ReturningBlend' | 'PDGA' | 'HistoricalPDGA' | 'DivisionProvisional';
};

export type PlayerRatingDelta = {
  playerId: string;
  competitiveDelta: number;
  provisionalAdjustment: number;
  totalDelta: number;
  resultsPlayed: number;
};

export type EventRatingResult = {
  deltas: PlayerRatingDelta[];
  nextStates: ClashRatingState[];
};

export function resolveStartingRating(input: StartingRatingInput): StartingRating {
  const pdga = positiveRating(input.pdgaRating);
  const historicalPdga = positiveRating(input.historicalPdgaRating);
  const priorClash = positiveRating(input.priorClashRating);
  const priorRatedResults = Math.max(0, input.priorRatedResults ?? 0);

  if (priorClash !== null && pdga !== null) {
    const clashWeight = priorClashWeight(priorRatedResults);
    return establishedStart(
      input.playerId,
      Math.round((pdga * (1 - clashWeight)) + (priorClash * clashWeight)),
      'ReturningBlend',
      priorRatedResults,
    );
  }

  if (priorClash !== null) {
    return establishedStart(input.playerId, priorClash, 'ReturningBlend', priorRatedResults);
  }

  if (pdga !== null) {
    return establishedStart(input.playerId, pdga, 'PDGA', priorRatedResults);
  }

  if (historicalPdga !== null) {
    return establishedStart(input.playerId, historicalPdga, 'HistoricalPDGA', priorRatedResults);
  }

  return {
    playerId: input.playerId,
    rating: provisionalStartForDivision(input.division),
    provisional: true,
    provisionalEventsPlayed: 0,
    ratedResults: 0,
    source: 'DivisionProvisional',
  };
}

export function calculateEventRatings(
  contests: ResultContest[],
  states: ClashRatingState[],
): EventRatingResult {
  const stateByPlayer = new Map(states.map((state) => [state.playerId, state]));
  const aggregate = new Map<string, PlayerRatingDelta>();

  for (const contest of contests) {
    const contestDeltas = contest.format === 'Singles'
      ? calculateSinglesContest(contest, stateByPlayer)
      : calculateDoublesContest(contest, stateByPlayer);

    for (const delta of contestDeltas) {
      const current = aggregate.get(delta.playerId) ?? {
        playerId: delta.playerId,
        competitiveDelta: 0,
        provisionalAdjustment: 0,
        totalDelta: 0,
        resultsPlayed: 0,
      };
      current.competitiveDelta += delta.competitiveDelta;
      current.provisionalAdjustment += delta.provisionalAdjustment;
      current.totalDelta += delta.totalDelta;
      current.resultsPlayed += 1;
      aggregate.set(delta.playerId, current);
    }
  }

  const deltas = [...aggregate.values()].map((delta) => ({
    ...delta,
    competitiveDelta: Math.round(delta.competitiveDelta),
    provisionalAdjustment: Math.round(delta.provisionalAdjustment),
    totalDelta: Math.round(delta.totalDelta),
  }));

  const deltaByPlayer = new Map(deltas.map((delta) => [delta.playerId, delta]));
  const nextStates = states.map((state) => {
    const delta = deltaByPlayer.get(state.playerId);
    if (!delta) return {...state};

    const ratedResults = state.ratedResults + delta.resultsPlayed;
    const provisionalEventsPlayed = state.provisional
      ? state.provisionalEventsPlayed + 1
      : state.provisionalEventsPlayed;
    const provisional = state.provisional && !(
      provisionalEventsPlayed >= 3 && ratedResults >= 4
    );

    return {
      ...state,
      rating: state.rating + delta.totalDelta,
      provisional,
      provisionalEventsPlayed,
      ratedResults,
    };
  });

  return {deltas, nextStates};
}

export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + (10 ** ((opponentRating - playerRating) / CLASH_RATING_CONFIG.expectationDivisor)));
}

export function doublesTeamRating(playerOne: number, playerTwo: number): number {
  const strong = Math.max(playerOne, playerTwo);
  const weak = Math.min(playerOne, playerTwo);
  return (strong * CLASH_RATING_CONFIG.doublesStrongPlayerWeight)
    + (weak * CLASH_RATING_CONFIG.doublesWeakPlayerWeight);
}

export function baseRatingMovement(actual: 0 | 0.5 | 1, expected: number): number {
  const error = actual - expected;
  if (Math.abs(error) < Number.EPSILON) return 0;
  const magnitude = CLASH_RATING_CONFIG.minMovement
    + ((CLASH_RATING_CONFIG.maxMovement - CLASH_RATING_CONFIG.minMovement)
      * (Math.abs(error) ** CLASH_RATING_CONFIG.upsetExponent));
  return Math.round(Math.sign(error) * magnitude);
}

function calculateSinglesContest(
  contest: ResultContest,
  stateByPlayer: Map<string, ClashRatingState>,
): PlayerRatingDelta[] {
  const home = contest.players.find((player) => player.side === 'Home');
  const away = contest.players.find((player) => player.side === 'Away');
  if (!home || !away) throw new Error(`Singles contest ${contest.id} is missing a side.`);

  const homeState = requireState(stateByPlayer, home.playerId);
  const awayState = requireState(stateByPlayer, away.playerId);
  const homeExpected = expectedScore(
    homeState.rating + CLASH_RATING_CONFIG.homeAdvantage,
    awayState.rating,
  );
  const homeActual = outcomeScore(contest.homeOutcome);
  const homeBase = baseRatingMovement(homeActual, homeExpected);
  const awayBase = -homeBase;

  return [
    playerDelta(homeState, homeBase),
    playerDelta(awayState, awayBase),
  ];
}

function calculateDoublesContest(
  contest: ResultContest,
  stateByPlayer: Map<string, ClashRatingState>,
): PlayerRatingDelta[] {
  const homePlayers = contest.players.filter((player) => player.side === 'Home');
  const awayPlayers = contest.players.filter((player) => player.side === 'Away');
  if (homePlayers.length !== 2 || awayPlayers.length !== 2) {
    throw new Error(`Doubles contest ${contest.id} must have two players per side.`);
  }

  const homeStates = homePlayers.map((player) => requireState(stateByPlayer, player.playerId));
  const awayStates = awayPlayers.map((player) => requireState(stateByPlayer, player.playerId));
  const homeTeam = doublesTeamRating(homeStates[0].rating, homeStates[1].rating)
    + CLASH_RATING_CONFIG.homeAdvantage;
  const awayTeam = doublesTeamRating(awayStates[0].rating, awayStates[1].rating);
  const homeExpected = expectedScore(homeTeam, awayTeam);
  const homeActual = outcomeScore(contest.homeOutcome);
  const teamBase = baseRatingMovement(homeActual, homeExpected);
  const individualHomeBase = Math.round(teamBase / 2);
  const individualAwayBase = -individualHomeBase;

  return [
    ...homeStates.map((state) => playerDelta(state, individualHomeBase)),
    ...awayStates.map((state) => playerDelta(state, individualAwayBase)),
  ];
}

function playerDelta(state: ClashRatingState, competitiveDelta: number): PlayerRatingDelta {
  const multiplier = provisionalMultiplier(state);
  const adjusted = state.provisional
    ? Math.round(competitiveDelta * multiplier)
    : competitiveDelta;
  return {
    playerId: state.playerId,
    competitiveDelta,
    provisionalAdjustment: adjusted - competitiveDelta,
    totalDelta: adjusted,
    resultsPlayed: 1,
  };
}

function provisionalMultiplier(state: ClashRatingState): number {
  if (!state.provisional) return 1;
  if (state.provisionalEventsPlayed <= 0) return 1.6;
  if (state.provisionalEventsPlayed === 1) return 1.3;
  if (state.provisionalEventsPlayed === 2) return 1.15;
  return 1;
}

function priorClashWeight(priorRatedResults: number): number {
  return priorRatedResults <= 5 ? 0.5 : 0.6;
}

function provisionalStartForDivision(division: ClashDivision): number {
  if (division === 'Women') return CLASH_RATING_CONFIG.womenProvisionalStart;
  if (division === 'Open') return CLASH_RATING_CONFIG.openProvisionalStart;
  throw new Error('Junior provisional rating has not been calibrated yet.');
}

function establishedStart(
  playerId: string,
  rating: number,
  source: StartingRating['source'],
  ratedResults: number,
): StartingRating {
  return {
    playerId,
    rating,
    provisional: false,
    provisionalEventsPlayed: 0,
    ratedResults,
    source,
  };
}

function positiveRating(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function outcomeScore(outcome: ResultContest['homeOutcome']): 0 | 0.5 | 1 {
  if (outcome === 'W') return 1;
  if (outcome === 'T') return 0.5;
  return 0;
}

function requireState(
  stateByPlayer: Map<string, ClashRatingState>,
  playerId: string,
): ClashRatingState {
  const state = stateByPlayer.get(playerId);
  if (!state) throw new Error(`Missing Clash rating state for player ${playerId}.`);
  return state;
}
