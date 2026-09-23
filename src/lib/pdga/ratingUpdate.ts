import {calendarDate} from '@/domain/story-engine/ClashSeasonReset';

/** PDGA supplies ISO dates (sometimes with a time) or day-month-name dates. */
export function pdgaEffectiveDate(value?: string | null): string | null {
  if (!value) return null;
  const iso = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:$|[T ])/);
  if (iso) return calendarDate(iso[1]);
  const named = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!named) return null;
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(named[2].toLowerCase()) + 1;
  return calendarDate(`${named[3]}-${String(month).padStart(2, '0')}-${named[1].padStart(2, '0')}`);
}

export function pdgaRatingUpdate(
  previous: {pdga_rating: number | null; pdga_rating_effective_date: string | null},
  incoming: {rating?: string; rating_effective_date?: string},
): {pdga_rating: number; pdga_rating_effective_date: string | null} | null {
  const rating = Number(incoming.rating);
  if (!Number.isInteger(rating) || rating <= 0) return null;
  const date = pdgaEffectiveDate(incoming.rating_effective_date);
  // A refreshed date matters even when the numeric rating is unchanged.
  if (rating === previous.pdga_rating && date === previous.pdga_rating_effective_date) return null;
  // Never carry an old date onto a different rating with no effective date.
  return {pdga_rating: rating, pdga_rating_effective_date: date};
}
