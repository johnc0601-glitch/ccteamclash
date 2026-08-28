import assert from 'node:assert/strict';
import test from 'node:test';

import {classifyClashVenueFromIds} from './ClashVenue';

test('scheduled home team gets Home only on its registered home course', () => {
  assert.equal(classifyClashVenueFromIds('home-team', 'home-team'), 'Home');
});

test('a course owned by the scheduled away team remains neutral under the existing CI rule', () => {
  assert.equal(classifyClashVenueFromIds('home-team', 'away-team'), 'Neutral');
});

test('courses without a registered home team are neutral', () => {
  assert.equal(classifyClashVenueFromIds('home-team', null), 'Neutral');
  assert.equal(classifyClashVenueFromIds('home-team', undefined), 'Neutral');
});
