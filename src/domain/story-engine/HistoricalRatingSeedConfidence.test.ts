import assert from 'node:assert/strict';
import test from 'node:test';
import type {RatedResult} from './RatedResult';
import {annotateHistoricalRatingSeedSources} from './HistoricalRatingSeedConfidence';

const base: RatedResult = {
  id: 'r1', contestId: 'c1', matchId: 'm1', eventId: 'e1', seasonId: 's1',
  format: 'Doubles', side: 'Home', subjectPlayerIds: ['p1', 'p2'], subjectNames: ['PDGA Player', 'Ghost Player'],
  teamId: 't1', teamName: 'Team One', opponentTeamId: 't2', opponentTeamName: 'Team Two',
  outcome: 'W', won: true, actualPoints: 1, expectedPoints: .5, winProbability: .5,
  subjectEffectiveCi: 900, opponentEffectiveCi: 900, ciDeficit: 0, ciDelta: 4,
  modelVersion: 'test-v1', playedAt: '2025-10-01T12:00:00Z',
};

test('historical seed annotation preserves PDGA vs ghost confidence without changing ratings', () => {
  const [result] = annotateHistoricalRatingSeedSources([base], [
    {season_id: 's1', player_name: 'PDGA Player', source: 'PDGA'},
    {season_id: 's1', player_name: 'Ghost Player', source: 'GHOST'},
  ]);

  assert.deepEqual(result.subjectRatingSeedSources, ['PDGA', 'GHOST']);
  assert.equal(result.subjectEffectiveCi, 900);
  assert.equal(result.winProbability, .5);
});

test('missing historical seed source remains unknown rather than being trusted', () => {
  const [result] = annotateHistoricalRatingSeedSources([
    {...base, subjectNames: ['Missing One', 'Missing Two']},
  ], []);
  assert.deepEqual(result.subjectRatingSeedSources, ['UNKNOWN', 'UNKNOWN']);
});
