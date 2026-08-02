import assert from 'node:assert/strict';
import test from 'node:test';
import {isCronRequestAuthorized, runSnapshotCron} from './cron';

test('rejects missing, malformed, and incorrect cron authorization', () => {
  assert.equal(isCronRequestAuthorized(null, 'secret'), false);
  assert.equal(isCronRequestAuthorized('secret', 'secret'), false);
  assert.equal(isCronRequestAuthorized('Bearer wrong', 'secret'), false);
  assert.equal(isCronRequestAuthorized('Bearer secret', undefined), false);
});

test('accepts only the configured bearer secret', () => {
  assert.equal(isCronRequestAuthorized('Bearer secret', 'secret'), true);
});

test('returns only the concise processing counts', async () => {
  const summary = {processed: 4, succeeded: 1, alreadyComplete: 2, failed: 1};
  const previous = process.env.MATCH_ROSTER_SNAPSHOT_START_AT;
  process.env.MATCH_ROSTER_SNAPSHOT_START_AT = '2026-08-15T00:00:00-04:00';
  try {
    assert.deepEqual(await runSnapshotCron({processLockedSnapshots: async () => summary}), summary);
  } finally {
    restoreCutoff(previous);
  }
});

test('passes no cutoff to processing when configuration is missing or invalid', async () => {
  const previous = process.env.MATCH_ROSTER_SNAPSHOT_START_AT;
  try {
    for (const value of [undefined, 'invalid']) {
      if (value === undefined) delete process.env.MATCH_ROSTER_SNAPSHOT_START_AT;
      else process.env.MATCH_ROSTER_SNAPSHOT_START_AT = value;
      let received: Date | undefined = new Date(0);
      await runSnapshotCron({
        processLockedSnapshots: async (snapshotStartAt) => {
          received = snapshotStartAt;
          return {processed: 0, succeeded: 0, alreadyComplete: 0, failed: 0};
        },
      });
      assert.equal(received, undefined);
    }
  } finally {
    restoreCutoff(previous);
  }
});

function restoreCutoff(value: string | undefined) {
  if (value === undefined) delete process.env.MATCH_ROSTER_SNAPSHOT_START_AT;
  else process.env.MATCH_ROSTER_SNAPSHOT_START_AT = value;
}
