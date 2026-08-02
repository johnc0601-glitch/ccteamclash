import assert from 'node:assert/strict';
import test from 'node:test';
import type {AttendanceMatch} from '@/domain/match-roster/MatchAttendance';
import {
  filterSnapshotCandidateMatches,
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

function candidate(id: string, date: string): AttendanceMatch {
  return {
    id,
    date,
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    status: 'Scheduled',
  };
}
