export const HISTORICAL_STATS_CACHE_TAG = 'historical-stats';

export type RevalidateHistoricalStatsTag = (tag: string, profile: 'max') => void;

export function revalidateHistoricalStatsTag(revalidate: RevalidateHistoricalStatsTag): void {
  revalidate(HISTORICAL_STATS_CACHE_TAG, 'max');
}
