import assert from 'node:assert/strict';
import test from 'node:test';
import {comparePredictionPerformance} from './PredictionPerformance';

test('a favorite can outperform without an upset; extra penalties do not inflate performance', () => {
  const result = comparePredictionPerformance({expectedScore: 25, chanceOfVictory: .95,
    actualScore: 30, opponentActualScore: 7.5, extraPenaltyPoints: 1.5});
  assert.deepEqual(result, {performanceScore: 28.5, extraPenaltyPoints: 1.5,
    pointsAboveExpected: 3.5, aboveExpectations: true, upset: false});
});
test('an underdog win is an upset and a close loss can still exceed expectations', () => {
  const input = {expectedScore: 10, chanceOfVictory: .2, actualScore: 17,
    opponentActualScore: 19, extraPenaltyPoints: 0};
  assert.equal(comparePredictionPerformance(input)?.aboveExpectations, true);
  assert.equal(comparePredictionPerformance(input)?.upset, false);
  assert.equal(comparePredictionPerformance({...input, actualScore: 20})?.upset, true);
});
test('rejects invalid points and probabilities', () => {
  assert.equal(comparePredictionPerformance({expectedScore: 20, chanceOfVictory: .7,
    actualScore: 2, opponentActualScore: 34, extraPenaltyPoints: 3}), undefined);
});
