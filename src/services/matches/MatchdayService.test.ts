import assert from 'node:assert/strict';
import test from 'node:test';
import type {Course} from '@/domain/course/Course';
import type {LaunchPlayer, LaunchTeam} from '@/domain/launch/LaunchData';
import type {Match} from '@/domain/schedule/Match';
import type {PublicScheduleEvent} from '@/domain/schedule/ScheduleService';
import {
  getCaptainMatchIds,
  resolveMatchday,
  resolveMatchdayLifecycle,
  resolveMatchdayScoreboard,
} from '@/services/matches/MatchdayService';

const match: Match = {
  id: 'match-1',
  roundId: 'round-1',
  seasonId: 'season-1',
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
  courseId: 'course-1',
  date: '2026-08-08',
  time: '10:00',
  status: 'Scheduled',
  notes: '',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const event: PublicScheduleEvent = {
  id: match.id,
  href: `/matches/${match.id}`,
  date: 'Saturday, August 8',
  time: '10:00 AM',
  course: 'Old course display name',
  directionsUrl: '',
  home: 'Old home display name',
  away: 'Old away display name',
  homeTeamId: 'team-home',
  awayTeamId: 'team-away',
  dateTime: new Date('2026-08-08T10:00:00'),
  bucket: 'upcoming',
  status: 'Scheduled',
};

const teams: LaunchTeam[] = [
  launchTeam('team-home', 'Renamed Home'),
  launchTeam('team-away', 'Renamed Away', ''),
  launchTeam('team-other', 'Unrelated Team'),
];

const courses: Course[] = [{
  id: 'course-1',
  name: 'Renamed Course',
  city: 'Wilmington',
  state: 'NC',
  address: '',
  mapUrl: '',
  udiscUrl: '',
  photoUrl: '',
  description: '',
  homeTeamId: null,
  active: true,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}];

test('resolves teams, players, and courses only by stable IDs after display-name changes', () => {
  const players = Array.from({length: 14}, (_, index) => launchPlayer(
    `away-${index}`,
    `Away Player ${String(index).padStart(2, '0')}`,
    'team-away',
  ));
  players.push(launchPlayer('home-1', 'Home Player', 'team-home'));

  const resolved = resolveMatchday(event, match, teams, players, courses, false);

  assert.ok(resolved);
  assert.equal(resolved.homeTeam.name, 'Renamed Home');
  assert.equal(resolved.awayTeam.name, 'Renamed Away');
  assert.equal(resolved.courseDetails?.name, 'Renamed Course');
  assert.equal(resolved.awayTeam.roster.length, 14);
  assert.equal(resolved.homeTeam.roster.length, 1);
});

test('supports a missing logo without changing team identity', () => {
  const resolved = resolveMatchday(event, match, teams, [], courses, false);
  assert.ok(resolved);
  assert.equal(resolved.awayTeam.id, 'team-away');
  assert.equal(resolved.awayTeam.logo, '');
});

test('does not rediscover a missing course by its display name', () => {
  const resolved = resolveMatchday(event, match, teams, [], [], false);
  assert.ok(resolved);
  assert.equal(resolved.courseDetails, undefined);
});

test('rejects incomplete match identity data', () => {
  assert.equal(resolveMatchday(event, {...match, courseId: null}, teams, [], courses, false), undefined);
  assert.equal(resolveMatchday(event, {...match, awayTeamId: null}, teams, [], courses, false), undefined);
});

test('uses only current Patch 1 lifecycle states', () => {
  assert.equal(resolveMatchdayLifecycle('Scheduled', false), 'Scheduled');
  assert.equal(resolveMatchdayLifecycle('Completed', false), 'Scheduled');
  assert.equal(resolveMatchdayLifecycle('Postponed', false), 'Postponed');
  assert.equal(resolveMatchdayLifecycle('Cancelled', false), 'Cancelled');
  assert.equal(resolveMatchdayLifecycle('Rain Delay', false), 'Rain Delay');
  assert.equal(resolveMatchdayLifecycle('Scheduled', true), 'Completed');
});

test('returns only matches involving the captain stable team ID', () => {
  const unrelated = {
    ...event,
    id: 'match-2',
    homeTeamId: 'team-other',
    awayTeamId: 'another-team',
  };
  assert.deepEqual(getCaptainMatchIds([event, unrelated], 'team-away'), ['match-1']);
});

test('shows a pending scoreboard when no published result exists', () => {
  const resolved = resolveMatchday(event, match, teams, [], courses, false);
  assert.ok(resolved);
  assert.deepEqual(resolveMatchdayScoreboard(resolved, undefined), {
    heading: 'Scoreboard pending',
    detail: 'Official results will appear after commissioner review.',
  });
});

test('shows the published away and home final score', () => {
  const resolved = resolveMatchday(event, match, teams, [], courses, true);
  assert.ok(resolved);
  assert.deepEqual(resolveMatchdayScoreboard(resolved, {
    matchId: match.id,
    homeScore: 8,
    awayScore: 10,
    status: 'Published',
    publishedAt: '2026-08-08T18:00:00.000Z',
    reopenedAt: null,
    createdAt: '2026-08-08T18:00:00.000Z',
    updatedAt: '2026-08-08T18:00:00.000Z',
  }), {
    heading: '10 – 8',
    detail: 'Renamed Away at Renamed Home · Final',
  });
});

function launchTeam(id: string, name: string, logo = '/logo.svg'): LaunchTeam {
  return {
    id,
    name,
    shortName: name,
    logo,
    active: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

function launchPlayer(id: string, name: string, currentTeamId: string): LaunchPlayer {
  return {
    id,
    name,
    gender: 'Unknown',
    pdgaNumber: '',
    pdgaRating: null,
    currentTeamId,
    homeArea: '',
    active: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };
}
