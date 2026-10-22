import assert from 'node:assert/strict';
import test from 'node:test';
import {getLiveScoringHref} from './LiveScoringLink';

const withinHours = new Date('2026-10-17T14:00:00Z');

const beastAtRiptide = {
  id: 'beast-mode-vs-riptide-3ed22cf9-623e-4c11-96a2-b0e6c42b7e0d',
  scheduledDate: '2026-10-17',
  awayTeamId: 'beast-mode',
  homeTeamId: 'riptide',
};

test('shows the verified TC Whiteboard feed on matchday before final publication', () => {
  assert.equal(getLiveScoringHref(beastAtRiptide, {today: '2026-10-17', hasPublishedResult: false, now: withinHours}),
    'https://tcwhiteboard.com/l/cctc/matches/f4m09qxvri1hredzcoafzbst/live');
});

test('hides the LIVE! link outside the match date', () => {
  assert.equal(getLiveScoringHref(beastAtRiptide, {today: '2026-10-16', hasPublishedResult: false, now: new Date('2026-10-16T14:00:00Z')}), undefined);
  assert.equal(getLiveScoringHref(beastAtRiptide, {today: '2026-10-18', hasPublishedResult: false, now: new Date('2026-10-18T14:00:00Z')}), undefined);
});

test('hides LIVE! as soon as final results are published', () => {
  assert.equal(getLiveScoringHref(beastAtRiptide, {today: '2026-10-17', hasPublishedResult: true, now: withinHours}), undefined);
});

test('refuses an incorrect matchup, swapped home and away, or moved date', () => {
  const options = {today: '2026-10-17', hasPublishedResult: false, now: withinHours};
  assert.equal(getLiveScoringHref({...beastAtRiptide, id: 'another-match'}, options), undefined);
  assert.equal(getLiveScoringHref({...beastAtRiptide, homeTeamId: 'beast-mode', awayTeamId: 'riptide'}, options), undefined);
  assert.equal(getLiveScoringHref({...beastAtRiptide, scheduledDate: '2026-10-24'}, {...options, today: '2026-10-24'}), undefined);
});

test('LIVE SCORES starts at 9 AM and ends at 6 PM Eastern on matchday', () => {
  const opts = (iso: string) => ({
    today: '2026-10-17', hasPublishedResult: false,
    now: new Date(iso),
  });
  assert.equal(getLiveScoringHref(beastAtRiptide, opts('2026-10-17T12:59:59Z')), undefined);
  assert.ok(getLiveScoringHref(beastAtRiptide, opts('2026-10-17T13:00:00Z')));
  assert.ok(getLiveScoringHref(beastAtRiptide, opts('2026-10-17T21:59:59Z')));
  assert.equal(getLiveScoringHref(beastAtRiptide, opts('2026-10-17T22:00:00Z')), undefined);
});
