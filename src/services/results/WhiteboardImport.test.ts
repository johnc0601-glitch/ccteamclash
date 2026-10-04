import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeWhiteboardImport} from '@/services/results/WhiteboardImport';

const roster = [
  {id: 'home-a', name: 'Home A', teamId: 'home'},
  {id: 'home-b', name: 'Home B', teamId: 'home'},
  {id: 'away-a', name: 'Away A', teamId: 'away'},
  {id: 'away-b', name: 'Away B', teamId: 'away'},
];

test('whiteboard import preserves valid roster ids and creates result slots', () => {
  const result = normalizeWhiteboardImport({
    homeScore: 3,
    awayScore: 1,
    scoreSource: 'Visible',
    contests: [{
      format: 'Doubles',
      position: 1,
      homePlayerIds: ['home-a', 'home-b'],
      awayPlayerIds: ['away-a', 'away-b'],
      homeOutcome: 'W',
      confidence: 0.98,
      note: '',
    }],
    warnings: [],
  }, {
    matchId: 'match-1',
    homeTeamId: 'home',
    awayTeamId: 'away',
    roster,
    model: 'test-model',
  });

  assert.equal(result.homeScore, 3);
  assert.equal(result.awayScore, 1);
  assert.equal(result.reviewCount, 0);
  assert.equal(result.contests[0].players.length, 4);
  assert.equal(result.contests[0].homeOutcome, 'W');
  assert.equal(result.contests[0].awayOutcome, 'L');
});

test('whiteboard import blanks an invalid roster id and requires review', () => {
  const result = normalizeWhiteboardImport({
    contests: [{
      format: 'Singles',
      position: 1,
      homePlayerIds: ['not-on-roster'],
      awayPlayerIds: ['away-a'],
      homeOutcome: 'L',
      confidence: 0.9,
      note: 'handwriting unclear',
    }],
  }, {
    matchId: 'match-2',
    homeTeamId: 'home',
    awayTeamId: 'away',
    roster,
    model: 'test-model',
  });

  assert.equal(result.reviewCount, 1);
  assert.equal(result.contests[0].players[0].playerId, '');
  assert.match(result.contests[0].reviewReasons.join(' '), /not on that locked roster/i);
});

test('whiteboard import flags a player duplicated within the same round format', () => {
  const result = normalizeWhiteboardImport({
    contests: [
      {
        format: 'Singles',
        position: 1,
        homePlayerIds: ['home-a'],
        awayPlayerIds: ['away-a'],
        homeOutcome: 'W',
        confidence: 0.99,
      },
      {
        format: 'Singles',
        position: 2,
        homePlayerIds: ['home-a'],
        awayPlayerIds: ['away-b'],
        homeOutcome: 'L',
        confidence: 0.99,
      },
    ],
  }, {
    matchId: 'match-3',
    homeTeamId: 'home',
    awayTeamId: 'away',
    roster,
    model: 'test-model',
  });

  assert.equal(result.reviewCount, 2);
  assert.ok(result.contests.every((contest) =>
    contest.reviewReasons.some((reason) => /more than one singles/i.test(reason)),
  ));
});
