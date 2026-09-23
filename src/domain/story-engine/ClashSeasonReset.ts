export const RETURNING_CI_WEIGHT = 0.8;
export const RETURNING_PDGA_WEIGHT = 0.2;
export const OPEN_PROVISIONAL_CI = 825;
export const WOMEN_PROVISIONAL_CI = 700;

export type ClashDivision = 'Open' | 'Women';

export type ClashSeasonResetInput = {
  priorClashIndex?: number | null;
  pdgaRating?: number | null;
  pdgaRatingEffectiveDate?: string | null;
  priorFinalMatchDate?: string | null;
  division: ClashDivision;
};

export function clashProvisionalCi(division: ClashDivision): number {
  return division === 'Women' ? WOMEN_PROVISIONAL_CI : OPEN_PROVISIONAL_CI;
}

/**
 * Starting CI for a new season.
 *
 * Returning players keep established Clash performance as the primary signal.
 * PDGA is an external anchor, not an earned CI movement, so this reset must
 * never be included in season or career CI +/- totals.
 *
 * PDGA effective after the player's final prior-season match uses 50/50.
 * Equal, older, missing, or invalid dates use 80/20. If PDGA is unavailable,
 * prior CI carries forward intact. Dates are calendar dates, not sync times.
 * New players seed from PDGA when available, otherwise the hardcoded division
 * provisional baseline: Open 825, Women 700.
 */
export function clashSeasonStartCi({
  priorClashIndex,
  pdgaRating,
  pdgaRatingEffectiveDate,
  priorFinalMatchDate,
  division,
}: ClashSeasonResetInput): number {
  if (priorClashIndex == null) {
    return pdgaRating ?? clashProvisionalCi(division);
  }
  if (pdgaRating == null) {
    return priorClashIndex;
  }
  const effective = calendarDate(pdgaRatingEffectiveDate);
  const lastMatch = calendarDate(priorFinalMatchDate);
  if (effective && lastMatch && effective > lastMatch) {
    return Math.round((priorClashIndex + pdgaRating) / 2);
  }
  return Math.round(priorClashIndex * RETURNING_CI_WEIGHT + pdgaRating * RETURNING_PDGA_WEIGHT);
}

/** Accept only real ISO calendar dates; never roll invalid dates into another month. */
export function calendarDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
