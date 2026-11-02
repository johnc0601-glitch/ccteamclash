import assert from 'node:assert/strict';
import test from 'node:test';
import {buildMatchSeries} from './matchSeries';

const meeting = (away_score: number, home_score: number) =>
  ({away_team_name: 'Ninjas', home_team_name: 'KB', away_score, home_score});

test('equal wins are tied rather than a team lead', () => {
  assert.equal(buildMatchSeries('Ninjas', 'KB', [meeting(10, 5), meeting(5, 10)]), 'Series tied 1–1');
});
test('draws do not count as opponent wins', () => {
  assert.equal(buildMatchSeries('Ninjas', 'KB', [meeting(10, 5), meeting(5, 5)]), 'Ninjas leads 1–0 · 1 tied');
});
test('unrelated matches are excluded', () => {
  assert.equal(buildMatchSeries('Ninjas', 'KB', [{...meeting(5, 10), home_team_name: 'Riptide'}]), 'First meeting');
});
