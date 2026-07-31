import assert from 'node:assert/strict';
import test from 'node:test';
import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {SCHEDULE_IMPORT_SCHEMA_VERSION} from '@/domain/schedule/ScheduleImport';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {TeamService} from '@/services/TeamService';

function createService() {
  const repository = new MockScheduleRepository();
  const teamService = new TeamService(new MockTeamRepository());
  return {
    repository,
    teamService,
    service: new ScheduleService(
      repository,
      new SeasonService(new MockSeasonRepository()),
      teamService,
      new MockCourseRepository(),
      {allowRepeatedMatchups: true},
    ),
  };
}

test('schedule workflow imports, edits, publishes, and controls public visibility', async () => {
  const {service, repository, teamService} = createService();
  const existingSchedules = await repository.getSchedules();
  await Promise.all(existingSchedules
    .filter((schedule) => schedule.seasonId === 'summer-team-clash-2026')
    .map((schedule) => repository.deleteSchedule(schedule.id)));
  const teams = (await teamService.getAll()).filter((team) => team.active);
  assert.ok(teams.length >= 2);

  const imported = await service.importSchedule({
    schemaVersion: SCHEDULE_IMPORT_SCHEMA_VERSION,
    seasonId: 'summer-team-clash-2026',
    name: 'Integration Schedule',
    description: 'Focused schedule workflow verification.',
    rounds: [{
      number: 8,
      name: 'Integration Round',
      date: '2026-09-12',
      matches: [{
        homeTeamId: teams[0].id,
        awayTeamId: teams[1].id,
        courseId: 'castle-hayne-park',
        date: '2026-09-12',
        time: '09:00',
        status: 'Scheduled',
        notes: '',
      }],
    }],
  });
  assert.equal(imported.ok, true);
  if (!imported.ok) return;

  const [round] = await service.getRounds(imported.data.id);
  const [match] = await service.getMatches(round.id);
  const edited = await service.updateRoundWithMatches(round.id, {
    number: round.number,
    name: 'Edited Integration Round',
    date: '2026-09-19',
  }, [{
    id: match.id,
    input: {...match, date: '2026-09-19', time: '10:30'},
  }]);
  assert.equal(edited.ok, true);

  const beforePublish = await service.getPublishedEventById(match.id, new Date('2026-09-01'));
  assert.equal(beforePublish, undefined);

  const published = await service.publishSchedule(imported.data.id);
  assert.equal(published.ok, true);
  const visible = await service.getPublishedEventById(match.id, new Date('2026-09-01'));
  assert.equal(visible?.time, '10:30 AM');

  const forbiddenEdit = await service.updateMatch(match.id, {
    ...match,
    date: '2026-09-19',
    time: '11:00',
  });
  assert.equal(forbiddenEdit.ok, false);
  if (!forbiddenEdit.ok) {
    assert.match(forbiddenEdit.message, /Unpublish/);
  }

  const unpublished = await service.unpublishSchedule(imported.data.id);
  assert.equal(unpublished.ok, true);
  assert.equal(
    await service.getPublishedEventById(match.id, new Date('2026-09-01')),
    undefined,
  );
});

test('a season schedule is created implicitly once for manual building', async () => {
  const {service, repository} = createService();
  const existingSchedules = await repository.getSchedules();
  await Promise.all(existingSchedules
    .filter((schedule) => schedule.seasonId === 'summer-team-clash-2026')
    .map((schedule) => repository.deleteSchedule(schedule.id)));

  const first = await service.ensureSchedule('summer-team-clash-2026');
  const second = await service.ensureSchedule('summer-team-clash-2026');

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(second.data.id, first.data.id);
  assert.equal(
    (await repository.getSchedules())
      .filter((schedule) => schedule.seasonId === 'summer-team-clash-2026').length,
    1,
  );
});

test('commissioner import saves optional schedule details as an incomplete draft', async () => {
  const {service, repository, teamService} = createService();
  const existingSchedules = await repository.getSchedules();
  await Promise.all(existingSchedules
    .filter((schedule) => schedule.seasonId === 'summer-team-clash-2026')
    .map((schedule) => repository.deleteSchedule(schedule.id)));
  const teams = (await teamService.getAll()).filter((team) => team.active);

  const imported = await service.importSchedule({
    schemaVersion: SCHEDULE_IMPORT_SCHEMA_VERSION,
    seasonId: 'summer-team-clash-2026',
    name: 'Summer Team Clash 2026 Schedule',
    description: '',
    rounds: [{
      number: 1,
      name: 'Monthly Event',
      date: null,
      matches: [{
        homeTeamId: teams[0].id,
        awayTeamId: teams[1].id,
        courseId: null,
        date: null,
        time: null,
        status: 'Scheduled',
        notes: '',
      }],
    }],
  });

  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  const [round] = await service.getRounds(imported.data.id);
  const [match] = await service.getMatches(round.id);
  assert.equal(round.date, null);
  assert.equal(match.courseId, null);
  assert.equal(match.time, null);
  const publication = await service.publishSchedule(imported.data.id);
  assert.equal(publication.ok, false);
});

test('schedule import rejects unsupported schema versions before writing', async () => {
  const {service, repository} = createService();
  const before = await repository.getSchedules();
  const result = await service.importSchedule({
    schemaVersion: 2,
    seasonId: 'summer-team-clash-2026',
    name: 'Unsupported Import',
    description: '',
    rounds: [],
  } as never);
  assert.equal(result.ok, false);
  assert.equal((await repository.getSchedules()).length, before.length);
});

test('schedule import updates the season schedule in place and preserves playoff records', async () => {
  const {service, repository} = createService();
  const schedule = (await repository.getSchedules())
    .find((candidate) => candidate.seasonId === 'summer-team-clash-2026')!;
  await service.unpublishSchedule(schedule.id);

  const openingRound = (await repository.getRounds(schedule.id))
    .find((round) => round.id === 'summer-2026-round-1')!;
  const openingMatch = (await repository.getMatches(openingRound.id))
    .find((match) => match.id === 'summer-2026-r1-dark-ninjas')!;

  const imported = await service.importSchedule({
    schemaVersion: SCHEDULE_IMPORT_SCHEMA_VERSION,
    seasonId: schedule.seasonId,
    name: '2026 Schedule',
    description: '',
    rounds: [{
      number: 1,
      name: openingRound.name,
      date: '2026-07-19',
      matches: [{
        homeTeamId: openingMatch.homeTeamId,
        awayTeamId: openingMatch.awayTeamId,
        courseId: 'castle-hayne-park',
        date: '2026-07-19',
        time: '11:00',
        status: 'Scheduled',
        notes: 'Updated import.',
      }],
    }],
  });

  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  assert.equal(imported.data.id, schedule.id);
  assert.equal(
    (await repository.getSchedules()).filter((candidate) => candidate.seasonId === schedule.seasonId).length,
    1,
  );
  assert.equal((await repository.getRound(openingRound.id))?.date, '2026-07-19');
  assert.equal((await repository.getMatch(openingMatch.id))?.time, '11:00');
  assert.equal((await repository.getRound('summer-2026-draft-round-1'))?.scheduleId, schedule.id);
  assert.ok(await repository.getMatch('summer-2026-playoff-sf1'));
  assert.ok(await repository.getMatch('summer-2026-playoff-final'));
});

test('recorded results protect schedule structure from import replacement', async () => {
  const {service, repository} = createService();
  const schedule = (await repository.getSchedules())
    .find((candidate) => candidate.seasonId === 'summer-team-clash-2026')!;
  await service.unpublishSchedule(schedule.id);
  repository.markResultRecorded('summer-2026-r1-dark-ninjas');
  const roundIdsBefore = (await repository.getRounds(schedule.id)).map((round) => round.id);

  const imported = await service.importSchedule({
    schemaVersion: SCHEDULE_IMPORT_SCHEMA_VERSION,
    seasonId: schedule.seasonId,
    name: 'Replacement',
    description: '',
    rounds: [{
      number: 1,
      name: 'Replacement Event',
      date: '2026-08-01',
      matches: [{
        homeTeamId: 'dark-knights',
        awayTeamId: 'ninjas',
        courseId: 'castle-hayne-park',
        date: '2026-08-01',
        time: '09:00',
        status: 'Scheduled',
        notes: '',
      }],
    }],
  });

  assert.equal(imported.ok, false);
  if (!imported.ok) assert.match(imported.message, /recorded results/i);
  assert.deepEqual(
    (await repository.getRounds(schedule.id)).map((round) => round.id),
    roundIdsBefore,
  );
});
