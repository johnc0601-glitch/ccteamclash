import assert from 'node:assert/strict';
import test from 'node:test';
import {pdgaEffectiveDate, pdgaRatingUpdate} from './ratingUpdate';

test('normalizes real PDGA dates and rejects invented calendar days', () => {
  assert.equal(pdgaEffectiveDate('12-May-2026'), '2026-05-12');
  assert.equal(pdgaEffectiveDate('2026-05-12 00:00:00'), '2026-05-12');
  assert.equal(pdgaEffectiveDate('2026-05-12'), '2026-05-12');
  for (const value of ['2026-02-30', '31-Feb-2026', '', 'unknown']) assert.equal(pdgaEffectiveDate(value), null);
});

test('persists date-only changes even when rating is unchanged', () => {
  const previous = {pdga_rating: 993, pdga_rating_effective_date: null};
  assert.deepEqual(pdgaRatingUpdate(previous, {rating: '993', rating_effective_date: '12-May-2026'}),
    {pdga_rating: 993, pdga_rating_effective_date: '2026-05-12'});
  assert.equal(pdgaRatingUpdate({...previous, pdga_rating_effective_date: '2026-05-12'},
    {rating: '993', rating_effective_date: '2026-05-12'}), null);
});

test('a changed rating cannot retain an unrelated date; invalid ratings are ignored', () => {
  const previous = {pdga_rating: 926, pdga_rating_effective_date: '2025-01-14'};
  assert.deepEqual(pdgaRatingUpdate(previous, {rating: '993'}), {pdga_rating: 993, pdga_rating_effective_date: null});
  for (const rating of ['0', '-5', '993x', '993.5', '']) assert.equal(pdgaRatingUpdate(previous, {rating}), null);
});
