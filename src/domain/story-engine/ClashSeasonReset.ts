export const RETURNING_CI_WEIGHT = 0.8;
export const RETURNING_PDGA_WEIGHT = 0.2;

export type ClashSeasonResetInput = {
  priorClashIndex?: number | null;
  pdgaRating?: number | null;
  ghostRating: number;
};

/**
 * Starting CI for a new season.
 *
 * Returning players keep established Clash performance as the primary signal.
 * PDGA is an external anchor, not an earned CI movement, so this reset must
 * never be included in season or career CI +/- totals.
 *
 * 2025-26 historical validation (509 contests / 480 decisive) found an 80/20
 * prior-CI/PDGA blend slightly more predictive than more aggressive stale-PDGA
 * carryover variants. If PDGA is unavailable, prior CI carries forward intact.
 * New players seed from PDGA when available, otherwise the division ghost.
 */
export function clashSeasonStartCi({
  priorClashIndex,
  pdgaRating,
  ghostRating,
}: ClashSeasonResetInput): number {
  if (priorClashIndex == null) {
    return pdgaRating ?? ghostRating;
  }
  if (pdgaRating == null) {
    return priorClashIndex;
  }
  return Math.round(priorClashIndex * RETURNING_CI_WEIGHT + pdgaRating * RETURNING_PDGA_WEIGHT);
}
