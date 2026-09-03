import {createServerStatsQueryService} from '@/core/createServerStatsQueryService';
import {loadServerHistoricalCiGains} from '@/core/loadServerHistoricalCiGains';
import {loadServerHistoricalGenderMap} from '@/core/loadServerHistoricalGenderMap';
import {loadServerHistoricalStatsGroups} from '@/core/loadServerHistoricalStatsGroups';
import {getHistoricalSeasonArchives} from '@/data/historicalSeed';
import {StatsPageService, type StatsPageData} from '@/services/stats/StatsPageService';

export async function loadServerStatsPageData(requestedSeason?: string): Promise<StatsPageData> {
  const statsQueryService = await createServerStatsQueryService();
  const pageService = new StatsPageService({
    getSnapshot: () => statsQueryService.getSnapshot(),
    getHistoricalArchives: getHistoricalSeasonArchives,
    loadHistoricalCiGains: loadServerHistoricalCiGains,
    loadHistoricalGenderMap: loadServerHistoricalGenderMap,
    loadHistoricalStatsGroups: loadServerHistoricalStatsGroups,
  });
  return pageService.getPageData(requestedSeason);
}
