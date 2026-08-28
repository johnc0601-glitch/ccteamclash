import assert from 'node:assert/strict';
import {test} from 'node:test';
import {selectHistoricalCiReplaySummaries} from './HistoricalCiReplaySelection';

test('emergency replay returns only the requested historical season', () => {
  const seasons = new Map([
    ['season-1', {facts: [{playerId: 'p1', format: 'Singles' as const, ciDelta: 4}], endingRatings: new Map([['p1', 904]])}],
    ['season-2', {facts: [{playerId: 'p1', format: 'Doubles' as const, ciDelta: 6}], endingRatings: new Map([['p1', 910]])}],
  ]);
  const selected = selectHistoricalCiReplaySummaries(seasons, 'season-2');
  assert.deepEqual([...selected], [['season-2:p1', {
    ciGain: 6, singlesCiGain: 0, doublesCiGain: 6, endingCi: 910,
  }]]);
});
