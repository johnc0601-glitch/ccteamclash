import assert from 'node:assert/strict';
import test from 'node:test';
import type {LaunchSeedData} from '@/domain/launch/LaunchData';
import {MockLaunchRepository} from '@/domain/launch/LaunchRepository';
import {LaunchService} from '@/domain/launch/LaunchService';

const TIMESTAMP = '2026-07-25T00:00:00.000Z';

function createSeed(): LaunchSeedData {
  return {
    profiles: [
      {
        id: 'commissioner-1',
        userId: 'user-commissioner',
        displayName: 'Commissioner',
        role: 'Commissioner',
        status: 'Approved',
        playerId: null,
        captainTeamId: null,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'captain-1',
        userId: 'user-captain',
        displayName: 'Captain',
        role: 'Captain',
        status: 'Approved',
        playerId: 'player-1',
        captainTeamId: 'team-1',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'pending-1',
        userId: 'user-pending',
        displayName: 'Pending Player',
        role: 'Player',
        status: 'Pending',
        playerId: null,
        captainTeamId: null,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    playerClaims: [],
    players: [
      {
        id: 'player-1',
        name: 'Player One',
        gender: 'Male',
        pdgaNumber: '1001',
        pdgaRating: 950,
        currentTeamId: 'team-1',
        homeArea: '',
        active: true,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'player-2',
        name: 'Player Two',
        gender: 'Female',
        pdgaNumber: '1002',
        pdgaRating: 910,
        currentTeamId: null,
        homeArea: '',
        active: true,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    teams: [
      {
        id: 'team-1',
        name: 'Team One',
        shortName: 'T1',
        logo: '',
        active: true,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'team-2',
        name: 'Team Two',
        shortName: 'T2',
        logo: '',
        active: true,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    events: [
      {
        id: 'event-1',
        seasonLabel: 'Launch Season',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        courseName: 'Launch Course',
        directionsUrl: 'https://example.com/maps',
        date: '2026-08-01',
        time: '09:00',
        status: 'Scheduled',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    eventRosters: [],
    eventRosterPlayers: [],
    eventPosts: [],
  };
}

function createService() {
  const repository = new MockLaunchRepository(createSeed());
  return {
    repository,
    service: new LaunchService(repository),
  };
}

test('LaunchService creates a pending profile once per auth user', async () => {
  const {service} = createService();

  const created = await service.createPendingProfile({
    userId: 'new-auth-user',
    displayName: 'New Player',
  });
  const existing = await service.createPendingProfile({
    userId: 'new-auth-user',
    displayName: 'Changed Name',
  });

  assert.equal(created.ok, true);
  assert.equal(existing.ok, true);
  if (created.ok && existing.ok) {
    assert.equal(created.data.id, existing.data.id);
    assert.equal(existing.data.displayName, 'New Player');
    assert.equal(existing.data.status, 'Pending');
  }
});

test('LaunchService lets a member update their own profile name', async () => {
  const {repository, service} = createService();

  const result = await service.updateOwnProfileName('user-pending', '  Stephen Ajoy  ');

  assert.equal(result.ok, true);
  assert.equal((await repository.getProfileByUserId('user-pending'))?.displayName, 'Stephen Ajoy');
});

test('LaunchService keeps a linked player name in sync with their profile', async () => {
  const {repository, service} = createService();

  const result = await service.updateOwnProfileName('user-captain', 'Captain Corrected');

  assert.equal(result.ok, true);
  assert.equal((await repository.getProfileByUserId('user-captain'))?.displayName, 'Captain Corrected');
  assert.equal((await repository.getPlayer('player-1'))?.name, 'Captain Corrected');
});

test('LaunchService approves player claims through commissioner only', async () => {
  const {service} = createService();
  const claim = await service.submitPlayerClaim({
    profileId: 'pending-1',
    requestedPlayerId: 'player-2',
    submittedName: 'Corrected Player Two',
    submittedPdgaNumber: '1002',
  });

  assert.equal(claim.ok, true);
  if (!claim.ok) return;

  const blocked = await service.approvePlayerClaim(claim.data.id, 'captain-1');
  assert.equal(blocked.ok, false);

  const approved = await service.approvePlayerClaim(claim.data.id, 'commissioner-1');
  assert.equal(approved.ok, true);
  if (approved.ok) {
    assert.equal(approved.data.status, 'Approved');
    assert.equal(approved.data.reviewedBy, 'commissioner-1');
  }
});

test('LaunchService uses submitted player spelling when a claim is approved', async () => {
  const {repository, service} = createService();
  const claim = await service.submitPlayerClaim({
    profileId: 'pending-1',
    requestedPlayerId: 'player-2',
    submittedName: 'Stephen Ajoy',
    submittedPdgaNumber: '1002',
  });

  assert.equal(claim.ok, true);
  if (!claim.ok) return;

  const approved = await service.approvePlayerClaim(claim.data.id, 'commissioner-1');

  assert.equal(approved.ok, true);
  assert.equal((await repository.getPlayer('player-2'))?.name, 'Stephen Ajoy');
  assert.equal((await repository.getProfile('pending-1'))?.displayName, 'Stephen Ajoy');
});

test('LaunchService lets commissioners link an unclaimed account to a player', async () => {
  const {repository, service} = createService();

  const linked = await service.linkProfileToPlayer('pending-1', 'player-2', 'commissioner-1');

  assert.equal(linked.ok, true);
  if (!linked.ok) return;

  assert.equal(linked.data.status, 'Approved');
  assert.equal(linked.data.playerId, 'player-2');
  assert.equal((await repository.getPlayer('player-2'))?.name, 'Pending Player');

  const blockedDuplicate = await service.linkProfileToPlayer('captain-1', 'player-2', 'commissioner-1');
  assert.equal(blockedDuplicate.ok, false);
});

test('LaunchService assigns one captain team from commissioner approval', async () => {
  const {service} = createService();

  const assigned = await service.assignCaptainTeam('pending-1', 'team-2', 'commissioner-1');

  assert.equal(assigned.ok, true);
  if (assigned.ok) {
    assert.equal(assigned.data.role, 'Captain');
    assert.equal(assigned.data.captainTeamId, 'team-2');
  }
});

test('LaunchService submits and locks captain rosters', async () => {
  const {repository, service} = createService();

  const submitted = await service.submitEventRoster({
    eventId: 'event-1',
    teamId: 'team-1',
    submittedByProfileId: 'captain-1',
    playerIds: ['player-1', 'player-2', 'player-1'],
  });

  assert.equal(submitted.ok, true);
  if (!submitted.ok) return;

  const rosterPlayers = await repository.getEventRosterPlayers(submitted.data.id);
  assert.deepEqual(rosterPlayers.map((player) => player.playerId), ['player-1', 'player-2']);

  const locked = await service.setRosterLocked(submitted.data.id, true, 'commissioner-1');
  assert.equal(locked.ok, true);

  const blockedEdit = await service.submitEventRoster({
    eventId: 'event-1',
    teamId: 'team-1',
    submittedByProfileId: 'captain-1',
    playerIds: ['player-1'],
  });
  assert.equal(blockedEdit.ok, false);
});

test('LaunchService blocks captain roster access for another team', async () => {
  const {service} = createService();

  const result = await service.submitEventRoster({
    eventId: 'event-1',
    teamId: 'team-2',
    submittedByProfileId: 'captain-1',
    playerIds: ['player-1'],
  });

  assert.equal(result.ok, false);
});

test('LaunchService validates event posts before saving', async () => {
  const {repository, service} = createService();

  const emptyComment = await service.addEventPost({
    eventId: 'event-1',
    type: 'Comment',
    authorName: 'Visitor',
    body: '',
  });
  const missingPhoto = await service.addEventPost({
    eventId: 'event-1',
    type: 'Photo',
    authorName: 'Visitor',
    body: '',
    imageUrl: '',
  });
  const photo = await service.addEventPost({
    eventId: 'event-1',
    type: 'Photo',
    authorName: 'Visitor',
    body: '',
    imageUrl: 'https://example.com/photo.jpg',
  });

  assert.equal(emptyComment.ok, false);
  assert.equal(missingPhoto.ok, false);
  assert.equal(photo.ok, true);
  assert.equal((await repository.getEventPosts('event-1')).length, 1);
});
