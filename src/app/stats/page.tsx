import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StatsTable} from '@/components/stats/StatsTable';
import {redirect} from 'next/navigation';
import {loadServerHistoricalCiGains} from '@/core/loadServerHistoricalCiGains';
import {loadServerHistoricalGenderMap} from '@/core/loadServerHistoricalGenderMap';
import {loadServerHistoricalStatsGroups} from '@/core/loadServerHistoricalStatsGroups';
import {createServerStatsQueryService} from '@/core/createServerStatsQueryService';
import {getHistoricalSeasonArchives} from '@/data/historicalSeed';
import type {StatsGroup} from '@/services/stats/StatsPageModel';
import {InvalidStatsSeasonError, StatsPageService, type StatsGroupOption} from '@/services/stats/StatsPageService';
import {parseStatsViewState} from '@/services/stats/StatsViewState';
import styles from './Stats.module.css';
import './compact.css';

export type {StatsGroup, StatsRow} from '@/services/stats/StatsPageModel';

export type {StatsGroupOption} from '@/services/stats/StatsPageService';

type StatsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    division?: string | string[];
    team?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    direction?: string | string[];
    limit?: string | string[];
  }>;
};

export default async function StatsPage({searchParams}: StatsPageProps) {
  const query = await searchParams;
  const requestedSeason = Array.isArray(query.season) ? query.season[0] : query.season;
  const statsQueryService = await createServerStatsQueryService();
  const pageService = new StatsPageService({
    getSnapshot: () => statsQueryService.getSnapshot(),
    getHistoricalArchives: getHistoricalSeasonArchives,
    loadHistoricalCiGains: loadServerHistoricalCiGains,
    loadHistoricalGenderMap: loadServerHistoricalGenderMap,
    loadHistoricalStatsGroups: loadServerHistoricalStatsGroups,
  });
  let pageData: {selectedGroup: StatsGroup; groupOptions: StatsGroupOption[]};
  try {
    pageData = await pageService.getPageData(requestedSeason);
  } catch (error) {
    if (error instanceof InvalidStatsSeasonError) redirect('/stats');
    throw error;
  }
  const {selectedGroup, groupOptions} = pageData;
  const initialView = parseStatsViewState(query);
  const showProductionArchiveNotice = process.env.VERCEL_ENV != null && process.env.VERCEL_ENV !== 'production';

  console.info('[stats] Stats group ready', {
    id: selectedGroup.id,
    players: selectedGroup.rows.length,
    availableGroups: groupOptions.length,
  });

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <header className={styles.pageHeader}>
          <span className="eyebrow">League statistics</span>
          <h1>Stats</h1>
          <p>Player performance by season or across the full recorded Coastal Clash history.</p>
        </header>
        {showProductionArchiveNotice ? (
          <p className={styles.archiveNotice} role="note">
            Stats are shown from the production archive. Live data on this preview deployment may differ.
          </p>
        ) : null}
        <StatsTable key={selectedGroup.id} group={selectedGroup} groupOptions={groupOptions} initialView={initialView} />
      </main>
      <Footer />
    </>
  );
}
