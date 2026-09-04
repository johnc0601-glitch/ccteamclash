import assert from 'node:assert/strict';
import test from 'node:test';
import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {MatchLogisticsService} from '@/domain/schedule/MatchLogisticsService';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';

const SEASON_ID = 'coastal-clash-2026-2027-7806a8e2-6755-4310-ad2b-7b2c761752c9';

async function createFixture() {
  const schedules = new MockScheduleRepository();
  const seasons = new SeasonService(new MockSeasonRepository());
  const courses = new MockCourseRepository();
  const service = new MatchLogisticsService(schedules, seasons, courses);

  await schedules.createSchedule({
    id: 'logistics-test-schedule',
    seasonId: SEASON_ID,
    name: 'Logistics Test Schedule',
    description: '',
    published: true,
    createdAt: '2026-09-04T12:00:00.000Z',
    updatedAt: '2026-09-04T12:00:00.000Z',
  });
  await schedules.createRound({
    id: 'logistics-test-round',
    scheduleId: 'logistics-test-schedule',
    seasonId: SEASON_ID,
    number: 1,
    name: 'Round 1',
    date: '2026-10-03',
    published: true,
    createdAt: '2026-09-04T12:00:00.000Z',
    updatedAt: '2026-09-04T12:00:00.000Z',
  });
  await schedules.createMatch({
    id: 'logistics-test-match',
    roundId: 'logistics-test-round',
    seasonId: SEASON_ID,
    homeTeamId: 'riptide',
    awayTeamId: 'beast-mode',
    courseId: 'splinter-city',
    date: '2026-10-03',
    time: '09:00',
    status: 'Scheduled',
    notes: '',
    createdAt: '2026-09-04T12:00:00.000Z',
    updatedAt: '2026-09-04T12:00:00.000Z',
  });

  return {service, schedules};
}

test('published match logistics can change without changing matchup identity or round', async () => {
  const {service, schedules} = await createFixture();

  const result = await service.update('logistics-test-match', {
    courseId: 'castle-hayne-park',
    date: '2026-10-10',
    time: '10:30',
    status: 'Postponed',
    notes: 'Moved for weather.',
  });

  assert.equal(result.ok, true);
  const stored = await schedules.getMatch('logistics-test-match');
  assert.equal(stored?.homeTeamId, 'riptide');
  assert.equal(stored?.awayTeamId, 'beast-mode');
  assert.equal(stored?.roundId, 'logistics-test-round');
  assert.equal(stored?.courseId, 'castle-hayne-park');
  assert.equal(stored?.date, '2026-10-10');
  assert.equal(stored?.time, '10:30');
  assert.equal(stored?.status, 'Postponed');
  assert.equal(stored?.notes, 'Moved for weather.');

  const round = await schedules.getRound('logistics-test-round');
  assert.equal(round?.date, '2026-10-03');
});

test('recorded results lock only the affected match logistics', async () => {
  const {service, schedules} = await createFixture();
  schedules.markResultRecorded('logistics-test-match');

  const result = await service.update('logistics-test-match', {
    courseId: 'splinter-city',
    date: '2026-10-10',
    time: '09:00',
    status: 'Completed',
    notes: '',
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /recorded results/i);
});

test('match logistics date may differ from round date but must remain inside the season', async () => {
  const {service} = await createFixture();

  const valid = await service.update('logistics-test-match', {
    courseId: 'splinter-city',
    date: '2027-02-13',
    time: '09:00',
    status: 'Scheduled',
    notes: '',
  });
  assert.equal(valid.ok, true);

  const invalid = await service.update('logistics-test-match', {
    courseId: 'splinter-city',
    date: '2027-04-01',
    time: '09:00',
    status: 'Scheduled',
    notes: '',
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.fieldErrors?.date, 'Match date must fall within the season date range.');
});
