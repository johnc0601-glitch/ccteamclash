import {describe, expect, it} from 'vitest';
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
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      triggerType: 'RECORD',
      eventId: 'round-2',
      headlineFacts: {recordType: 'ALL_TIME_CI_HIGH', previousRecordCi: 985, newRecordCi: 992, recordImprovement: 7},
    });
  });

  it('does not declare records from the first observed round', () => {
    expect(detectRecords(openingField)).toEqual([]);
  });

  it('uses the highest end-of-round CI when more than one player clears the old record', () => {
    const candidates = detectRecords([
      ...openingField,
      row('p1', 'One', 'round-2', 985, 991, 6),
      row('p2', 'Two', 'round-2', 974, 994, 7),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].playerIds).toEqual(['p2']);
    expect(candidates[0].headlineFacts.newRecordCi).toBe(994);
  });

  it('requires a meaningful comparison field before making a league-wide claim', () => {
    expect(detectRecords([
      row('p1', 'One', 'round-1', 980, 985, 1),
      row('p1', 'One', 'round-2', 985, 992, 2),
    ])).toEqual([]);
  });
});
