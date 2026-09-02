import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAroundFacts,
  type CanonicalAroundRow,
} from './AroundTheClashService';
import {normalizeFactIds} from './AroundTheClashRecapService';

function row(overrides: Partial<CanonicalAroundRow> & Pick<CanonicalAroundRow, 'id' | 'playerId' | 'playerName' | 'teamId' | 'side'>): CanonicalAroundRow {
  return {
    source: 'historical',
    seasonId: 'coastal-clash-2024-2025',
    eventKey: 'historical:coastal-clash-2024-2025:1',
    eventOrder: 1,
    eventLabel: 'October',
    matchId: 'team-match:1',
    contestId: 'contest:1',
    venue: 'Home',
    format: 'Singles',
    outcome: 'W',
    ratingBefore: 900,
    opponentEffectiveCi: 850,
    expectedScore: 0.6,
    actualScore: 1,
    totalDelta: 5,
    calculatedAt: '2026-08-26T21:47:42.000Z',
    ...overrides,
  };
}

test('reconstructs doubles effective CI from opposite stored rows without rerunning pair weighting', () => {
  const facts = buildAroundFacts([
    row({id: 'historical:contest:1:alex', playerId: 'alex', playerName: 'Alex', teamId: 'dark-knights', side: 'Away', format: 'Doubles', ratingBefore: 900, opponentEffectiveCi: 853.8}),
    row({id: 'historical:contest:1:chuck', playerId: 'chuck', playerName: 'Chuck', teamId: 'dark-knights', side: 'Away', format: 'Doubles', ratingBefore: 929, opponentEffectiveCi: 853.8}),
    row({id: 'historical:contest:1:jason', playerId: 'jason', playerName: 'Jason', teamId: 'wild-turkey', side: 'Home', format: 'Doubles', outcome: 'L', ratingBefore: 861, opponentEffectiveCi: 923.2, expectedScore: 0.4, actualScore: 0, totalDelta: -5}),
    row({id: 'historical:contest:1:mike', playerId: 'mike', playerName: 'Mike', teamId: 'wild-turkey', side: 'Home', format: 'Doubles', outcome: 'L', ratingBefore: 825, opponentEffectiveCi: 923.2, expectedScore: 0.4, actualScore: 0, totalDelta: -5}),
  ]);

  assert.equal(facts.length, 4);
  const alex = facts.find((fact) => fact.playerId === 'alex');
  assert.ok(alex);
  assert.equal(alex.partnerName, 'Chuck');
  assert.deepEqual([alex.opponentOneName, alex.opponentTwoName], ['Jason', 'Mike']);
  assert.equal(alex.ownPairRating, 923.2);
  assert.equal(alex.opponentPairRating, 853.8);
  assert.equal(alex.homeAdjustment, 0);
});

test('derives the stored singles home effect from the opposing immutable fact', () => {
  const facts = buildAroundFacts([
    row({id: 'historical:singles:away', contestId: 'singles:1', playerId: 'away', playerName: 'Away Player', teamId: 'away-team', side: 'Away', outcome: 'L', ratingBefore: 850, opponentEffectiveCi: 915, expectedScore: 0.25, actualScore: 0, totalDelta: -5}),
    row({id: 'historical:singles:home', contestId: 'singles:1', playerId: 'home', playerName: 'Home Player', teamId: 'home-team', side: 'Home', ratingBefore: 900, opponentEffectiveCi: 850, expectedScore: 0.75, actualScore: 1, totalDelta: 5}),
  ]);

  const home = facts.find((fact) => fact.playerId === 'home');
  const away = facts.find((fact) => fact.playerId === 'away');
  assert.ok(home && away);
  assert.equal(home.homeAdjustment, 15);
  assert.equal(away.homeAdjustment, 0);
  assert.equal(home.opponentOneRating, 850);
});

test('quarantines malformed contests instead of surfacing partial story facts', () => {
  const facts = buildAroundFacts([
    row({id: 'bad:a', playerId: 'a', playerName: 'A', teamId: 'team-a', side: 'Away', format: 'Doubles'}),
    row({id: 'bad:b', playerId: 'b', playerName: 'B', teamId: 'team-a', side: 'Away', format: 'Doubles'}),
    row({id: 'bad:c', playerId: 'c', playerName: 'C', teamId: 'team-b', side: 'Home', format: 'Doubles'}),
    row({id: 'bad:d', playerId: 'd', playerName: 'D', teamId: 'team-c', side: 'Home', format: 'Doubles'}),
  ]);

  assert.deepEqual(facts, []);
});

test('recap fact ids accept opaque canonical ids but reject whitespace and oversized values', () => {
  assert.deepEqual(
    normalizeFactIds(['historical:contest:1:alex', 'current:contest:2:bob', 'historical:contest:1:alex', 'bad id', '', null]),
    ['historical:contest:1:alex', 'current:contest:2:bob'],
  );
  assert.deepEqual(normalizeFactIds(['x'.repeat(501)]), []);
});
