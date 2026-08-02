import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AttendanceActor,
  AttendanceMatch,
  MatchAttendance,
  MatchAttendanceStatus,
  MatchRoster,
  TeamAttendanceMember,
} from '@/domain/match-roster/MatchAttendance';
import {getMatchRosterLockAt, isMatchAttendanceOpen} from '@/domain/match-roster/MatchRosterLock';
import type {MatchRosterRepository} from '@/domain/match-roster/MatchRosterRepository';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import {parseMatchRosterSnapshotStartAt} from '@/domain/match-roster/MatchRosterSnapshotAutomation';

const actor: AttendanceActor = {
  profileId: 'profile-player',
  profileStatus: 'Approved',
  profileRole: 'Player',
  playerId: 'player-own',
  teamId: 'team-home',
  captainTeamId: null,
  playerName: 'Own Player',
  playerActive: true,
};

const match: AttendanceMatch = {
  id: 'match-1',
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
  date: '2026-08-08',
  status: 'Scheduled',
};

test('derives player, team, and updater IDs from the authenticated user context', async () => {
  const repository = new FakeMatchRosterRepository();
  const service = new MatchRosterService(repository, () => new Date('2026-08-08T18:00:00Z'));

  const result = await service.setOwnAttendance('user-own', match.id, 'Playing');

  assert.equal(result.ok, true);
  assert.deepEqual(repository.savedInputs, [{
    matchId: 'match-1',
    teamId: 'team-home',
    playerId: 'player-own',
    status: 'Playing',
    updatedBy: 'profile-player',
  }]);
});

test('updates only the row resolved from the signed-in profile', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.attendance = attendance('NotPlaying');
  const service = new MatchRosterService(repository, () => new Date('2026-08-08T18:00:00Z'));

  const result = await service.setOwnAttendance('user-own', match.id, 'Playing');

  assert.equal(result.ok, true);
  assert.equal(repository.savedInputs[0]?.playerId, 'player-own');
  assert.equal(repository.savedInputs[0]?.teamId, 'team-home');
});

test('rejects a client-supplied status outside the two stored states', async () => {
  const repository = new FakeMatchRosterRepository();
  const result = await new MatchRosterService(repository).setOwnAttendance('user-own', match.id, 'Unconfirmed');

  assert.deepEqual(result, {ok: false, message: 'Choose Playing or Not Playing.'});
  assert.equal(repository.savedInputs.length, 0);
});

test('rejects pending, captain, inactive, and unlinked player identities', async () => {
  const variants: AttendanceActor[] = [
    {...actor, profileStatus: 'Pending'},
    {...actor, profileRole: 'Captain'},
    {...actor, playerActive: false},
    {...actor, playerId: null},
  ];

  for (const variant of variants) {
    const repository = new FakeMatchRosterRepository();
    repository.actor = variant;
    const result = await new MatchRosterService(repository).setOwnAttendance('user-own', match.id, 'Playing');
    assert.equal(result.ok, false);
    assert.equal(repository.savedInputs.length, 0);
  }
});

test('rejects a player whose stable team ID is not in the match', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.actor = {...actor, teamId: 'team-unrelated'};

  const result = await new MatchRosterService(repository).setOwnAttendance('user-own', match.id, 'Playing');

  assert.equal(result.ok, false);
  assert.equal(repository.savedInputs.length, 0);
});

test('blocks writes exactly at and after the lock', async () => {
  for (const now of ['2026-08-08T19:00:00Z', '2026-08-08T19:00:01Z']) {
    const repository = new FakeMatchRosterRepository();
    const result = await new MatchRosterService(repository, () => new Date(now))
      .setOwnAttendance('user-own', match.id, 'Playing');
    assert.deepEqual(result, {ok: false, message: 'Attendance is closed for this match.'});
    assert.equal(repository.savedInputs.length, 0);
  }
});

test('calculates 3 PM Eastern correctly in standard and daylight time', () => {
  assert.equal(getMatchRosterLockAt('2026-01-15')?.toISOString(), '2026-01-15T20:00:00.000Z');
  assert.equal(getMatchRosterLockAt('2026-07-15')?.toISOString(), '2026-07-15T19:00:00.000Z');
});

test('enforces the lock across the actual 2026 Eastern Time transition dates', () => {
  const transitions = [
    {date: '2026-03-08', lockAt: '2026-03-08T19:00:00.000Z'},
    {date: '2026-11-01', lockAt: '2026-11-01T20:00:00.000Z'},
  ];

  for (const transition of transitions) {
    const transitionMatch = {...match, date: transition.date};
    const lockAt = new Date(transition.lockAt);

    assert.equal(
      isMatchAttendanceOpen(transitionMatch, new Date(lockAt.getTime() - 1)),
      true,
      `${transition.date} remains open one millisecond before lock`,
    );
    assert.equal(
      isMatchAttendanceOpen(transitionMatch, lockAt),
      false,
      `${transition.date} closes exactly at 3 PM Eastern`,
    );
    assert.equal(
      isMatchAttendanceOpen(transitionMatch, new Date(lockAt.getTime() + 1)),
      false,
      `${transition.date} remains closed after lock`,
    );
  }
});

test('uses the current rescheduled date and closes completed or cancelled matches', () => {
  assert.equal(isMatchAttendanceOpen({...match, date: '2026-08-09'}, new Date('2026-08-08T19:00:00Z')), true);
  assert.equal(isMatchAttendanceOpen({...match, status: 'Completed'}, new Date('2026-08-08T18:00:00Z')), false);
  assert.equal(isMatchAttendanceOpen({...match, status: 'Cancelled'}, new Date('2026-08-08T18:00:00Z')), false);
});

test('returns Unconfirmed when the player has no stored attendance row', async () => {
  const repository = new FakeMatchRosterRepository();
  const personal = await new MatchRosterService(repository, () => new Date('2026-08-08T18:00:00Z'))
    .getPersonalAttendance('user-own', match.id);

  assert.equal(personal?.status, 'Unconfirmed');
  assert.equal(personal?.playerId, 'player-own');
});

test('does not return a personal card model for another team player', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.actor = {...actor, teamId: 'team-unrelated'};

  const personal = await new MatchRosterService(repository).getPersonalAttendance('user-own', match.id);

  assert.equal(personal, undefined);
});

test('captain views and updates only the assigned team attendance', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.actor = {...actor, profileRole: 'Captain', playerId: null, teamId: null, playerName: null, captainTeamId: 'team-home'};
  const service = new MatchRosterService(repository, () => new Date('2026-08-08T18:00:00Z'));

  const rosters = await service.getManagedTeamRosters('captain-user', match.id);
  const ownResult = await service.setTeamAttendance('captain-user', match.id, 'player-own', 'Playing');
  const opponentResult = await service.setTeamAttendance('captain-user', match.id, 'player-away', 'Playing');

  assert.deepEqual(rosters.map((roster) => roster.teamId), ['team-home']);
  assert.equal(ownResult.ok, true);
  assert.equal(opponentResult.ok, false);
  assert.equal(repository.savedInputs.at(-1)?.teamId, 'team-home');
});

test('captain confirms and revises only the assigned team roster before lock', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.actor = {...actor, profileRole: 'Captain', playerId: null, teamId: null, playerName: null, captainTeamId: 'team-home'};
  const service = new MatchRosterService(repository, () => new Date('2026-08-08T18:00:00Z'));

  const confirmed = await service.confirmTeamRoster('captain-user', match.id, 'team-home');
  const revised = await service.setTeamAttendance('captain-user', match.id, 'player-own', 'NotPlaying');
  const opponent = await service.confirmTeamRoster('captain-user', match.id, 'team-away');

  assert.equal(confirmed.ok && confirmed.data.rosterStatus, 'Confirmed');
  assert.equal(revised.ok, true);
  assert.equal(opponent.ok, false);
  assert.deepEqual(repository.savedRosterInputs, [{
    matchId: 'match-1',
    teamId: 'team-home',
    confirmedBy: 'profile-player',
    confirmedAt: '2026-08-08T18:00:00.000Z',
  }]);
});

test('captain cannot manage a match that does not include the assigned team', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.actor = {...actor, profileRole: 'Captain', captainTeamId: 'team-unrelated'};

  const rosters = await new MatchRosterService(repository).getManagedTeamRosters('captain-user', match.id);
  const result = await new MatchRosterService(repository).confirmTeamRoster('captain-user', match.id, 'team-unrelated');

  assert.deepEqual(rosters, []);
  assert.equal(result.ok, false);
});

test('commissioner manages either participating team through the same service path', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.actor = {...actor, profileRole: 'Commissioner', playerId: null, teamId: null, playerName: null};
  const service = new MatchRosterService(repository, () => new Date('2026-08-08T18:00:00Z'));

  const rosters = await service.getManagedTeamRosters('commissioner-user', match.id);
  const awayUpdate = await service.setTeamAttendance('commissioner-user', match.id, 'player-away', 'Playing');
  const awayConfirmation = await service.confirmTeamRoster('commissioner-user', match.id, 'team-away');

  assert.deepEqual(rosters.map((roster) => roster.teamId), ['team-away', 'team-home']);
  assert.equal(awayUpdate.ok, true);
  assert.equal(awayConfirmation.ok, true);
});

test('captain and commissioner management is blocked at the lock', async () => {
  for (const role of ['Captain', 'Commissioner'] as const) {
    const repository = new FakeMatchRosterRepository();
    repository.actor = {
      ...actor,
      profileRole: role,
      captainTeamId: role === 'Captain' ? 'team-home' : null,
    };
    const service = new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00Z'));

    assert.equal((await service.setTeamAttendance(`${role}-user`, match.id, 'player-own', 'Playing')).ok, false);
    assert.equal((await service.confirmTeamRoster(`${role}-user`, match.id, 'team-home')).ok, false);
  }
});

test('switches to the official snapshot exactly at lock and preserves empty completed rosters', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.officialRosters = officialRosters();
  repository.snapshotComplete = true;

  const before = await new MatchRosterService(repository, () => new Date('2026-08-08T18:59:59.999Z'))
    .ensureLockedSnapshot(match.id);
  const atLock = await new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00.000Z'))
    .ensureLockedSnapshot(match.id);

  assert.equal(before.status, 'before-lock');
  assert.equal(atLock.status, 'complete');
  assert.equal(atLock.rosters[0]?.players.length, 0);
  assert.equal(repository.snapshotCreateCount, 0);
});

test('lazy creation runs only for incomplete snapshots and hides failures', async () => {
  const repository = new FakeMatchRosterRepository();
  const service = new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00Z'));
  const created = await service.ensureLockedSnapshot(match.id, new Date('2026-08-08T19:00:00Z'));
  assert.equal(created.status, 'complete');
  assert.equal(repository.snapshotCreateCount, 1);

  repository.snapshotComplete = false;
  repository.completeMatchIds.clear();
  repository.createFails = true;
  const unavailable = await new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00Z'), repository, () => {})
    .ensureLockedSnapshot(match.id, new Date('2026-08-08T19:00:00Z'));
  assert.deepEqual(unavailable, {status: 'unavailable', rosters: []});
});

test('lazy creation fails closed before cutoff and for missing or invalid configuration', async () => {
  for (const cutoff of [
    new Date('2026-08-08T19:00:00.001Z'),
    parseMatchRosterSnapshotStartAt(undefined),
    parseMatchRosterSnapshotStartAt('not-a-timestamp'),
  ]) {
    const repository = new FakeMatchRosterRepository();
    const state = await new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00Z'), repository, () => {})
      .ensureLockedSnapshot(match.id, cutoff);
    assert.deepEqual(state, {status: 'unavailable', rosters: []});
    assert.equal(repository.snapshotCreateCount, 0);
  }
});

test('lazy creation permits exact and post-cutoff matches', async () => {
  for (const cutoff of [new Date('2026-08-08T19:00:00Z'), new Date('2026-08-07T19:00:00Z')]) {
    const repository = new FakeMatchRosterRepository();
    const state = await new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00Z'))
      .ensureLockedSnapshot(match.id, cutoff);
    assert.equal(state.status, 'complete');
    assert.equal(repository.snapshotCreateCount, 1);
  }
});

test('an existing pre-cutoff snapshot remains readable without creation', async () => {
  const repository = lockedSnapshotRepository();
  const state = await new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00Z'))
    .ensureLockedSnapshot(match.id, new Date('2026-08-09T19:00:00Z'));
  assert.equal(state.status, 'complete');
  assert.equal(repository.snapshotCreateCount, 0);
});

test('only an approved commissioner can correct either participating snapshot after lock', async () => {
  for (const profileRole of ['Player', 'Captain'] as const) {
    const repository = lockedSnapshotRepository();
    repository.actor = {...actor, profileRole};
    assert.equal((await lockedService(repository).commissionerAddSnapshotPlayer('user', match.id, 'team-home', 'new')).ok, false);
    assert.equal((await lockedService(repository).commissionerRemoveSnapshotPlayer('user', match.id, 'team-home', 'player-own')).ok, false);
  }

  const repository = lockedSnapshotRepository();
  repository.actor = {...actor, profileRole: 'Commissioner'};
  const service = lockedService(repository);
  assert.equal((await service.commissionerAddSnapshotPlayer('user', match.id, 'team-away', 'new')).ok, true);
  assert.equal((await service.commissionerRemoveSnapshotPlayer('user', match.id, 'team-home', 'player-own')).ok, true);
  assert.equal((await service.commissionerAddSnapshotPlayer('user', match.id, 'team-other', 'new')).ok, false);
  assert.deepEqual(repository.addedSnapshotPlayers, [{matchId: match.id, teamId: 'team-away', playerId: 'new'}]);
  assert.deepEqual(repository.removedSnapshotPlayers, [{matchId: match.id, teamId: 'team-home', playerId: 'player-own'}]);
});

test('commissioner corrections require lock, approval, and an existing manifest', async () => {
  const preLock = lockedSnapshotRepository();
  preLock.actor = {...actor, profileRole: 'Commissioner'};
  assert.equal((await new MatchRosterService(preLock, () => new Date('2026-08-08T18:59:59.999Z'))
    .commissionerAddSnapshotPlayer('user', match.id, 'team-home', 'new')).ok, false);

  const unapproved = lockedSnapshotRepository();
  unapproved.actor = {...actor, profileRole: 'Commissioner', profileStatus: 'Pending'};
  assert.equal((await lockedService(unapproved).commissionerAddSnapshotPlayer('user', match.id, 'team-home', 'new')).ok, false);

  const missing = lockedSnapshotRepository();
  missing.actor = {...actor, profileRole: 'Commissioner'};
  missing.officialRosters = missing.officialRosters.filter((roster) => roster.teamId !== 'team-home');
  assert.equal((await lockedService(missing).commissionerAddSnapshotPlayer('user', match.id, 'team-home', 'new')).ok, false);
});

test('commissioner add and remove reject a partial one-manifest snapshot without repository writes', async () => {
  const repository = lockedSnapshotRepository();
  repository.actor = {...actor, profileRole: 'Commissioner'};
  repository.officialRosters = repository.officialRosters.filter((roster) => roster.teamId === 'team-home');
  const service = lockedService(repository);

  const add = await service.commissionerAddSnapshotPlayer('user', match.id, 'team-home', 'new');
  const remove = await service.commissionerRemoveSnapshotPlayer('user', match.id, 'team-home', 'player-own');

  assert.equal(add.ok, false);
  assert.equal(remove.ok, false);
  assert.deepEqual(repository.addedSnapshotPlayers, []);
  assert.deepEqual(repository.removedSnapshotPlayers, []);
});

test('scheduled processing isolates failures and skips complete eligible matches', async () => {
  const repository = new FakeMatchRosterRepository();
  repository.candidates = [
    match,
    {...match, id: 'complete'},
    {...match, id: 'failure'},
  ];
  repository.completeMatchIds.add('complete');
  repository.failMatchIds.add('failure');
  const summary = await new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00Z'), repository, () => {})
    .processLockedSnapshots(new Date('2026-08-08T19:00:00Z'));
  assert.deepEqual(summary, {processed: 3, succeeded: 1, alreadyComplete: 1, failed: 1});
});

test('scheduled processing fails closed when the cutoff is missing or invalid', async () => {
  for (const cutoff of [
    parseMatchRosterSnapshotStartAt(undefined),
    parseMatchRosterSnapshotStartAt('invalid'),
  ]) {
    const repository = new FakeMatchRosterRepository();
    repository.candidates = [match];
    const summary = await new MatchRosterService(repository, undefined, repository, () => {})
      .processLockedSnapshots(cutoff);
    assert.deepEqual(summary, {processed: 0, succeeded: 0, alreadyComplete: 0, failed: 0});
    assert.equal(repository.candidateQueryCount, 0);
  }
});

class FakeMatchRosterRepository implements MatchRosterRepository {
  actor: AttendanceActor | undefined = actor;
  match: AttendanceMatch | undefined = match;
  attendance: MatchAttendance | undefined;
  savedInputs: Array<{
    matchId: string;
    teamId: string;
    playerId: string;
    status: MatchAttendanceStatus;
    updatedBy: string;
  }> = [];
  savedRosterInputs: Array<{
    matchId: string;
    teamId: string;
    confirmedBy: string;
    confirmedAt: string;
  }> = [];
  teamAttendance: Record<string, TeamAttendanceMember[]> = {
    'team-home': [{playerId: 'player-own', playerName: 'Own Player', teamId: 'team-home', status: 'Unconfirmed'}],
    'team-away': [{playerId: 'player-away', playerName: 'Away Player', teamId: 'team-away', status: 'Unconfirmed'}],
  };
  matchRosters: Record<string, MatchRoster | undefined> = {};
  officialRosters: OfficialMatchRoster[] = [];
  snapshotComplete = false;
  snapshotCreateCount = 0;
  createFails = false;
  candidates: AttendanceMatch[] = [];
  completeMatchIds = new Set<string>();
  failMatchIds = new Set<string>();
  addedSnapshotPlayers: Array<{matchId: string; teamId: string; playerId: string}> = [];
  removedSnapshotPlayers: Array<{matchId: string; teamId: string; playerId: string}> = [];
  candidateQueryCount = 0;

  async getAttendanceActor(): Promise<AttendanceActor | undefined> {
    return this.actor;
  }

  async getAttendanceMatch(): Promise<AttendanceMatch | undefined> {
    return this.match;
  }

  async getAttendance(): Promise<MatchAttendance | undefined> {
    return this.attendance;
  }

  async getTeamAttendance(_matchId: string, teamId: string): Promise<TeamAttendanceMember[]> {
    return (this.teamAttendance[teamId] ?? []).map((player) => ({...player}));
  }

  async getMatchRoster(_matchId: string, teamId: string): Promise<MatchRoster | undefined> {
    const roster = this.matchRosters[teamId];
    return roster ? {...roster} : undefined;
  }

  async getOfficialMatchRosters(): Promise<OfficialMatchRoster[]> {
    return this.officialRosters.map((roster) => ({...roster, players: roster.players.map((player) => ({...player}))}));
  }

  async hasCompleteSnapshot(matchId: string): Promise<boolean> {
    return (this.candidates.length === 0 && this.snapshotComplete) || this.completeMatchIds.has(matchId);
  }

  async getSnapshotCandidateMatches(): Promise<AttendanceMatch[]> {
    this.candidateQueryCount += 1;
    return this.candidates;
  }

  async createLockedSnapshot(matchId: string): Promise<void> {
    this.snapshotCreateCount += 1;
    if (this.createFails || this.failMatchIds.has(matchId)) throw new Error('snapshot failed');
    if (this.candidates.length === 0) this.snapshotComplete = true;
    this.completeMatchIds.add(matchId);
    if (!this.officialRosters.length) this.officialRosters = officialRosters();
  }

  async addSnapshotPlayer(matchId: string, teamId: string, playerId: string): Promise<void> {
    this.addedSnapshotPlayers.push({matchId, teamId, playerId});
    const roster = this.officialRosters.find((item) => item.teamId === teamId);
    roster?.players.push(snapshotPlayer(playerId, teamId));
  }

  async removeSnapshotPlayer(matchId: string, teamId: string, playerId: string): Promise<void> {
    this.removedSnapshotPlayers.push({matchId, teamId, playerId});
    const roster = this.officialRosters.find((item) => item.teamId === teamId);
    if (roster) roster.players = roster.players.filter((player) => player.playerId !== playerId);
  }

  async saveAttendance(input: (typeof this.savedInputs)[number]): Promise<MatchAttendance> {
    this.savedInputs.push(input);
    this.attendance = attendance(input.status);
    this.teamAttendance[input.teamId] = (this.teamAttendance[input.teamId] ?? []).map((player) => (
      player.playerId === input.playerId ? {...player, status: input.status} : player
    ));
    return this.attendance;
  }


  async saveMatchRoster(input: (typeof this.savedRosterInputs)[number]): Promise<MatchRoster> {
    this.savedRosterInputs.push(input);
    const roster: MatchRoster = {
      id: `roster-${input.teamId}`,
      matchId: input.matchId,
      teamId: input.teamId,
      status: 'Confirmed',
      confirmedBy: input.confirmedBy,
      confirmedAt: input.confirmedAt,
      updatedAt: input.confirmedAt,
    };
    this.matchRosters[input.teamId] = roster;
    return roster;
  }
}

function lockedSnapshotRepository(): FakeMatchRosterRepository {
  const repository = new FakeMatchRosterRepository();
  repository.snapshotComplete = true;
  repository.officialRosters = officialRosters();
  return repository;
}

function lockedService(repository: FakeMatchRosterRepository): MatchRosterService {
  return new MatchRosterService(repository, () => new Date('2026-08-08T19:00:00Z'));
}

function officialRosters(): OfficialMatchRoster[] {
  return ['team-away', 'team-home'].map((teamId) => ({
    id: `manifest-${teamId}`,
    matchId: match.id,
    teamId,
    needsCommissionerReview: teamId === 'team-away',
    createdAt: '2026-08-08T19:00:00Z',
    updatedBy: null,
    updatedAt: '2026-08-08T19:00:00Z',
    players: teamId === 'team-home' ? [snapshotPlayer('player-own', teamId)] : [],
  }));
}

function snapshotPlayer(playerId: string, teamId: string) {
  return {
    id: `snapshot-${teamId}-${playerId}`,
    matchId: match.id,
    teamId,
    teamNameSnapshot: teamId === 'team-home' ? 'Historic Home' : 'Historic Away',
    playerId,
    playerNameSnapshot: playerId === 'player-own' ? 'Historic Player' : 'Trusted Current Player',
    createdAt: '2026-08-08T19:00:00Z',
    updatedBy: null,
    updatedAt: '2026-08-08T19:00:00Z',
  };
}

function attendance(status: MatchAttendanceStatus): MatchAttendance {
  return {
    id: 'attendance-1',
    matchId: match.id,
    teamId: 'team-home',
    playerId: 'player-own',
    status,
    updatedBy: 'profile-player',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };
}
