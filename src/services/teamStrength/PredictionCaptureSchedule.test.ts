import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureAtForSource,
  currentPredictionCaptureSource,
  predictionCaptureCheckpoints,
} from './PredictionCaptureSchedule';

test('uses the existing Eastern attendance and roster locks as fixed prediction checkpoints', () => {
  const checkpoints = predictionCaptureCheckpoints('2026-10-03');

  assert.equal(checkpoints.length, 3);
  assert.deepEqual(checkpoints.map((checkpoint) => checkpoint.source), [
    'activeRoster',
    'confirmedAvailableRoster',
    'matchLineup',
  ]);
  // Oct. 2, 2026 is still EDT (UTC-4).
  assert.equal(checkpoints[0].captureAt.toISOString(), '2026-10-02T04:00:00.000Z');
  assert.equal(checkpoints[1].captureAt.toISOString(), '2026-10-02T16:00:00.000Z');
  assert.equal(checkpoints[2].captureAt.toISOString(), '2026-10-02T19:00:00.000Z');
});

test('only exposes the stage whose point-in-time inputs are still valid', () => {
  const matchDate = '2026-10-03';

  assert.equal(
    currentPredictionCaptureSource(matchDate, new Date('2026-10-02T03:59:59.000Z')),
    undefined,
  );
  assert.equal(
    currentPredictionCaptureSource(matchDate, new Date('2026-10-02T04:00:00.000Z')),
    'activeRoster',
  );
  assert.equal(
    currentPredictionCaptureSource(matchDate, new Date('2026-10-02T16:00:00.000Z')),
    'confirmedAvailableRoster',
  );
  assert.equal(
    currentPredictionCaptureSource(matchDate, new Date('2026-10-02T19:00:00.000Z')),
    'matchLineup',
  );
});

test('does not backfill a missed early stage with later information', () => {
  const matchDate = '2026-10-03';

  assert.equal(
    currentPredictionCaptureSource(matchDate, new Date('2026-10-02T18:00:00.000Z')),
    'confirmedAvailableRoster',
  );
  assert.notEqual(
    currentPredictionCaptureSource(matchDate, new Date('2026-10-02T18:00:00.000Z')),
    'activeRoster',
  );
});

test('returns the exact checkpoint for audit metadata', () => {
  assert.equal(
    captureAtForSource('2026-10-03', 'confirmedAvailableRoster')?.toISOString(),
    '2026-10-02T16:00:00.000Z',
  );
  assert.equal(captureAtForSource('bad-date', 'activeRoster'), undefined);
});
