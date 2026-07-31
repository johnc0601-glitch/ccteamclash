import assert from 'node:assert/strict';
import test from 'node:test';
import {MockResultsRepository} from '@/domain/results/ResultsRepository';
import {ResultsService} from '@/domain/results/ResultsService';
import type {Match} from '@/domain/schedule/Match';
import type {ScheduleService} from '@/domain/schedule/ScheduleService';
import type {SeasonService} from '@/domain/season/SeasonService';
import type {Team} from '@/models/Team';
import type {TeamService} from '@/services/TeamService';
import {StandingsService} from '@/services/standings/StandingsService';

const MATCHES: Match[] = [
  match('match-1', 'round-1', 'team-a', 'team-b'),
  match('match-2', 'round-2', 'team-c', 'team-d'),
  match('match-3', 'round-2', 'team-a', 'team-c'),
  match('match-4', 'round-3', 'team-e', 'team-f'),
  match('match-5', 'round-3', 'team-b', 'team-d'),
];

function createContext() {
  const matches = new Map(MATCHES.map((entry) => [entry.id, entry]));
  const scheduleProvider = {
    getMatch: async (id: string) => matches.get(id),
  };
  const results = new ResultsService(
    new MockResultsRepository(),
    scheduleProvider as never,
  );
  const teams = {
    getAll: async () => [
      team('team-a', 'Alpha'),
      team('team-b', 'Bravo'),
      team('team-c', 'Charlie'),
      team('team-d', 'Delta'),
      team('team-e', 'Echo'),
      team('team-f', 'Foxtrot'),
    ],
  } as unknown as TeamService;
  const schedules = scheduleProvider as unknown as ScheduleService;
  const seasons = {
    getActive: async () => ({
      id: 'season-1',
      name: 'Season One',
      year: 2026,
      description: '',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      registrationOpen: false,
      active: true,
      published: true,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  } as unknown as SeasonService;
  return {
    results,
    standings: new StandingsService(teams, results, schedules, seasons),
  };
}

test('standings calculate records and points after one published result', async () => {
  const {results, standings} = createContext();
  await results.publish('match-1', {homeScore: 10, awayScore: 6});

  const entries = await standings.getSeasonStandings('season-1');
  const alpha = entries.find((entry) => entry.team.id === 'team-a');
  const bravo = entries.find((entry) => entry.team.id === 'team-b');
  assert.deepEqual(
    alpha && {
      rank: alpha.rank,
      games: alpha.gamesPlayed,
      wins: alpha.wins,
      losses: alpha.losses,
      pointsFor: alpha.pointsFor,
      pointsAgainst: alpha.pointsAgainst,
      differential: alpha.pointDifferential,
      percentage: alpha.winningPercentage,
    },
    {rank: 1, games: 1, wins: 1, losses: 0, pointsFor: 10, pointsAgainst: 6, differential: 4, percentage: 1},
  );
  assert.equal(bravo?.losses, 1);
});

test('standings aggregate published results across multiple rounds', async () => {
  const {results, standings} = createContext();
  await results.publish('match-1', {homeScore: 10, awayScore: 6});
  await results.publish('match-2', {homeScore: 7, awayScore: 8});
  await results.publish('match-3', {homeScore: 5, awayScore: 9});

  const entries = await standings.getSeasonStandings('season-1');
  const alpha = entries.find((entry) => entry.team.id === 'team-a');
  const charlie = entries.find((entry) => entry.team.id === 'team-c');
  assert.equal(alpha?.gamesPlayed, 2);
  assert.equal(alpha?.pointsFor, 15);
  assert.equal(charlie?.gamesPlayed, 2);
  assert.equal(charlie?.wins, 1);
});

test('standings apply winning percentage, differential, points for, then deterministic ordering', async () => {
  const {results, standings} = createContext();
  await results.publish('match-1', {homeScore: 10, awayScore: 5});
  await results.publish('match-2', {homeScore: 12, awayScore: 7});
  await results.publish('match-4', {homeScore: 20, awayScore: 10});
  await results.publish('match-5', {homeScore: 100, awayScore: 0});

  const entries = await standings.getSeasonStandings('season-1');
  assert.deepEqual(
    entries.slice(0, 4).map((entry) => entry.team.id),
    ['team-e', 'team-c', 'team-a', 'team-b'],
  );

  const emptyEntries = await createContext().standings.getSeasonStandings('season-1');
  assert.deepEqual(
    emptyEntries.map((entry) => entry.team.id),
    ['team-a', 'team-b', 'team-c', 'team-d', 'team-e', 'team-f'],
  );
});

test('draft and reopened results are excluded until republished', async () => {
  const {results, standings} = createContext();
  await results.saveDraft('match-1', {homeScore: 10, awayScore: 6});
  assert.ok((await standings.getSeasonStandings('season-1')).every((entry) => entry.gamesPlayed === 0));

  await results.publish('match-1', {homeScore: 10, awayScore: 6});
  assert.equal((await standings.getTeamStanding('team-a', 'season-1'))?.gamesPlayed, 1);

  await results.reopen('match-1');
  assert.equal((await standings.getTeamStanding('team-a', 'season-1'))?.gamesPlayed, 0);

  await results.publish('match-1', {homeScore: 11, awayScore: 6});
  assert.equal((await standings.getTeamStanding('team-a', 'season-1'))?.pointsFor, 11);
});

test('empty seasons include every active team with zero totals', async () => {
  const {standings} = createContext();
  const entries = await standings.getSeasonStandings('empty-season');
  assert.equal(entries.length, 6);
  assert.ok(entries.every((entry) =>
    entry.gamesPlayed === 0
    && entry.wins === 0
    && entry.losses === 0
    && entry.winningPercentage === 0,
  ));
});

function match(
  id: string,
  roundId: string,
  homeTeamId: string,
  awayTeamId: string,
): Match {
  return {
    id,
    roundId,
    seasonId: 'season-1',
    homeTeamId,
    awayTeamId,
    courseId: 'course-1',
    date: '2026-07-18',
    time: '09:00',
    status: 'Scheduled',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function team(id: string, name: string): Team {
  return {
    id,
    name,
    shortName: name.slice(0, 3),
    city: '',
    state: 'NC',
    captain: '',
    homeCourse: '',
    logo: '',
    primaryColor: '',
    secondaryColor: '',
    website: '',
    facebook: '',
    description: '',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
