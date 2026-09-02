import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from './RatedResult';
import {buildClashPulseProvenance} from './ClashPulseSnapshotStore';

describe('Clash Pulse snapshot provenance', () => {
  it('records stable source identities, versions, and time bounds', () => {
    const rows = [
      {id: 'r2', contestId: 'c1', eventId: 'e2', modelVersion: 'v2', playedAt: '2026-02-02T00:00:00Z'},
      {id: 'r1', contestId: 'c1', eventId: 'e1', modelVersion: 'v1', playedAt: '2026-01-01T00:00:00Z'},
    ] as RatedResult[];
    const value = buildClashPulseProvenance(rows, {
      sourceFactRows: 2, sourceContests: 1, emittedContests: 1, quarantinedContests: 0,
    });
    assert.deepEqual(value.sourceResultIds, ['r1', 'r2']);
    assert.deepEqual(value.sourceContestIds, ['c1']);
    assert.deepEqual(value.sourceAlgorithmVersions, ['v1', 'v2']);
    assert.deepEqual(value.sourcePlayedAt, {earliest: '2026-01-01T00:00:00Z', latest: '2026-02-02T00:00:00Z'});
    assert.equal(value.snapshotVersion, 1);
  });
});
