import assert from 'node:assert/strict';
import test from 'node:test';
import type {MatchResult, ResultContest} from '@/domain/results/MatchResult';
import {assessClashFinalization, finalizeClashEvent} from '@/domain/ratings/ClashRatingFinalizationService';
import type {ClashRatingState} from '@/domain/ratings/ClashRatingEngine';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';

test('finalization blocks until every eligible match is published', () => {
  const round = makeRound();
  const matches = [makeMatch('m1'), makeMatch('m2')];
  const results = [makeResult('m1', 'Published')];
  const contests = new Map<string, ResultContest[]>([['m1', [singles('c1', 'm1', 'p1', 'p2')]]]);

  const readiness = assessClashFinalization(round, matches, results, contests);
  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.missingResultMatchIds, ['m2']);
});

test('finalization blocks published team results that have no player contests', () => {
  const round = makeRound();
  const matches = [makeMatch('m1')];
  const results = [makeResult('m1', 'Published')];

  const readiness = assessClashFinalization(round, matches, results, new Map());
  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.missingContestMatchIds, ['m1']);
});

test('cancelled and postponed matches do not block event finalization', () => {
  const round = makeRound();
  const matches = [
    makeMatch('m1'),
    makeMatch('m2', 'Cancelled'),
    makeMatch('m3', 'Postponed'),
  ];
  const results = [makeResult('m1', 'Published')];
  const contests = new Map<string, ResultContest[]>([['m1', [singles('c1', 'm1', 'p1', 'p2')]]]);

  const readiness = assessClashFinalization(round, matches, results, contests);
  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.eligibleMatchIds, ['m1']);
});

test('finalization calculates all contests from one frozen event-start snapshot', () => {
  const round = makeRound();
  const matches = [makeMatch('m1'), makeMatch('m2')];
  const results = [makeResult('m1', 'Published'), makeResult('m2', 'Published')];
  const contests = new Map<string, ResultContest[]>([
    ['m1', [singles('c1', 'm1', 'p1', 'p2')]],
    ['m2', [singles('c2', 'm2', 'p1', 'p3')]],
  ]);
  const states: ClashRatingState[] = [state('p1', 900), state('p2', 900), state('p3', 900)];

  const event = finalizeClashEvent({round, matches, results, contestsByMatch: contests, states});
  const p1 = event.result.deltas.find((delta) => delta.playerId === 'p1');

  assert.equal(event.eventKey, round.id);
  assert.equal(event.contests.length, 2);
  assert.ok(p1);
  assert.equal(p1.resultsPlayed, 2);
  assert.equal(event.result.nextStates.find((entry) => entry.playerId === 'p1')?.rating, 900 + p1.totalDelta);
});

test('finalization fails if a contest player has no rating state', () => {
  const round = makeRound();
  const matches = [makeMatch('m1')];
  const results = [makeResult('m1', 'Published')];
  const contests = new Map<string, ResultContest[]>([['m1', [singles('c1', 'm1', 'p1', 'missing')]]]);

  assert.throws(
    () => finalizeClashEvent({round, matches, results, contestsByMatch: contests, states: [state('p1', 900)]}),
    /Missing Clash rating state/i,
  );
});

function makeRound(): Round {
  return {
    id: 'round-1',
    scheduleId: 'schedule-1',
    seasonId: 'season-1',
    number: 1,
    name: 'October',
    date: '2026-10-03',
    published: true,
    createdAt: '',
    updatedAt: '',
  };
}

function makeMatch(id: string, status: Match['status'] = 'Completed'): Match {
  return {
    id,
    roundId: 'round-1',
    seasonId: 'season-1',
    homeTeamId: 'home',
    awayTeamId: 'away',
    courseId: null,
    date: '2026-10-03',
    time: null,
    status,
    notes: '',
    createdAt: '',
    updatedAt: '',
  };
}

function makeResult(matchId: string, status: MatchResult['status']): MatchResult {
  return {
    matchId,
    homeScore: 1,
    awayScore: 0,
    status,
    publishedAt: status === 'Published' ? '2026-10-03T20:00:00Z' : null,
    reopenedAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

function singles(id: string, matchId: string, homeId: string, awayId: string): ResultContest {
  return {
    id,
    matchId,
    format: 'Singles',
    position: 1,
    homeOutcome: 'W',
    awayOutcome: 'L',
    homeScore: 1,
    awayScore: 0,
    players: [
      {playerId: homeId, playerName: homeId, teamId: 'home', teamName: 'Home', side: 'Home', slot: 1},
      {playerId: awayId, playerName: awayId, teamId: 'away', teamName: 'Away', side: 'Away', slot: 1},
    ],
    createdAt: '',
    updatedAt: '',
  };
}

function state(playerId: string, rating: number): ClashRatingState {
  return {playerId, rating, provisional: false, provisionalEventsPlayed: 0, ratedResults: 10};
}
