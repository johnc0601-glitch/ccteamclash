import assert from 'node:assert/strict';
import test from 'node:test';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import {
  buildPublicAvailabilityPreview,
  orderPublicAvailability,
} from '@/services/matches/PublicAvailability';

function member(
  playerId: string,
  status: TeamAttendanceMember['status'],
): TeamAttendanceMember {
  return {
    playerId,
    playerName: playerId,
    teamId: 'team-a',
    status,
  };
}

test('public availability keeps Playing, Unconfirmed, NotPlaying ordering while preserving order inside each status', () => {
  const ordered = orderPublicAvailability([
    member('unconfirmed-1', 'Unconfirmed'),
    member('not-playing-1', 'NotPlaying'),
    member('playing-1', 'Playing'),
    member('unconfirmed-2', 'Unconfirmed'),
    member('playing-2', 'Playing'),
    member('not-playing-2', 'NotPlaying'),
  ]);

  assert.deepEqual(
    ordered.map(({playerId}) => playerId),
    ['playing-1', 'playing-2', 'unconfirmed-1', 'unconfirmed-2', 'not-playing-1', 'not-playing-2'],
  );
});

test('public availability preview sends only five initial rows and reports the hidden remainder', () => {
  const preview = buildPublicAvailabilityPreview([
    member('unconfirmed-1', 'Unconfirmed'),
    member('playing-1', 'Playing'),
    member('not-playing-1', 'NotPlaying'),
    member('playing-2', 'Playing'),
    member('unconfirmed-2', 'Unconfirmed'),
    member('not-playing-2', 'NotPlaying'),
    member('unconfirmed-3', 'Unconfirmed'),
  ]);

  assert.deepEqual(
    preview.previewPlayers.map(({playerId}) => playerId),
    ['playing-1', 'playing-2', 'unconfirmed-1', 'unconfirmed-2', 'unconfirmed-3'],
  );
  assert.equal(preview.remainingCount, 2);
});
