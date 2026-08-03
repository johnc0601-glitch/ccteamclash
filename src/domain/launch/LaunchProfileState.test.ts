import assert from 'node:assert/strict';
import test from 'node:test';
import type {LaunchProfile} from '@/domain/launch/LaunchData';
import {resolveLaunchProfileState} from '@/domain/launch/LaunchProfileState';

const PROFILE: LaunchProfile = {
  id: 'profile-1',
  userId: 'user-1',
  displayName: 'Player One',
  role: 'Player',
  status: 'Pending',
  playerId: null,
  captainTeamId: null,
  createdAt: '2026-08-03T00:00:00.000Z',
  updatedAt: '2026-08-03T00:00:00.000Z',
};

function profile(
  role: LaunchProfile['role'],
  status: LaunchProfile['status'],
): LaunchProfile {
  return {...PROFILE, role, status};
}

test('resolves a missing profile', () => {
  assert.equal(resolveLaunchProfileState(null), 'missing');
  assert.equal(resolveLaunchProfileState(undefined), 'missing');
});

for (const [role, expected] of [
  ['Player', 'pending_player'],
  ['Captain', 'pending_captain'],
  ['Commissioner', 'pending_commissioner'],
] as const) {
  test(`resolves a pending ${role.toLowerCase()}`, () => {
    assert.equal(resolveLaunchProfileState(profile(role, 'Pending')), expected);
  });
}

for (const [role, expected] of [
  ['Player', 'approved_player'],
  ['Captain', 'approved_captain'],
  ['Commissioner', 'approved_commissioner'],
] as const) {
  test(`resolves an approved ${role.toLowerCase()}`, () => {
    assert.equal(resolveLaunchProfileState(profile(role, 'Approved')), expected);
  });
}

for (const role of ['Player', 'Captain', 'Commissioner'] as const) {
  test(`resolves a rejected ${role.toLowerCase()} as rejected`, () => {
    assert.equal(resolveLaunchProfileState(profile(role, 'Rejected')), 'rejected');
  });

  test(`resolves a suspended ${role.toLowerCase()} as suspended`, () => {
    assert.equal(resolveLaunchProfileState(profile(role, 'Suspended')), 'suspended');
  });
}

test('fails closed for an invalid role', () => {
  const invalid = {...PROFILE, role: 'Administrator'} as unknown as LaunchProfile;
  assert.equal(resolveLaunchProfileState(invalid), 'rejected');
});

test('fails closed for an invalid status', () => {
  const invalid = {...PROFILE, status: 'Active'} as unknown as LaunchProfile;
  assert.equal(resolveLaunchProfileState(invalid), 'rejected');
});

test('fails closed for a null role', () => {
  const invalid = {...PROFILE, role: null} as unknown as LaunchProfile;
  assert.equal(resolveLaunchProfileState(invalid), 'rejected');
});
