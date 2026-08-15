import assert from 'node:assert/strict';
import test from 'node:test';
import {buildPlayerApplicationReviewCards} from './PlayerApplicationReview';

const application = {
  id: 'application-1', profileId: 'profile-1', seasonId: 'season-1', requestedTeamId: 'team-1',
  playerType: 'Junior', gender: 'Female', playedBefore: true, status: 'Pending',
  createdAt: '2026-08-15T10:00:00Z', updatedAt: '2026-08-15T10:00:00Z', reviewedAt: null, reviewedBy: null,
} as const;

test('builds commissioner context from stable IDs', () => {
  const [card] = buildPlayerApplicationReviewCards({
    applications: [application],
    profiles: [{id: 'profile-1', userId: 'user-1', displayName: 'Jamie Player', role: 'Player', status: 'Pending', playerId: null, captainTeamId: null, createdAt: '', updatedAt: ''}],
    claims: [{id: 'claim-1', profileId: 'profile-1', requestedPlayerId: 'player-1', submittedName: 'Jamie Player', submittedPdgaNumber: '123', status: 'Pending', createdAt: '2026-08-15T10:00:00Z', reviewedAt: null, reviewedBy: null}],
    players: [{id: 'player-1', name: 'Jamie History', gender: 'Female', pdgaNumber: '123', pdgaRating: null, currentTeamId: null, homeArea: '', active: true, createdAt: '', updatedAt: ''}],
    teams: [{id: 'team-1', name: 'Dark Knights', shortName: 'Knights', logo: '', active: true, createdAt: '', updatedAt: ''}],
  });

  assert.equal(card.applicantName, 'Jamie Player');
  assert.equal(card.requestedTeamName, 'Dark Knights');
  assert.equal(card.claimedPlayerName, 'Jamie History');
  assert.equal(card.profileStatus, 'Pending');
});

test('does not attach claims to new-player applications', () => {
  const [card] = buildPlayerApplicationReviewCards({
    applications: [{...application, playedBefore: false}], profiles: [], claims: [], players: [], teams: [],
  });
  assert.equal(card.claim, null);
  assert.equal(card.claimedPlayerName, null);
  assert.equal(card.requestedTeamName, 'Requested team unavailable');
});
