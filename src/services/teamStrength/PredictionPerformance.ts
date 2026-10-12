/** Compare a saved forecast with the result, keeping extra roster penalties separate. */
export function comparePredictionPerformance(input: {
  expectedScore: number;
  chanceOfVictory: number;
  actualScore: number;
  opponentActualScore: number;
  extraPenaltyPoints: number;
}) {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value))
    || input.chanceOfVictory < 0 || input.chanceOfVictory > 1
    || input.expectedScore < 0 || input.expectedScore > 36
    || input.extraPenaltyPoints < 0 || input.extraPenaltyPoints > input.actualScore) return undefined;
  const performanceScore = input.actualScore - input.extraPenaltyPoints;
  const pointsAboveExpected = performanceScore - input.expectedScore;
  return {
    performanceScore,
    extraPenaltyPoints: input.extraPenaltyPoints,
    pointsAboveExpected,
    aboveExpectations: pointsAboveExpected > 0,
    upset: input.actualScore > input.opponentActualScore && input.chanceOfVictory < 0.5,
  };
}
