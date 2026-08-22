export const CLASH_MODEL_VERSION = '2026-27-v1';
export const SINGLES_HOME_BONUS = 15;
export const DOUBLES_STRONG_WEIGHT = 0.8;

export type ClashSide = 'Home' | 'Away';
export type ClashFormat = 'Singles' | 'Doubles';

export function eloProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function singlesProbability(
  homeCi: number,
  awayCi: number,
): number {
  return eloProbability(homeCi + SINGLES_HOME_BONUS, awayCi);
}

export function doublesPairCi(firstCi: number, secondCi: number): number {
  const strong = Math.max(firstCi, secondCi);
  const weak = Math.min(firstCi, secondCi);
  return strong * DOUBLES_STRONG_WEIGHT + weak * (1 - DOUBLES_STRONG_WEIGHT);
}

export function doublesProbability(
  homePlayerCis: readonly [number, number],
  awayPlayerCis: readonly [number, number],
): number {
  return eloProbability(
    doublesPairCi(homePlayerCis[0], homePlayerCis[1]),
    doublesPairCi(awayPlayerCis[0], awayPlayerCis[1]),
  );
}

export function expectedPoints(winProbability: number): number {
  return winProbability;
}

export function performanceAboveExpectation(actualPoints: number, expected: number): number {
  return actualPoints - expected;
}
