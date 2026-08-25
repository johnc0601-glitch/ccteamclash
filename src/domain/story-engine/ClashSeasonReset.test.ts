import assert from 'node:assert/strict';
import test from 'node:test';
import {clashSeasonStartCi} from './ClashSeasonReset';

test('returning player uses 80 percent prior CI and 20 percent PDGA', () => {
  assert.equal(clashSeasonStartCi({priorClashIndex: 950, pdgaRating: 900, ghostRating: 850}), 940);
});

test('returning player without PDGA carries prior CI forward', () => {
  assert.equal(clashSeasonStartCi({priorClashIndex: 912, pdgaRating: null, ghostRating: 850}), 912);
});

test('new player seeds from PDGA', () => {
  assert.equal(clashSeasonStartCi({priorClashIndex: null, pdgaRating: 887, ghostRating: 850}), 887);
});

test('new unrated player uses division ghost', () => {
  assert.equal(clashSeasonStartCi({priorClashIndex: null, pdgaRating: null, ghostRating: 850}), 850);
});
