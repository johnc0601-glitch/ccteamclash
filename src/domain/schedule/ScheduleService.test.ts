import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {TeamService} from '@/services/TeamService';
import assert from 'node:assert/strict';
import test from 'node:test';

function createService() {
  const teamService = new TeamService(new MockTeamRepository());
  return {
    service: new ScheduleService(
      new MockScheduleRepository(),
      new SeasonService(new MockSeasonRepository()),
      teamService,
      new MockCourseRepository(),
      {allowRepeatedMatchups: true},
    ),
    teamService,
  };
}

test('ScheduleService updates a round and its dynamic match set together', async () => {
  const {service, teamService} = createService();
  await service.unpublishSchedule('summer-2026-championship');
  const teams = (await teamService.getAll()).filter((team) => team.active).slice(0, 4);
  assert.equal(teams.length, 4);

  const roundId = 'summer-2026-playoff-championship-round';
  const originalMatches = await service.getMatches(roundId);
  assert.equal(originalMatches.length, 1);

  const firstUpdate = await service.updateRoundWithMatches(roundId, {
    number: 4,
    name: 'Championship',
    date: '2026-09-26',
  }, [{
    id: originalMatches[0].id,
    input: {
      homeTeamId: teams[0].id,
      awayTeamId: teams[1].id,
      courseId: 'castle-hayne-park',
      date: '2026-09-26',
      time: '09:30',
      status: 'Scheduled',
      notes: originalMatches[0].notes,
    },
  }]);
  assert.equal(firstUpdate.ok, true);

  const createdMatch = await service.createMatch(roundId, {
    homeTeamId: teams[2].id,
    awayTeamId: teams[3].id,
    courseId: 'castle-hayne-park',
    date: '2026-09-26',
    time: '10:30',
    status: 'Scheduled',
    notes: '',
  });
  assert.equal(createdMatch.ok, true);
  if (!createdMatch.ok) return;

  const matches = await service.getMatches(roundId);
  const saved = await service.updateRoundWithMatches(roundId, {
    number: 4,
    name: 'Championship Round',
    date: '2026-09-20',
  }, matches.map((match, index) => ({
    id: match.id,
    input: {
      homeTeamId: index === 0 ? teams[2].id : teams[0].id,
      awayTeamId: index === 0 ? teams[3].id : teams[1].id,
      courseId: 'northeast-creek-park',
      date: match.date,
      time: index === 0 ? '10:00' : '11:30',
      status: match.status,
      notes: match.notes,
    },
  })));

  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.data.round.name, 'Championship Round');
  assert.equal(saved.data.round.date, '2026-09-20');
  assert.equal(saved.data.matches.length, 2);
  assert.deepEqual(
    saved.data.matches.map((match) => match.id).sort(),
    matches.map((match) => match.id).sort(),
  );
  assert.ok(saved.data.matches.every((match) =>
    match.date === '2026-09-20' && match.courseId === 'northeast-creek-park',
  ));
});

test('ScheduleService rejects a stale round match set', async () => {
  const {service} = createService();
  await service.unpublishSchedule('summer-2026-championship');
  const result = await service.updateRoundWithMatches('summer-2026-draft-round-1', {
    number: 3,
    name: 'Semifinals',
    date: '2026-08-22',
  }, []);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, 'The round matches changed. Close the editor and try again.');
  }
});
