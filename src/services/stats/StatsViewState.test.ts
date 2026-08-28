import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  DEFAULT_STATS_VIEW,
  parseStatsViewState,
  toStatsViewSearchParams,
} from './StatsViewState';

test('parses a shareable Stats view and rejects unsupported values', () => {
  assert.deepEqual(parseStatsViewState({
    division: 'women',
    team: 'Riptide',
    q: ' Lizzie ',
    sort: 'ciGain',
    direction: 'asc',
    limit: 'all',
  }), {
    division: 'Women',
    team: 'Riptide',
    search: 'Lizzie',
    sortKey: 'ciGain',
    direction: 'asc',
    limit: 'all',
  });

  assert.deepEqual(parseStatsViewState({sort: 'unsupported', direction: 'sideways'}), DEFAULT_STATS_VIEW);
});

test('serializes only non-default Stats controls alongside the selected season', () => {
  const params = toStatsViewSearchParams('season-1', {
    ...DEFAULT_STATS_VIEW,
    division: 'Women',
    search: 'Lizzie Goddard',
    limit: 'all',
  });

  assert.equal(params.toString(), 'season=season-1&division=women&q=Lizzie+Goddard&limit=all');
  assert.equal(toStatsViewSearchParams('overall', DEFAULT_STATS_VIEW).toString(), '');
});
