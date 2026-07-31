import assert from 'node:assert/strict';
import test from 'node:test';
import {MockPlayoffRepository} from '@/domain/playoffs/PlayoffRepository';
import {PlayoffService} from '@/domain/playoffs/PlayoffService';
import {MockResultsRepository} from '@/domain/results/ResultsRepository';
import {ResultsService} from '@/domain/results/ResultsService';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';
import type {ScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import type {ScheduleService} from '@/domain/schedule/ScheduleService';
import type {Team} from '@/models/Team';
import type {TeamService} from '@/services/TeamService';
import type {StandingsService} from '@/services/standings';
import type {TeamStanding} from '@/services/standings/StandingsTypes';

const seasonId = 'season-1';
const playoffIds = ['sf-1', 'sf-2', 'championship'] as const;

test('generates one bracket from existing Schedule matches with the correct seeds', async () => {
  const fixture = await createFixture();
  const generated = await fixture.playoffs.generate(generateInput());

  assert.equal(generated.ok, true);
  assert.deepEqual(teamIds(fixture.schedule.matches.get('sf-1')), ['team-1', 'team-4']);
  assert.deepEqual(teamIds(fixture.schedule.matches.get('sf-2')), ['team-2', 'team-3']);
  assert.deepEqual(teamIds(fixture.schedule.matches.get('championship')), [null, null]);
  assert.equal((await fixture.playoffs.getBracket(seasonId, true)), undefined);

  const published = await fixture.playoffs.publish(seasonId);
  assert.equal(published.ok, true);
  assert.equal((await fixture.playoffs.getBracket(seasonId, true))?.games.length, 3);

  const duplicate = await fixture.playoffs.generate(generateInput());
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.message, 'A playoff bracket already exists for this season.');
});

test('rejects generation until every published regular-season match has a published result', async () => {
  const fixture = await createFixture({publishRegularResults: false});
  await fixture.results.publish('regular-1', {homeScore: 7, awayScore: 3});

  const generated = await fixture.playoffs.generate(generateInput());

  assert.equal(generated.ok, false);
  if (!generated.ok) {
    assert.equal(generated.message, 'Publish every regular-season result before generating playoffs.');
  }
});

test('advances semifinal winners into the existing championship match and determines the champion', async () => {
  const fixture = await createFixture();
  assert.equal((await fixture.playoffs.generate(generateInput())).ok, true);

  await fixture.results.publish('sf-1', {homeScore: 8, awayScore: 4});
  await fixture.results.publish('sf-2', {homeScore: 2, awayScore: 6});
  const advanced = await fixture.playoffs.getBracket(seasonId);

  assert.deepEqual(teamIds(fixture.schedule.matches.get('championship')), ['team-1', 'team-3']);
  assert.deepEqual(
    advanced?.games.filter((game) => game.stage === 'Semifinal').map((game) => game.winnerTeamId),
    ['team-1', 'team-3'],
  );

  await fixture.results.publish('championship', {homeScore: 9, awayScore: 5});
  const completed = await fixture.playoffs.getBracket(seasonId);
  assert.equal(completed?.bracket.championTeamId, 'team-1');
  assert.equal(completed?.champion?.name, 'Team 1');
});

test('reopening a semifinal removes downstream advancement until that result is republished', async () => {
  const fixture = await createFixture();
  await fixture.playoffs.generate(generateInput());
  await fixture.results.publish('sf-1', {homeScore: 8, awayScore: 4});
  await fixture.results.publish('sf-2', {homeScore: 2, awayScore: 6});
  await fixture.playoffs.getBracket(seasonId);
  await fixture.results.publish('championship', {homeScore: 9, awayScore: 5});
  assert.equal((await fixture.playoffs.getBracket(seasonId))?.bracket.championTeamId, 'team-1');

  await fixture.results.reopen('sf-1');
  const recalculated = await fixture.playoffs.getBracket(seasonId);

  assert.deepEqual(teamIds(fixture.schedule.matches.get('championship')), [null, null]);
  assert.equal(recalculated?.bracket.championTeamId, null);
  assert.equal(await fixture.results.getPublishedResult('championship'), undefined);
  assert.equal((await fixture.results.getResult('championship'))?.status, 'Draft');
});

async function createFixture(options: {publishRegularResults?: boolean} = {}) {
  const teams = [1, 2, 3, 4].map(makeTeam);
  const schedule = new FakeSchedule();
  const results = new ResultsService(
    new MockResultsRepository(),
    schedule as unknown as ScheduleRepository,
  );
  const standings = {
    getSeasonStandings: async () => teams.map(makeStanding),
  } as unknown as StandingsService;
  const teamService = {
    getAll: async () => teams,
  } as unknown as TeamService;
  const playoffs = new PlayoffService(
    new MockPlayoffRepository(),
    standings,
    schedule as unknown as ScheduleService,
    results,
    teamService,
  );
  if (options.publishRegularResults !== false) {
    await results.publish('regular-1', {homeScore: 7, awayScore: 3});
    await results.publish('regular-2', {homeScore: 4, awayScore: 6});
  }
  return {playoffs, results, schedule};
}

class FakeSchedule {
  readonly matches = new Map<string, Match>([
    ['regular-1', makeMatch('regular-1', 'regular-round', 'team-1', 'team-2')],
    ['regular-2', makeMatch('regular-2', 'regular-round', 'team-3', 'team-4')],
    ['sf-1', makeMatch('sf-1', 'playoff-round', null, null)],
    ['sf-2', makeMatch('sf-2', 'playoff-round', null, null)],
    ['championship', makeMatch('championship', 'final-round', null, null)],
  ]);
  private readonly schedules: Schedule[] = [{
    id: 'regular-schedule',
    seasonId,
    name: 'Regular season',
    description: '',
    published: true,
    createdAt: '',
    updatedAt: '',
  }];
  private readonly rounds: Round[] = [{
    id: 'regular-round',
    scheduleId: 'regular-schedule',
    seasonId,
    number: 1,
    name: 'Regular season',
    date: '2026-07-01',
    published: true,
    createdAt: '',
    updatedAt: '',
  }];

  async getMatch(id: string) {
    const match = this.matches.get(id);
    return match ? {...match} : undefined;
  }

  async getSchedules() {
    return this.schedules.map((schedule) => ({...schedule}));
  }

  async getRounds(scheduleId: string) {
    return this.rounds.filter((round) => round.scheduleId === scheduleId).map((round) => ({...round}));
  }

  async getMatches(roundId: string) {
    return [...this.matches.values()].filter((match) => match.roundId === roundId).map((match) => ({...match}));
  }

  async assignPlayoffTeams(id: string, homeTeamId: string | null, awayTeamId: string | null) {
    const match = this.matches.get(id);
    if (!match) return {ok: false as const, message: 'Match not found.'};
    const updated = {...match, homeTeamId, awayTeamId, updatedAt: new Date().toISOString()};
    this.matches.set(id, updated);
    return {ok: true as const, data: {...updated}};
  }
}

function makeMatch(
  id: string,
  roundId: string,
  homeTeamId: string | null,
  awayTeamId: string | null,
): Match {
  return {
    id,
    roundId,
    seasonId,
    homeTeamId,
    awayTeamId,
    courseId: null,
    date: null,
    time: '',
    status: 'Scheduled',
    notes: '',
    createdAt: '',
    updatedAt: '',
  };
}

function makeTeam(number: number): Team {
  return {
    id: `team-${number}`,
    name: `Team ${number}`,
    shortName: `T${number}`,
    city: '',
    state: '',
    captain: '',
    homeCourse: '',
    logo: '',
    primaryColor: '',
    secondaryColor: '',
    website: '',
    facebook: '',
    description: '',
    active: true,
    createdAt: '',
    updatedAt: '',
  };
}

function makeStanding(team: Team, index: number): TeamStanding {
  return {
    rank: index + 1,
    team,
    gamesPlayed: 3,
    wins: 3 - index,
    losses: index,
    pointsFor: 30 - index,
    pointsAgainst: 10 + index,
    pointDifferential: 20 - index * 2,
    winningPercentage: (3 - index) / 3,
  };
}

function generateInput() {
  return {
    seasonId,
    semifinal1MatchId: playoffIds[0],
    semifinal2MatchId: playoffIds[1],
    championshipMatchId: playoffIds[2],
  };
}

function teamIds(match: Match | undefined) {
  return [match?.homeTeamId ?? null, match?.awayTeamId ?? null];
}
