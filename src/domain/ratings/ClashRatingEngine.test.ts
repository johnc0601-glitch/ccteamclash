import assert from 'node:assert/strict';
import test from 'node:test';
import type {ResultContest} from '@/domain/results/MatchResult';
import {
  calculateEventRatings,
  CLASH_RATING_CONFIG,
  doublesTeamRating,
  expectedScore,
  resolveStartingRating,
  type ClashRatingState,
} from '@/domain/ratings/ClashRatingEngine';

test('starting ratings ignore zero PDGA values and use division provisional defaults', () => {
  const open = resolveStartingRating({playerId: 'open', division: 'Open', pdgaRating: 0});
  const women = resolveStartingRating({playerId: 'women', division: 'Women'});

  assert.equal(open.rating, 850);
  assert.equal(open.provisional, true);
  assert.equal(open.source, 'DivisionProvisional');
  assert.equal(women.rating, 725);
  assert.equal(women.provisional, true);
});

test('new players use current PDGA first and historical PDGA when current is unavailable', () => {
  const current = resolveStartingRating({
    playerId: 'current', division: 'Open', pdgaRating: 932, historicalPdgaRating: 900,
  });
  const historical = resolveStartingRating({
    playerId: 'historical', division: 'Open', pdgaRating: 0, historicalPdgaRating: 887,
  });

  assert.equal(current.rating, 932);
  assert.equal(current.source, 'PDGA');
  assert.equal(current.provisional, false);
  assert.equal(historical.rating, 887);
  assert.equal(historical.source, 'HistoricalPDGA');
});

test('returning Clash history gains weight as the number of prior results grows', () => {
  const lightlyEstablished = resolveStartingRating({
    playerId: 'light', division: 'Open', pdgaRating: 900, priorClashRating: 940, priorRatedResults: 2,
  });
  const established = resolveStartingRating({
    playerId: 'established', division: 'Open', pdgaRating: 900, priorClashRating: 940, priorRatedResults: 10,
  });

  assert.equal(lightlyEstablished.rating, 910);
  assert.equal(established.rating, 930);
});

test('home advantage is temporary and increases expectation without changing stored rating', () => {
  const neutral = expectedScore(900, 900);
  const home = expectedScore(900 + CLASH_RATING_CONFIG.homeAdvantage, 900);

  assert.equal(neutral, 0.5);
  assert.ok(home > 0.58 && home < 0.59);
});

test('doubles team rating gives 80 percent weight to the stronger player', () => {
  assert.equal(doublesTeamRating(1000, 900), 980);
  assert.equal(doublesTeamRating(950, 950), 950);
  assert.equal(doublesTeamRating(800, 1000), 960);
});

test('an event uses one frozen rating snapshot for singles and doubles and then aggregates deltas', () => {
  const states = [
    state('home-strong', 1000), state('home-weak', 900),
    state('away-one', 950), state('away-two', 950),
  ];
  const contests = [
    singles('s1', 'home-strong', 'away-one', 'W'),
    doubles('d1', ['home-strong', 'home-weak'], ['away-one', 'away-two'], 'W'),
  ];

  const result = calculateEventRatings(contests, states);
  const strong = result.deltas.find((delta) => delta.playerId === 'home-strong');
  const weak = result.deltas.find((delta) => delta.playerId === 'home-weak');

  assert.ok(strong);
  assert.ok(weak);
  assert.equal(strong.resultsPlayed, 2);
  assert.equal(weak.resultsPlayed, 1);
  assert.equal(result.nextStates.find((entry) => entry.playerId === 'home-strong')?.rating, 1000 + strong.totalDelta);
});

test('provisional acceleration changes only the provisional player, not the established opponent', () => {
  const states = [
    state('home-provisional', 850, true, 0, 0),
    state('away-established', 850),
  ];
  const result = calculateEventRatings(
    [singles('s1', 'home-provisional', 'away-established', 'W')],
    states,
  );
  const provisional = result.deltas.find((delta) => delta.playerId === 'home-provisional');
  const established = result.deltas.find((delta) => delta.playerId === 'away-established');

  assert.ok(provisional);
  assert.ok(established);
  assert.ok(provisional.provisionalAdjustment > 0);
  assert.equal(established.provisionalAdjustment, 0);
  assert.equal(established.totalDelta, established.competitiveDelta);
  assert.ok(Math.abs(provisional.totalDelta) > Math.abs(established.totalDelta));
});

test('provisional status clears after three participated events and at least four rated results', () => {
  let provisional = state('p', 850, true, 0, 0);
  let opponent = state('o', 850);

  let event = calculateEventRatings([singles('e1', 'p', 'o', 'W')], [provisional, opponent]);
  provisional = event.nextStates.find((entry) => entry.playerId === 'p')!;
  opponent = event.nextStates.find((entry) => entry.playerId === 'o')!;
  assert.equal(provisional.provisional, true);
  assert.equal(provisional.provisionalEventsPlayed, 1);
  assert.equal(provisional.ratedResults, 1);

  event = calculateEventRatings([
    singles('e2s', 'p', 'o', 'L'),
    doubles('e2d', ['p', 'p2'], ['o', 'o2'], 'L'),
  ], [provisional, opponent, state('p2', 850), state('o2', 850)]);
  provisional = event.nextStates.find((entry) => entry.playerId === 'p')!;
  opponent = event.nextStates.find((entry) => entry.playerId === 'o')!;
  assert.equal(provisional.provisional, true);
  assert.equal(provisional.provisionalEventsPlayed, 2);
  assert.equal(provisional.ratedResults, 3);

  event = calculateEventRatings(
    [singles('e3', 'p', 'o', 'W')],
    [provisional, opponent],
  );
  provisional = event.nextStates.find((entry) => entry.playerId === 'p')!;
  assert.equal(provisional.provisionalEventsPlayed, 3);
  assert.equal(provisional.ratedResults, 4);
  assert.equal(provisional.provisional, false);
});

test('junior provisional starting rating remains blocked until calibrated', () => {
  assert.throws(
    () => resolveStartingRating({playerId: 'junior', division: 'Junior'}),
    /not been calibrated/i,
  );
});

function state(
  playerId: string,
  rating: number,
  provisional = false,
  provisionalEventsPlayed = 0,
  ratedResults = 10,
): ClashRatingState {
  return {playerId, rating, provisional, provisionalEventsPlayed, ratedResults};
}

function singles(
  id: string,
  homeId: string,
  awayId: string,
  homeOutcome: 'W' | 'L' | 'T',
): ResultContest {
  return {
    id,
    matchId: 'match',
    format: 'Singles',
    position: 1,
    homeOutcome,
    awayOutcome: opposite(homeOutcome),
    homeScore: homeOutcome === 'W' ? 1 : homeOutcome === 'L' ? 0 : 1,
    awayScore: homeOutcome === 'W' ? 0 : homeOutcome === 'L' ? 1 : 1,
    players: [
      {playerId: homeId, playerName: homeId, teamId: 'home', teamName: 'Home', side: 'Home', slot: 1},
      {playerId: awayId, playerName: awayId, teamId: 'away', teamName: 'Away', side: 'Away', slot: 1},
    ],
    createdAt: '',
    updatedAt: '',
  };
}

function doubles(
  id: string,
  homeIds: [string, string],
  awayIds: [string, string],
  homeOutcome: 'W' | 'L' | 'T',
): ResultContest {
  return {
    id,
    matchId: 'match',
    format: 'Doubles',
    position: 1,
    homeOutcome,
    awayOutcome: opposite(homeOutcome),
    homeScore: null,
    awayScore: null,
    players: [
      {playerId: homeIds[0], playerName: homeIds[0], teamId: 'home', teamName: 'Home', side: 'Home', slot: 1},
      {playerId: homeIds[1], playerName: homeIds[1], teamId: 'home', teamName: 'Home', side: 'Home', slot: 2},
      {playerId: awayIds[0], playerName: awayIds[0], teamId: 'away', teamName: 'Away', side: 'Away', slot: 1},
      {playerId: awayIds[1], playerName: awayIds[1], teamId: 'away', teamName: 'Away', side: 'Away', slot: 2},
    ],
    createdAt: '',
    updatedAt: '',
  };
}

function opposite(outcome: 'W' | 'L' | 'T'): 'W' | 'L' | 'T' {
  if (outcome === 'W') return 'L';
  if (outcome === 'L') return 'W';
  return 'T';
}
