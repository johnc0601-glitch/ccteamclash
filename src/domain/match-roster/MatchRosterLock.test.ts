import assert from 'node:assert/strict';
import test from 'node:test';
import type {AttendanceMatch} from '@/domain/match-roster/MatchAttendance';
import {
  getMatchAttendanceOpenAt,
  getMatchRosterLockAt,
  isMatchAttendanceOpen,
  isMatchRosterLocked,
} from '@/domain/match-roster/MatchRosterLock';

const match: AttendanceMatch = {
  id: 'match-friday-window',
  homeTeamId: 'home',
  awayTeamId: 'away',
  date: '2026-10-03',
  status: 'Scheduled',
};

test('attendance opens at Friday midnight Eastern before a Saturday match', () => {
  assert.equal(getMatchAttendanceOpenAt(match.date!)?.toISOString(), '2026-10-02T04:00:00.000Z');
  assert.equal(isMatchAttendanceOpen(match, new Date('2026-10-02T03:59:59.000Z')), false);
  assert.equal(isMatchAttendanceOpen(match, new Date('2026-10-02T04:00:00.000Z')), true);
});

test('attendance closes when the roster locks at 3 PM Eastern on match day', () => {
  assert.equal(getMatchRosterLockAt(match.date!)?.toISOString(), '2026-10-03T19:00:00.000Z');
  assert.equal(isMatchAttendanceOpen(match, new Date('2026-10-03T18:59:59.000Z')), true);
  assert.equal(isMatchAttendanceOpen(match, new Date('2026-10-03T19:00:00.000Z')), false);
  assert.equal(isMatchRosterLocked(match, new Date('2026-10-03T19:00:00.000Z')), true);
});
