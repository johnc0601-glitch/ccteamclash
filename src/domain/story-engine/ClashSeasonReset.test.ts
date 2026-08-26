import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OPEN_PROVISIONAL_CI,
  WOMEN_PROVISIONAL_CI,
  clashProvisionalCi,
  clashSeasonStartCi,
} from './ClashSeasonReset';

test('returning player uses 80 percent prior CI and 20 percent PDGA', () => {
  assert.equal(clashSeasonStartCi({priorClashIndex: 950, pdgaRating: 900, division: 'Open'}), 940);
});

test('returning player without PDGA carries prior CI forward', () => {
  assert.equal(clashSeasonStartCi({priorClashIndex: 912, pdgaRating: null, division: 'Open'}), 912);
});

test('new player seeds from PDGA', () => {
  assert.equal(clashSeasonStartCi({priorClashIndex: null, pdgaRating: 887, division: 'Open'}), 887);
});

test('hardcoded provisional baselines are Open 825 and Women 700', () => {
  assert.equal(OPEN_PROVISIONAL_CI, 825);
  assert.equal(WOMEN_PROVISIONAL_CI, 700);
  assert.equal(clashProvisionalCi('Open'), 825);
  assert.equal(clashProvisionalCi('Women'), 700);
  assert.equal(clashSeasonStartCi({priorClashIndex: null, pdgaRating: null, division: 'Open'}), 825);
  assert.equal(clashSeasonStartCi({priorClashIndex: null, pdgaRating: null, division: 'Women'}), 700);
});
