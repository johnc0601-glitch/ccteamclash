import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dateKeyInTimeZone,
  decideMatchdayIntroPlayback,
  parseMatchdayIntroQuery,
} from './matchdayIntroDecision.ts';

test('matchday intro requires a Matchday entry link and the scheduled Eastern date', () => {
  assert.equal(decideMatchdayIntroPlayback({
    matchDate: '2026-10-03',
    lifecycle: 'Scheduled',
    now: new Date('2026-10-03T13:00:00.000Z'),
    queryOverride: 'link',
  }), false);

  assert.equal(decideMatchdayIntroPlayback({
    matchDate: '2026-10-03',
    lifecycle: 'Scheduled',
    now: new Date('2026-10-03T13:00:00.000Z'),
    queryOverride: 'link',
  }), true);

  assert.equal(decideMatchdayIntroPlayback({
    matchDate: '2026-10-03',
    lifecycle: 'Scheduled',
    now: new Date('2026-10-02T23:00:00.000Z'),
    queryOverride: 'link',
  }), false);
});

test('Eastern date boundary is used instead of server UTC date', () => {
  assert.equal(dateKeyInTimeZone(
    new Date('2026-10-03T03:30:00.000Z'),
    'America/New_York',
  ), '2026-10-02');

  assert.equal(dateKeyInTimeZone(
    new Date('2026-10-03T04:30:00.000Z'),
    'America/New_York',
  ), '2026-10-03');
});

test('cancelled and postponed matches do not auto-play', () => {
  for (const lifecycle of ['Cancelled', 'Postponed'] as const) {
    assert.equal(decideMatchdayIntroPlayback({
      matchDate: '2026-10-03',
      lifecycle,
      now: new Date('2026-10-03T13:00:00.000Z'),
    }), false);
  }
});

test('completed matches still play for visitors on match day', () => {
  assert.equal(decideMatchdayIntroPlayback({
    matchDate: '2026-10-03',
    lifecycle: 'Completed',
    now: new Date('2026-10-03T22:00:00.000Z'),
    queryOverride: 'link',
  }), true);
});

test('preview query overrides can force play or skip', () => {
  assert.equal(parseMatchdayIntroQuery('matchday'), 'link');
  assert.equal(parseMatchdayIntroQuery('link'), 'link');
  assert.equal(parseMatchdayIntroQuery('1'), 'preview');
  assert.equal(parseMatchdayIntroQuery('play'), 'preview');
  assert.equal(parseMatchdayIntroQuery('preview'), 'preview');
  assert.equal(parseMatchdayIntroQuery('0'), 'skip');
  assert.equal(parseMatchdayIntroQuery('skip'), 'skip');
  assert.equal(parseMatchdayIntroQuery(undefined), null);

  assert.equal(decideMatchdayIntroPlayback({
    matchDate: '2026-10-03',
    lifecycle: 'Cancelled',
    now: new Date('2026-09-27T12:00:00.000Z'),
    queryOverride: 'preview',
  }), true);

  assert.equal(decideMatchdayIntroPlayback({
    matchDate: '2026-10-03',
    lifecycle: 'Scheduled',
    now: new Date('2026-10-03T12:00:00.000Z'),
    queryOverride: 'skip',
  }), false);
});
