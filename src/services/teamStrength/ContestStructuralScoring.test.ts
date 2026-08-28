import assert from 'node:assert/strict';
import test from 'node:test';

import type {ResultContest, ResultContestPlayer} from '@/domain/results/MatchResult';

import {
  auditContestPlayerSlots,
  exactAutomaticPointsFromFinalizedContestLayout,
} from './ContestStructuralScoring';

test('counts ordinary singles and doubles player slots by side', () => {
  const contests = [
    singles('s-1'),
    singles('s-2'),
    doubles('d-1'),
  ];

  const audit = auditContestPlayerSlots(contests);
  assert.ok(audit);
  assert.deepEqual(audit.home, {
    singlesPlayerSlotsFilled: 2,
    doublesPlayerSlotsFilled: 2,
  });
  assert.deepEqual(audit.away, {
    singlesPlayerSlotsFilled: 2,
    doublesPlayerSlotsFilled: 2,
  });
  assert.equal(audit.homeSinglesSlotsRemaining, 16);
  assert.equal(audit.homeDoublesSlotsRemaining, 16);
});

test('does not turn an unfinished draft layout into automatic points', () => {
  const partial = [singles('s-1'), doubles('d-1')];
  assert.equal(
    exactAutomaticPointsFromFinalizedContestLayout(partial, false),
    undefined,
  );
});

test('a finalized full standard layout produces no automatic points', () => {
  const contests = fullStandardLayout();

  const result = exactAutomaticPointsFromFinalizedContestLayout(contests, true);
  assert.deepEqual(result, {
    home: {automaticPoints: 0},
    away: {automaticPoints: 0},
  });
});

test('a finalized missing away singles slot awards one automatic point to home', () => {
  const contests = fullStandardLayout();
  const firstSingles = contests.find((contest) => contest.format === 'Singles');
  assert.ok(firstSingles);
  firstSingles.players = firstSingles.players.filter((player) => player.side !== 'Away');

  const result = exactAutomaticPointsFromFinalizedContestLayout(contests, true);
  assert.deepEqual(result, {
    home: {automaticPoints: 1},
    away: {automaticPoints: 0},
  });
});

test('missing one away singles and one away doubles player-slot awards two automatic points', () => {
  const contests = fullStandardLayout();
  const firstSingles = contests.find((contest) => contest.format === 'Singles');
  const firstDoubles = contests.find((contest) => contest.format === 'Doubles');
  assert.ok(firstSingles && firstDoubles);
  firstSingles.players = firstSingles.players.filter((player) => player.side !== 'Away');
  const awayDoubles = firstDoubles.players.filter((player) => player.side === 'Away');
  firstDoubles.players = firstDoubles.players.filter(
    (player) => player !== awayDoubles[0],
  );

  const result = exactAutomaticPointsFromFinalizedContestLayout(contests, true);
  assert.deepEqual(result, {
    home: {automaticPoints: 2},
    away: {automaticPoints: 0},
  });
});

function fullStandardLayout(): ResultContest[] {
  return [
    ...Array.from({length: 18}, (_, index) => singles(`s-${index + 1}`)),
    ...Array.from({length: 9}, (_, index) => doubles(`d-${index + 1}`)),
  ];
}

function singles(id: string): ResultContest {
  return contest(id, 'Singles', [
    player(`${id}-home`, 'Home', 1),
    player(`${id}-away`, 'Away', 1),
  ]);
}

function doubles(id: string): ResultContest {
  return contest(id, 'Doubles', [
    player(`${id}-home-1`, 'Home', 1),
    player(`${id}-home-2`, 'Home', 2),
    player(`${id}-away-1`, 'Away', 1),
    player(`${id}-away-2`, 'Away', 2),
  ]);
}

function contest(
  id: string,
  format: ResultContest['format'],
  players: ResultContestPlayer[],
): ResultContest {
  return {
    id,
    matchId: 'match',
    format,
    position: 1,
    homeOutcome: 'T',
    awayOutcome: 'T',
    homeScore: format === 'Singles' ? 50 : null,
    awayScore: format === 'Singles' ? 50 : null,
    players,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  };
}

function player(
  playerId: string,
  side: ResultContestPlayer['side'],
  slot: ResultContestPlayer['slot'],
): ResultContestPlayer {
  return {
    playerId,
    playerName: playerId,
    teamId: side === 'Home' ? 'home' : 'away',
    teamName: side === 'Home' ? 'Home' : 'Away',
    side,
    slot,
  };
}
