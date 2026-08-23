export const CLASH_EXPECTATION_DIVISOR = 100;
export const CLASH_UPSET_EXPONENT = 1.8;
export const CLASH_MIN_MOVEMENT = 2;
export const CLASH_MAX_MOVEMENT = 28;
export const CLASH_DOUBLES_MOVEMENT_MULTIPLIER = 0.75;

export type ClashActualScore = 0 | 0.5 | 1;

/**
 * Coastal Clash CI movement.
 *
 * Standard Elo establishes that movement is driven by actual minus expected
 * score. Clash uses the magnitude of that surprise as a nonlinear movement
 * curve: maxMovement * |actual - expected|^exponent, bounded to 2..28 and
 * signed by the direction of the performance.
 *
 * Event ratings are frozen before play, so this returns a contest contribution;
 * all contributions are summed before the player's CI is updated once.
 */
export function clashCiDelta(actual: ClashActualScore, expected: number): number {
  if (!Number.isFinite(expected) || expected < 0 || expected > 1) {
    throw new RangeError('expected must be between 0 and 1');
  }

  const surprise = actual - expected;
  if (surprise === 0) return 0;

  const raw = CLASH_MAX_MOVEMENT * Math.abs(surprise) ** CLASH_UPSET_EXPONENT;
  const bounded = Math.min(CLASH_MAX_MOVEMENT, Math.max(CLASH_MIN_MOVEMENT, raw));
  return Math.sign(surprise) * Math.round(bounded);
}

/**
 * Doubles carries 75% of the normal per-player CI movement. The 80/20 pair
 * weighting is used only to calculate pair strength and win probability.
 */
export function clashDoublesCiDelta(actual: ClashActualScore, expected: number): number {
  const baseDelta = clashCiDelta(actual, expected);
  if (baseDelta === 0) return 0;
  return Math.sign(baseDelta) * Math.round(Math.abs(baseDelta) * CLASH_DOUBLES_MOVEMENT_MULTIPLIER);
}
