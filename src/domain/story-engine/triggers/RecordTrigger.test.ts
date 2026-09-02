import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectRecords} from './RecordTrigger';

function row(
  playerId: string,
  playerName: string,
  eventId: string,
  before: number,
  after: number,
  index: number,
): RatedResult {
  const delta = after - before;
  return {
    id: `${eventId}:${playerId}:${index}`, contestId: `${eventId}:c${index}`, matchId: `${eventId}:m${index}`,
    eventId, seasonId: '2026-27', format: 'Singles', side: 'Home',
    subjectPlayerIds: [playerId], subjectNames: [playerName], subjectCiBefore: [before], subjectCiAfter: [after], subjectCiDeltas: [delta],
    teamId: `team-${playerId}`, teamName: `Team ${playerId}`, opponentTeamId: 'opponent', opponentTeamName: 'Opponent',
    outcome: delta >= 0 ? 'W' : 'L', won: delta >= 0, actualPoints: delta >= 0 ? 1 : 0,
    expectedPoints: .5, winProbability: .5, subjectEffectiveCi: before, opponentEffectiveCi: 950,
    ciDeficit: 950 - before, ciDelta: delta, modelVersion: 'test',
    playedAt: eventId === 'round-1' ? '2026-10-01T12:00:00Z' : '2026-11-01T12:00:00Z',
  };
}

const openingField = [
  row('p1', 'One', 'round-1', 980, 985, 1),
  row('p2', 'Two', 'round-1', 970, 974, 2),
  row('p3', 'Three', 'round-1', 960, 963, 3),
  row('p4', 'Four', 'round-1', 950, 952, 4),
  row('p5', 'Five', 'round-1', 940, 942, 5),
];

describe('detectRecords', () => {
  it('detects an end-of-round CI above the verified prior league high', () => {
    const candidates = detectRecords([
      ...openingField,
      row('p1', 'One', 'round-2', 985, 992, 6),
    ]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].triggerType, 'RECORD');
    assert.equal(candidates[0].eventId, 'round-2');
    assert.equal(candidates[0].headlineFacts.recordType, 'ALL_TIME_CI_HIGH');
    assert.equal(candidates[0].headlineFacts.previousRecordCi, 985);
    assert.equal(candidates[0].headlineFacts.newRecordCi, 992);
    assert.equal(candidates[0].headlineFacts.recordImprovement, 7);
  });

  it('does not declare records from the first observed round', () => {
    assert.deepEqual(detectRecords(openingField), []);
  });

  it('uses the highest end-of-round CI when more than one player clears the old record', () => {
    const candidates = detectRecords([
      ...openingField,
      row('p1', 'One', 'round-2', 985, 991, 6),
      row('p2', 'Two', 'round-2', 974, 994, 7),
    ]);
    assert.equal(candidates.length, 1);
    assert.deepEqual(candidates[0].playerIds, ['p2']);
    assert.equal(candidates[0].headlineFacts.newRecordCi, 994);
  });

  it('requires a meaningful comparison field before making a league-wide claim', () => {
    assert.deepEqual(detectRecords([
      row('p1', 'One', 'round-1', 980, 985, 1),
      row('p1', 'One', 'round-2', 985, 992, 2),
    ]), []);
  });
});
