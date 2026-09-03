import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StatsTable} from '@/components/stats/StatsTable';
import {loadServerStatsPageData} from '@/core/loadServerStatsPageData';
import {redirect} from 'next/navigation';
import type {StatsGroup, StatsRow} from '@/services/stats/StatsPageModel';
import {InvalidStatsSeasonError, type StatsGroupOption} from '@/services/stats/StatsPageService';
import {DEFAULT_STATS_VIEW, parseStatsViewState} from '@/services/stats/StatsViewState';
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
  let pageData: {selectedGroup: StatsGroup; groupOptions: StatsGroupOption[]};
  try {
    pageData = await loadServerStatsPageData(requestedSeason);
  } catch (error) {
    if (error instanceof InvalidStatsSeasonError) redirect('/stats');
    throw error;
  }
  const {selectedGroup, groupOptions} = pageData;
  const initialView = parseStatsViewState(query);
  const useCompactInitialPayload = isDefaultView(initialView);
  const fullRowCount = selectedGroup.rows.length;
  const teamOptions = Array.from(new Set(selectedGroup.rows.flatMap((row) => row.teamNames).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
  const clientGroup = useCompactInitialPayload
    ? {...selectedGroup, rows: [...selectedGroup.rows].sort(compareDefaultCiRows).slice(0, 25)}
    : selectedGroup;
  const isPartial = clientGroup.rows.length < fullRowCount;
  const showProductionArchiveNotice = process.env.VERCEL_ENV != null && process.env.VERCEL_ENV !== 'production';

  console.info('[stats] Stats group ready', {
    id: selectedGroup.id,
    players: selectedGroup.rows.length,
    deliveredPlayers: clientGroup.rows.length,
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
        <StatsTable
          key={selectedGroup.id}
          group={clientGroup}
          groupOptions={groupOptions}
          initialView={initialView}
          fullRowCount={fullRowCount}
          teamOptions={teamOptions}
          isPartial={isPartial}
        />
      </main>
      <Footer />
    </>
  );
}

function isDefaultView(view: ReturnType<typeof parseStatsViewState>): boolean {
  return view.division === DEFAULT_STATS_VIEW.division
    && view.team === DEFAULT_STATS_VIEW.team
    && view.search === DEFAULT_STATS_VIEW.search
    && view.sortKey === DEFAULT_STATS_VIEW.sortKey
    && view.direction === DEFAULT_STATS_VIEW.direction
    && view.limit === DEFAULT_STATS_VIEW.limit;
}

function compareDefaultCiRows(a: StatsRow, b: StatsRow): number {
  if (a.clashIndex === undefined && b.clashIndex === undefined) return a.playerName.localeCompare(b.playerName);
  if (a.clashIndex === undefined) return 1;
  if (b.clashIndex === undefined) return -1;
  return b.clashIndex - a.clashIndex || a.playerName.localeCompare(b.playerName);
}
