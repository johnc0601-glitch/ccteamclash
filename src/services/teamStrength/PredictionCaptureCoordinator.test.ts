import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import {captureCurrentRosterPrediction} from './PredictionCaptureCoordinator';
import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import type {PredictionSnapshotRepository} from './PredictionSnapshotRepository';

class MemoryRepository implements PredictionSnapshotRepository {
  saved: TeamStrengthPredictionSnapshot[][] = [];

  async saveIfAbsent(snapshots: readonly TeamStrengthPredictionSnapshot[]): Promise<void> {
    this.saved.push([...snapshots]);
  }
}

test('does nothing before the first prediction checkpoint', async () => {
  const repository = new MemoryRepository();
  const result = await captureCurrentRosterPrediction({
    ...baseInput(repository),
    now: new Date('2026-10-02T03:59:59.000Z'),
  });

  assert.deepEqual(result, {captured: false, reason: 'NotDue'});
  assert.equal(repository.saved.length, 0);
});

test('captures Active Roster Strength during the pre-match window', async () => {
  const repository = new MemoryRepository();
  const result = await captureCurrentRosterPrediction({
    ...baseInput(repository),
    now: new Date('2026-10-02T05:00:00.000Z'),
  });

  assert.equal(result.captured, true);
  if (!result.captured) return;
  assert.equal(result.source, 'activeRoster');
  assert.equal(result.snapshots[0].captureReason, 'PreMatch');
  assert.equal(repository.saved.length, 1);
});

test('requires attendance inputs during the AttendanceFinal window', async () => {
  const repository = new MemoryRepository();
  const missing = await captureCurrentRosterPrediction({
    ...baseInput(repository),
    now: new Date('2026-10-02T17:00:00.000Z'),
  });
  assert.deepEqual(missing, {captured: false, reason: 'MissingInputs'});

  const complete = await captureCurrentRosterPrediction({
    ...baseInput(repository),
    homeAttendance: [{playerId: 'home-0', playerName: 'home-0', teamId: 'home', status: 'Playing'}],
    awayAttendance: [{playerId: 'away-0', playerName: 'away-0', teamId: 'away', status: 'Playing'}],
    now: new Date('2026-10-02T17:00:00.000Z'),
  });
  assert.equal(complete.captured, true);
  if (!complete.captured) return;
  assert.equal(complete.source, 'confirmedAvailableRoster');
  assert.equal(complete.snapshots[0].captureReason, 'AttendanceFinal');
});

test('requires official rosters after roster lock', async () => {
  const repository = new MemoryRepository();
  const missing = await captureCurrentRosterPrediction({
    ...baseInput(repository),
    now: new Date('2026-10-03T19:01:00.000Z'),
  });
  assert.deepEqual(missing, {captured: false, reason: 'MissingInputs'});

  const complete = await captureCurrentRosterPrediction({
    ...baseInput(repository),
    officialRosters: [officialRoster('home', 'home-0'), officialRoster('away', 'away-0')],
    now: new Date('2026-10-03T19:01:00.000Z'),
  });
  assert.equal(complete.captured, true);
  if (!complete.captured) return;
  assert.equal(complete.source, 'matchLineup');
  assert.equal(complete.snapshots[0].captureReason, 'RosterLock');
});

test('marks a missed Match Lineup snapshot expired instead of backfilling later CI', async () => {
  const repository = new MemoryRepository();
  const result = await captureCurrentRosterPrediction({
    ...baseInput(repository),
    officialRosters: [officialRoster('home', 'home-0'), officialRoster('away', 'away-0')],
    now: new Date('2026-10-03T21:00:00.000Z'),
  });

  assert.deepEqual(result, {captured: false, reason: 'Expired'});
  assert.equal(repository.saved.length, 0);
});

test('refuses cancelled and completed matches to prevent late data leakage', async () => {
  for (const matchStatus of ['Cancelled', 'Completed'] as const) {
    const repository = new MemoryRepository();
    const result = await captureCurrentRosterPrediction({
      ...baseInput(repository),
      matchStatus,
      officialRosters: [officialRoster('home', 'home-0'), officialRoster('away', 'away-0')],
      now: new Date('2026-10-03T20:00:00.000Z'),
    });

    assert.deepEqual(result, {captured: false, reason: 'NotEligible'});
    assert.equal(repository.saved.length, 0);
  }
});

function baseInput(repository: PredictionSnapshotRepository) {
  return {
    repository,
    matchId: 'match',
    matchDate: '2026-10-03',
    matchStatus: 'Scheduled' as const,
    homeTeamId: 'home',
    awayTeamId: 'away',
    matchVenue: 'Home' as const,
    homePlayers: players('home', 900),
    awayPlayers: players('away', 900),
  };
}

function players(prefix: string, ci: number): LaunchPlayer[] {
  return Array.from({length: 18}, (_, index) => player(`${prefix}-${index}`, ci));
}

function player(id: string, ci: number): LaunchPlayer {
  return {
    id,
    name: id,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex: ci,
    clashIndexProvisional: false,
    currentTeamId: 'team',
    homeArea: '',
    active: true,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  };
}

function officialRoster(teamId: string, playerId: string): OfficialMatchRoster {
  return {
    id: `roster-${teamId}`,
    matchId: 'match',
    teamId,
    teamNameSnapshot: teamId,
    needsCommissionerReview: false,
    createdAt: '2026-10-03T19:00:00.000Z',
    updatedBy: null,
    updatedAt: '2026-10-03T19:00:00.000Z',
    players: [{
      id: `snapshot-${playerId}`,
      matchId: 'match',
      teamId,
      teamNameSnapshot: teamId,
      playerId,
      playerNameSnapshot: playerId,
      createdAt: '2026-10-03T19:00:00.000Z',
      updatedBy: null,
      updatedAt: '2026-10-03T19:00:00.000Z',
    }],
  };
}
