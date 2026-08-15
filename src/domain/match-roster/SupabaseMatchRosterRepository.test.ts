import assert from 'node:assert/strict';
import test from 'node:test';
import type {AttendanceMatch} from '@/domain/match-roster/MatchAttendance';
import {
  buildTeamAttendanceMembers,
  filterSnapshotCandidateMatches,
  resolveAttendanceActor,
} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {parseMatchRosterSnapshotStartAt} from '@/domain/match-roster/MatchRosterSnapshotAutomation';

test('requires a complete ISO-8601 timestamp with an explicit zone', () => {
  assert.equal(parseMatchRosterSnapshotStartAt(undefined), undefined);
  assert.equal(parseMatchRosterSnapshotStartAt(''), undefined);
  assert.equal(parseMatchRosterSnapshotStartAt('2026-08-15'), undefined);
  assert.equal(parseMatchRosterSnapshotStartAt('2026-08-15T00:00:00'), undefined);
  assert.equal(parseMatchRosterSnapshotStartAt('invalid'), undefined);
  assert.equal(
    parseMatchRosterSnapshotStartAt('2026-08-15T00:00:00-04:00')?.toISOString(),
    '2026-08-15T04:00:00.000Z',
  );
});

test('actual repository filtering excludes pre-cutoff and includes exact and post-cutoff locks', () => {
  const matches: AttendanceMatch[] = [
    candidate('pre-cutoff', '2026-08-07'),
    candidate('exact-cutoff', '2026-08-08'),
    candidate('post-cutoff', '2026-08-09'),
    {...candidate('cancelled', '2026-08-09'), status: 'Cancelled'},
    candidate('future', '2026-08-10'),
  ];
  const filtered = filterSnapshotCandidateMatches(
    matches,
    new Date('2026-08-08T19:00:00Z'),
    new Date('2026-08-09T20:00:00Z'),
  );
  assert.deepEqual(filtered.map((match) => match.id), ['exact-cutoff', 'post-cutoff']);
});

test('attendance actor team comes from active season membership rather than player directory assignment', () => {
  const resolved = resolveAttendanceActor(
    {
      id: 'profile-1',
      status: 'Approved',
      role: 'Player',
      player_id: 'player-1',
      captain_team_id: null,
    },
    {id: 'player-1', name: 'Player One', active: true},
    {team_id: 'season-team'},
  );

  assert.equal(resolved.teamId, 'season-team');
  assert.equal(resolved.playerId, 'player-1');
});

test('missing active membership leaves an otherwise active player ineligible', () => {
  const resolved = resolveAttendanceActor(
    {
      id: 'profile-1',
      status: 'Approved',
      role: 'Player',
      player_id: 'player-1',
      captain_team_id: null,
    },
    {id: 'player-1', name: 'Player One', active: true},
    null,
  );

  assert.equal(resolved.teamId, null);
});

test('team attendance includes only active players with active season membership', () => {
  const members = buildTeamAttendanceMembers(
    'team-home',
    [{player_id: 'member-playing'}, {player_id: 'member-unconfirmed'}],
    [
      {id: 'directory-only', name: 'Directory Only', active: true},
      {id: 'member-playing', name: 'Playing Member', active: true},
      {id: 'member-unconfirmed', name: 'Unconfirmed Member', active: true},
      {id: 'inactive-member', name: 'Inactive Member', active: false},
    ],
    [{player_id: 'member-playing', status: 'Playing'}],
  );

  assert.deepEqual(members, [
    {playerId: 'member-playing', playerName: 'Playing Member', teamId: 'team-home', status: 'Playing'},
    {playerId: 'member-unconfirmed', playerName: 'Unconfirmed Member', teamId: 'team-home', status: 'Unconfirmed'},
  ]);
});

function candidate(id: string, date: string): AttendanceMatch {
  return {
    id,
    seasonId: 'season-1',
    date,
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    status: 'Scheduled',
  };
}
