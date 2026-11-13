import assert from 'node:assert/strict';
import test from 'node:test';
import {resultsFirst} from './MatchdayPresentation';
const match = {date: '2026-11-14', status: 'Scheduled' as const, published: false};
test('6 PM Eastern changes presentation without publication, including daylight saving time', () => {
  assert.equal(resultsFirst(match, new Date('2026-11-14T22:59:59Z')), false);
  assert.equal(resultsFirst(match, new Date('2026-11-14T23:00:00Z')), true);
  assert.equal(resultsFirst({...match, date: '2026-07-04'}, new Date('2026-07-04T21:59:59Z')), false);
  assert.equal(resultsFirst({...match, date: '2026-07-04'}, new Date('2026-07-04T22:00:00Z')), true);
  assert.equal(match.published, false);
});
test('publication wins early; cancellation and postponement cannot become a final from the clock', () => {
  const now = new Date('2026-11-14T23:00:00Z');
  assert.equal(resultsFirst({...match, published: true}, new Date('2026-11-14T17:00:00Z')), true);
  for (const status of ['Cancelled', 'Postponed', 'Rain Delay'] as const) assert.equal(resultsFirst({...match, status}, now), false);
  assert.equal(resultsFirst({...match, date: '2026-11-22'}, now), false);
});
