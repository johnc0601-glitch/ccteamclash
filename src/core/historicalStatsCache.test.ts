import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  HISTORICAL_STATS_CACHE_TAG,
  revalidateHistoricalStatsTag,
} from './historicalStatsCacheTag';

test('historical writes invalidate the shared Stats cache tag with stale-while-revalidate', () => {
  const calls: Array<[string, 'max']> = [];
  revalidateHistoricalStatsTag((tag, profile) => calls.push([tag, profile]));
  assert.deepEqual(calls, [[HISTORICAL_STATS_CACHE_TAG, 'max']]);
});
