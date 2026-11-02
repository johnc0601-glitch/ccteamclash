import assert from 'node:assert/strict';
import test from 'node:test';
import {ResultsService} from '@/domain/results/ResultsService';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {ScheduleService} from '@/domain/schedule/ScheduleService';
import type {SeasonService} from '@/domain/season/SeasonService';
import type {Team} from '@/models/Team';
import type {TeamService} from '@/services/TeamService';
import {StandingsService} from '@/services/standings/StandingsService';
import {MockResultsRepository} from '@/test-fixtures/MockResultsRepository';

const MATCHES: Match[] = [
  match('match-1', 'round-1', 'team-a', 'team-b'),
  match('match-2', 'round-2', 'team-c', 'team-d'),
  match('match-3', 'round-2', 'team-a', 'team-c'),
  match('match-4', 'round-3', 'team-e', 'team-f'),
  match('match-5', 'round-3', 'team-b', 'team-d'),
];

function createContext(extraMatches: Match[] = [], extraTeams: Team[] = []) {
  const matches = new Map([...MATCHES, ...extraMatches].map((entry) => [entry.id, entry]));
  const rounds = new Map<string, Round>([
    ['round-1', round('round-1', 1, 'October')],
    ['round-2', round('round-2', 2, 'November')],
    ['round-3', round('round-3', 3, 'December')],
  ]);
  const scheduleProvider = {
    getMatch: async (id: string) => matches.get(id),
    getRound: async (id: string) => rounds.get(id),
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
      ...extraTeams,
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
      pointsAvailable: alpha.pointsAvailable,
      pointsPercentage: alpha.pointsPercentage,
    },
    {
      rank: 1,
      games: 1,
      wins: 1,
      losses: 0,
      pointsFor: 10,
      pointsAgainst: 6,
      differential: 4,
      percentage: 1,
      pointsAvailable: 16,
      pointsPercentage: 0.625,
    },
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

test('standings rank by wins, then head-to-head, then points percentage', async () => {
  const {results, standings} = createContext();
  await results.publish('match-1', {homeScore: 10, awayScore: 5});
  await results.publish('match-2', {homeScore: 12, awayScore: 7});
  await results.publish('match-4', {homeScore: 21, awayScore: 10});
  await results.publish('match-5', {homeScore: 100, awayScore: 0});

  const entries = await standings.getSeasonStandings('season-1');
  assert.deepEqual(
    entries.slice(0, 4).map((entry) => entry.team.id),
    ['team-e', 'team-a', 'team-c', 'team-b'],
  );

  const emptyEntries = await createContext().standings.getSeasonStandings('season-1');
  assert.deepEqual(
    emptyEntries.map((entry) => entry.team.id),
    ['team-a', 'team-b', 'team-c', 'team-d', 'team-e', 'team-f'],
  );
});

test('head-to-head outranks points percentage for teams with equal wins', async () => {
  const {results, standings} = createContext();
  await results.publish('match-1', {homeScore: 9, awayScore: 8}); // A defeats B.
  await results.publish('match-3', {homeScore: 0, awayScore: 10}); // A loses to C.
  await results.publish('match-5', {homeScore: 100, awayScore: 0}); // B defeats D.

  const tied = (await standings.getSeasonStandings('season-1'))
    .filter((entry) => ['team-a', 'team-b'].includes(entry.team.id));
  assert.equal(tied[0].wins, tied[1].wins);
  assert.ok(tied[0].pointsPercentage < tied[1].pointsPercentage);
  assert.deepEqual(tied.map((entry) => entry.team.id), ['team-a', 'team-b']);
});

test('partial three-team head-to-head is not treated as a transitive sweep', async () => {
  const {results, standings} = createContext([
    match('match-6', 'round-2', 'team-b', 'team-c'),
    match('match-7', 'round-3', 'team-a', 'team-f'),
    match('match-8', 'round-3', 'team-c', 'team-e'),
  ]);
  await results.publish('match-1', {homeScore: 8, awayScore: 7}); // A beats B.
  await results.publish('match-6', {homeScore: 8, awayScore: 7}); // B beats C.
  await results.publish('match-7', {homeScore: 0, awayScore: 20}); // A loses.
  await results.publish('match-8', {homeScore: 19, awayScore: 1}); // C wins.

  const tied = (await standings.getSeasonStandings('season-1'))
    .filter((entry) => ['team-a', 'team-b', 'team-c'].includes(entry.team.id));
  assert.ok(tied.every((entry) => entry.wins === 1));
  assert.deepEqual(tied.map((entry) => entry.team.id), ['team-c', 'team-a', 'team-b']);
});

test('a team losing to every other team in a four-way wins tie is ranked last', async () => {
  const extraMatches: Match[] = [
    match('tie-1', 'round-1', 'team-a', 'team-d'),
    match('tie-2', 'round-1', 'team-b', 'team-d'),
    match('tie-3', 'round-1', 'team-c', 'team-d'),
    match('tie-4', 'round-2', 'team-a', 'team-e'),
    match('tie-5', 'round-2', 'team-a', 'team-f'),
    match('tie-6', 'round-2', 'team-b', 'team-e'),
    match('tie-7', 'round-2', 'team-b', 'team-f'),
    match('tie-8', 'round-2', 'team-c', 'team-e'),
    match('tie-9', 'round-2', 'team-c', 'team-f'),
    match('tie-10', 'round-3', 'team-d', 'team-e'),
    match('tie-11', 'round-3', 'team-d', 'team-f'),
    match('tie-12', 'round-3', 'team-d', 'team-g'),
  ];
  const {results, standings} = createContext(extraMatches, [team('team-g', 'Golf')]);

  for (const id of ['tie-1', 'tie-2', 'tie-3']) {
    await results.publish(id, {homeScore: 9, awayScore: 8}); // D loses to A/B/C.
  }
  for (const id of ['tie-4', 'tie-5', 'tie-6', 'tie-7', 'tie-8', 'tie-9']) {
    await results.publish(id, {homeScore: 9, awayScore: 8});
  }
  for (const id of ['tie-10', 'tie-11', 'tie-12']) {
    await results.publish(id, {homeScore: 29, awayScore: 1}); // D wins elsewhere.
  }

  const tied = (await standings.getSeasonStandings('season-1'))
    .filter((entry) => ['team-a', 'team-b', 'team-c', 'team-d'].includes(entry.team.id));
  assert.ok(tied.every((entry) => entry.wins === 3));
  assert.ok(tied.find((entry) => entry.team.id === 'team-d')!.pointsPercentage > tied[0].pointsPercentage);
  assert.equal(tied.at(-1)?.team.id, 'team-d');
});

test('total wins outrank win percentage when teams have played different numbers of matches', async () => {
  const {results, standings} = createContext([
    match('extra-cf', 'round-3', 'team-f', 'team-c'),
  ]);
  await results.publish('match-2', {homeScore: 10, awayScore: 5}); // C wins against D.
  await results.publish('match-3', {homeScore: 5, awayScore: 10}); // C wins against A.
  await results.publish('extra-cf', {homeScore: 10, awayScore: 5}); // C loses to F.
  await results.publish('match-4', {homeScore: 10, awayScore: 5}); // E wins against F.

  const entries = await standings.getSeasonStandings('season-1');
  const charlie = entries.find((entry) => entry.team.id === 'team-c')!;
  const echo = entries.find((entry) => entry.team.id === 'team-e')!;
  assert.equal(charlie.wins, 2);
  assert.equal(echo.wins, 1);
  assert.ok(charlie.winningPercentage < echo.winningPercentage);
  assert.ok(charlie.rank < echo.rank);
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
    && entry.pointsAvailable === 0
    && entry.pointsPercentage === 0
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


function round(id: string, number: number, name: string): Round {
  return {
    id,
    scheduleId: 'schedule-1',
    seasonId: 'season-1',
    number,
    name,
    date: `2026-${String(number + 9).padStart(2, '0')}-03`,
    published: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
