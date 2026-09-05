import assert from 'node:assert/strict';
import test from 'node:test';
import type {AttendanceActor} from '@/domain/match-roster/MatchAttendance';
import {canViewMatchPrediction} from '@/services/settings/MatchPredictionVisibility';

function actor(
  profileRole: AttendanceActor['profileRole'],
  profileStatus: AttendanceActor['profileStatus'] = 'Approved',
): AttendanceActor {
  return {
    profileId: `${profileRole.toLowerCase()}-profile`,
    profileStatus,
    profileRole,
    playerId: null,
    teamId: null,
    captainTeamId: profileRole === 'Captain' ? 'test-team' : null,
    playerName: null,
    playerActive: true,
  };
}

test('public matchup predictions are visible without an account', () => {
  assert.equal(canViewMatchPrediction('Public', undefined), true);
});

test('captains and commissioners mode allows only approved leadership roles', () => {
  assert.equal(canViewMatchPrediction('CaptainsCommissioner', actor('Captain')), true);
  assert.equal(canViewMatchPrediction('CaptainsCommissioner', actor('Commissioner')), true);
  assert.equal(canViewMatchPrediction('CaptainsCommissioner', actor('Player')), false);
  assert.equal(canViewMatchPrediction('CaptainsCommissioner', actor('Captain', 'Pending')), false);
  assert.equal(canViewMatchPrediction('CaptainsCommissioner', undefined), false);
});

test('commissioner-only mode allows only approved commissioners', () => {
  assert.equal(canViewMatchPrediction('Commissioner', actor('Commissioner')), true);
  assert.equal(canViewMatchPrediction('Commissioner', actor('Captain')), false);
  assert.equal(canViewMatchPrediction('Commissioner', actor('Commissioner', 'Suspended')), false);
  assert.equal(canViewMatchPrediction('Commissioner', undefined), false);
});
