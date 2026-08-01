import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AttendanceActor,
  AttendanceMatch,
  MatchAttendance,
  MatchAttendanceStatus,
} from '@/domain/match-roster/MatchAttendance';
import {getMatchRosterLockAt, isMatchAttendanceOpen} from '@/domain/match-roster/MatchRosterLock';
import type {MatchRosterRepository} from '@/domain/match-roster/MatchRosterRepository';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';

const actor: AttendanceActor = {
  profileId: 'profile-player',
  profileStatus: 'Approved',
  profileRole: 'Player',
  playerId: 'player-own',
  teamId: 'team-home',
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

  async getAttendanceActor(): Promise<AttendanceActor | undefined> {
    return this.actor;
  }

  async getAttendanceMatch(): Promise<AttendanceMatch | undefined> {
    return this.match;
  }

  async getAttendance(): Promise<MatchAttendance | undefined> {
    return this.attendance;
  }

  async saveAttendance(input: (typeof this.savedInputs)[number]): Promise<MatchAttendance> {
    this.savedInputs.push(input);
    this.attendance = attendance(input.status);
    return this.attendance;
  }
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
