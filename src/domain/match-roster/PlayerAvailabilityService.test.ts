import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AttendanceActor,
  AttendanceMatch,
  MatchAttendance,
  MatchAttendanceStatus,
} from '@/domain/match-roster/MatchAttendance';
import {PlayerAvailabilityService} from '@/domain/match-roster/PlayerAvailabilityService';

const actor: AttendanceActor = {
  profileId: 'profile-1',
  profileStatus: 'Approved',
  profileRole: 'Player',
  playerId: 'player-1',
  teamId: 'team-1',
  captainTeamId: null,
  playerName: 'Test Player',
  playerActive: true,
};

const match: AttendanceMatch = {
  id: 'match-1',
  homeTeamId: 'team-1',
  awayTeamId: 'team-2',
  date: '2026-10-03',
  status: 'Scheduled',
};

class FakeRepository {
  attendance: MatchAttendance | undefined;
  actorMatchId: string | undefined;

  async getAttendanceActor(_userId: string, matchId?: string) {
    this.actorMatchId = matchId;
    return actor;
  }
  async getAttendanceMatch() { return match; }
  async getAttendance() { return this.attendance; }
  async saveAttendance(input: {
    matchId: string;
    teamId: string;
    playerId: string;
    status: MatchAttendanceStatus;
    updatedBy: string;
  }) {
    this.attendance = {
      id: 'attendance-1',
      ...input,
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    };
    return this.attendance;
  }
}

test('unanswered player is Unconfirmed and may respond before Friday noon', async () => {
  const repository = new FakeRepository();
  const service = new PlayerAvailabilityService(repository, () => new Date('2026-10-01T16:00:00.000Z'));
  const result = await service.getPersonalAttendance('user-1', match.id);
  assert.equal(result?.status, 'Unconfirmed');
  assert.equal(result?.attendanceOpen, true);
  assert.equal(repository.actorMatchId, match.id);
});

test('player may switch their answer before Friday noon', async () => {
  const repository = new FakeRepository();
  const service = new PlayerAvailabilityService(repository, () => new Date('2026-10-02T15:59:59.000Z'));

  const yes = await service.setOwnAttendance('user-1', match.id, 'Playing');
  assert.equal(yes.ok, true);
  assert.equal(repository.attendance?.status, 'Playing');

  const no = await service.setOwnAttendance('user-1', match.id, 'NotPlaying');
  assert.equal(no.ok, true);
  assert.equal(repository.attendance?.status, 'NotPlaying');
  assert.equal(repository.actorMatchId, match.id);
});

test('player cannot change their answer at or after Friday noon', async () => {
  const repository = new FakeRepository();
  const service = new PlayerAvailabilityService(repository, () => new Date('2026-10-02T16:00:00.000Z'));
  const result = await service.setOwnAttendance('user-1', match.id, 'Playing');
  assert.deepEqual(result, {ok: false, message: 'Player responses closed Friday at noon.'});
  assert.equal(repository.attendance, undefined);
});
