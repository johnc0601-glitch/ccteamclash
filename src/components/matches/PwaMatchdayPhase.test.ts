import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPwaPredictionPercent,
  getPwaMatchdayPhaseCopy,
  resolvePwaMatchdayPhase,
} from '@/components/matches/PwaMatchdayPhase';

const reference = new Date('2026-10-03T16:00:00.000Z');

test('uses Eastern date for Matchday Today state', () => {
  assert.equal(resolvePwaMatchdayPhase({status: 'Scheduled', date: '2026-10-03'}, false, reference), 'today');
});

test('distinguishes upcoming and awaiting-results matches', () => {
  assert.equal(resolvePwaMatchdayPhase({status: 'Scheduled', date: '2026-10-17'}, false, reference), 'upcoming');
  assert.equal(resolvePwaMatchdayPhase({status: 'Scheduled', date: '2026-09-19'}, false, reference), 'awaiting');
});

test('published results and Completed status are Final', () => {
  assert.equal(resolvePwaMatchdayPhase({status: 'Scheduled', date: '2026-10-03'}, true, reference), 'final');
  assert.equal(resolvePwaMatchdayPhase({status: 'Completed', date: '2026-10-03'}, false, reference), 'final');
});

test('preserves official disruption statuses', () => {
  assert.equal(resolvePwaMatchdayPhase({status: 'Postponed', date: '2026-10-03'}, false, reference), 'postponed');
  assert.equal(resolvePwaMatchdayPhase({status: 'Cancelled', date: '2026-10-03'}, false, reference), 'cancelled');
  assert.equal(resolvePwaMatchdayPhase({status: 'Rain Delay', date: '2026-10-03'}, false, reference), 'rain');
});

test('phase copy does not imply unsupported live scoring', () => {
  assert.equal(getPwaMatchdayPhaseCopy('today').label, 'Matchday · Today');
  assert.match(getPwaMatchdayPhaseCopy('awaiting').detail, /official results/i);
});


test('formats model probabilities as whole display percentages', () => {
  assert.equal(formatPwaPredictionPercent(0.39466544504), 39);
  assert.equal(formatPwaPredictionPercent(0.60533455496), 61);
  assert.equal(formatPwaPredictionPercent(0.999), 100);
});
