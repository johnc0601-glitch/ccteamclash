import 'server-only';

import {revalidateTag} from 'next/cache';
import {revalidateHistoricalStatsTag} from '@/core/historicalStatsCacheTag';

export function invalidateHistoricalStatsCache(): void {
  revalidateHistoricalStatsTag(revalidateTag);
}
