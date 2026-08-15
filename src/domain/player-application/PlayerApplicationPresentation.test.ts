import assert from 'node:assert/strict';
import test from 'node:test';
import {buildPlayerApplicationSummary, canStartPlayerApplication} from './PlayerApplicationPresentation';

const application = {
  id: 'application-1', profileId: 'profile-1', seasonId: 'season-1', requestedTeamId: 'team-1',
  playerType: 'Junior' as const, gender: 'Female' as const, playedBefore: true,
  status: 'Pending' as const, createdAt: 'created', updatedAt: 'updated', reviewedAt: null, reviewedBy: null,
};

test('pending application summary keeps requested team separate from roster membership', () => {
  assert.deepEqual(buildPlayerApplicationSummary({
    application,
    displayName: 'John Smith',
    requestedTeamName: 'Dark Knights',
    previousPlayerName: 'John Carroll',
    claim: {
      id: 'claim-1', profileId: 'profile-1', requestedPlayerId: 'player-1', submittedName: 'John Carroll',
      submittedPdgaNumber: '', status: 'Pending', createdAt: 'created', reviewedAt: null, reviewedBy: null,
    },
  }), {
    status: 'Pending',
    displayName: 'John Smith',
    identityLabel: 'Junior • Female',
    requestedTeamName: 'Dark Knights',
    canChangeRequestedTeam: true,
    previousPlayerName: 'John Carroll',
    historyConnectionStatus: 'Pending',
  });
});

test('new-player summary contains no history claim state', () => {
  const summary = buildPlayerApplicationSummary({
    application: {...application, playedBefore: false, status: 'Approved'},
    displayName: 'New Player',
    requestedTeamName: 'Beast Mode',
  });
  assert.equal(summary.previousPlayerName, undefined);
  assert.equal(summary.historyConnectionStatus, undefined);
  assert.equal(summary.canChangeRequestedTeam, false);
});

test('application availability requires a pending player and an open season with enrolled teams', () => {
  assert.deepEqual(canStartPlayerApplication({
    profileState: 'pending_player', seasonAvailable: true, enrolledTeamCount: 2,
  }), {available: true});
  assert.equal(canStartPlayerApplication({
    profileState: 'approved_player', seasonAvailable: true, enrolledTeamCount: 2,
  }).available, false);
  assert.equal(canStartPlayerApplication({
    profileState: 'pending_player', seasonAvailable: false, enrolledTeamCount: 2,
  }).message, 'Player applications are not open for a current season.');
  assert.equal(canStartPlayerApplication({
    profileState: 'pending_player', seasonAvailable: true, enrolledTeamCount: 0,
  }).message, 'No teams are available for player applications yet.');
});
