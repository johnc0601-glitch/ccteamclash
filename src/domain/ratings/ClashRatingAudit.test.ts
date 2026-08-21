import assert from 'node:assert/strict';
import test from 'node:test';
import type {ResultContest} from '@/domain/results/MatchResult';
import {buildClashContestLedger} from '@/domain/ratings/ClashRatingAudit';
import {calculateEventRatings, type ClashRatingState} from '@/domain/ratings/ClashRatingEngine';

test('contest ledger totals exactly match event rating totals', () => {
  const states = [
    state('home-strong', 1000),
    state('home-weak', 900, true, 1, 2),
    state('away-one', 950),
    state('away-two', 920),
  ];
  const contests = [
    singles('s1', 'home-strong', 'away-one', 'W'),
    doubles('d1', ['home-strong', 'home-weak'], ['away-one', 'away-two'], 'L'),
  ];

  const ledger = buildClashContestLedger(contests, states);
  const event = calculateEventRatings(contests, states);
  const totals = new Map<string, number>();
  for (const row of ledger) totals.set(row.playerId, (totals.get(row.playerId) ?? 0) + row.totalDelta);

  for (const delta of event.deltas) {
    assert.equal(totals.get(delta.playerId), delta.totalDelta, delta.playerId);
  }
});

test('ledger records home adjustment only on home side and doubles pair ratings', () => {
  const states = [state('h1', 1000), state('h2', 900), state('a1', 950), state('a2', 925)];
  const rows = buildClashContestLedger([doubles('d1', ['h1', 'h2'], ['a1', 'a2'], 'W')], states);
  const home = rows.find((row) => row.playerId === 'h1')!;
  const away = rows.find((row) => row.playerId === 'a1')!;

  assert.equal(home.homeAdjustment, 15);
  assert.equal(away.homeAdjustment, 0);
  assert.equal(home.ownPairRating, 980);
  assert.equal(home.opponentPairRating, 945);
  assert.equal(home.partnerPlayerId, 'h2');
  assert.equal(home.opponentTwoPlayerId, 'a2');
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
    matchId: 'match-1',
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
    matchId: 'match-2',
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

function opposite(outcome: 'W' | 'L' | 'T') {
  if (outcome === 'W') return 'L' as const;
  if (outcome === 'L') return 'W' as const;
  return 'T' as const;
}
