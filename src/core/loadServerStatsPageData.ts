import {unstable_cache} from 'next/cache';
import {createPublicStatsQueryService} from '@/core/createPublicStatsQueryService';
import {loadServerHistoricalCiGains} from '@/core/loadServerHistoricalCiGains';
import {loadServerHistoricalGenderMap} from '@/core/loadServerHistoricalGenderMap';
import {loadServerHistoricalStatsGroups} from '@/core/loadServerHistoricalStatsGroups';
import {getHistoricalSeasonArchives} from '@/data/historicalSeed';
import {StatsPageService, type StatsPageData} from '@/services/stats/StatsPageService';

const getCachedStatsPageData = unstable_cache(
  async (requestedSeason?: string): Promise<StatsPageData> => {
    const statsQueryService = createPublicStatsQueryService();
    const pageService = new StatsPageService({
      getSnapshot: () => statsQueryService.getSnapshot(),
      getHistoricalArchives: getHistoricalSeasonArchives,
      loadHistoricalCiGains: loadServerHistoricalCiGains,
      loadHistoricalGenderMap: loadServerHistoricalGenderMap,
      loadHistoricalStatsGroups: loadServerHistoricalStatsGroups,
    });
    return pageService.getPageData(requestedSeason);
  },
  ['public-stats-page-data-v1'],
  {
    revalidate: 86_400,
    tags: ['public:stats', 'public:players', 'public:teams', 'public:season'],
  },
);

export async function loadServerStatsPageData(requestedSeason?: string): Promise<StatsPageData> {
  return getCachedStatsPageData(requestedSeason);
}
