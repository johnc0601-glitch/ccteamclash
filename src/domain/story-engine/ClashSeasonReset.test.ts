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

test('recent PDGA uses 50/50, rounds halves up, and handles the verified Jason rating', () => {
  const input = {priorClashIndex: 931, pdgaRating: 1006, division: 'Open' as const,
    priorFinalMatchDate: '2026-03-31', pdgaRatingEffectiveDate: '2026-05-12'};
  assert.equal(clashSeasonStartCi(input), 969);
  assert.equal(clashSeasonStartCi({...input, pdgaRating: 993}), 962);
});

test('same day, older, absent and invalid dates retain 80/20', () => {
  for (const effective of ['2026-03-31', '2026-03-30', null, '', '2026-02-30', 'not-a-date']) {
    assert.equal(clashSeasonStartCi({priorClashIndex: 931, pdgaRating: 993, division: 'Open',
      priorFinalMatchDate: '2026-03-31', pdgaRatingEffectiveDate: effective}), 943);
  }
  assert.equal(clashSeasonStartCi({priorClashIndex: 931, pdgaRating: 993, division: 'Open',
    pdgaRatingEffectiveDate: '2026-05-12'}), 943);
});

test('recency is per player rather than the season end', () => {
  const input = {priorClashIndex: 900, pdgaRating: 1000, division: 'Open' as const, pdgaRatingEffectiveDate: '2026-02-10'};
  assert.equal(clashSeasonStartCi({...input, priorFinalMatchDate: '2026-01-10'}), 950);
  assert.equal(clashSeasonStartCi({...input, priorFinalMatchDate: '2026-03-10'}), 920);
});

test('hardcoded provisional baselines are Open 825 and Women 700', () => {
  assert.equal(OPEN_PROVISIONAL_CI, 825);
  assert.equal(WOMEN_PROVISIONAL_CI, 700);
  assert.equal(clashProvisionalCi('Open'), 825);
  assert.equal(clashProvisionalCi('Women'), 700);
  assert.equal(clashSeasonStartCi({priorClashIndex: null, pdgaRating: null, division: 'Open'}), 825);
  assert.equal(clashSeasonStartCi({priorClashIndex: null, pdgaRating: null, division: 'Women'}), 700);
});
