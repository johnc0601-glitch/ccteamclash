import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StatsTable} from '@/components/stats/StatsTable';
import {redirect} from 'next/navigation';
import {loadServerHistoricalCiGains} from '@/core/loadServerHistoricalCiGains';
import {loadServerHistoricalGenderMap} from '@/core/loadServerHistoricalGenderMap';
import {loadServerHistoricalStatsGroups} from '@/core/loadServerHistoricalStatsGroups';
import {createServerStatsQueryService} from '@/core/createServerStatsQueryService';
import {getHistoricalSeasonArchives} from '@/data/historicalSeed';
import {
  buildOverallRows,
  qualifiesStatsRow,
  toLiveStatsRow,
  type StatsGroup,
} from '@/services/stats/StatsPageModel';
import {parseStatsViewState} from '@/services/stats/StatsViewState';
import styles from './Stats.module.css';
import './compact.css';

export type {StatsGroup, StatsRow} from '@/services/stats/StatsPageModel';

export type StatsGroupOption = Pick<StatsGroup, 'id' | 'label'>;

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

function compactSeasonName(name: string): string {
  const withoutLeagueName = name.replace(/^Coastal Clash(?: Match Play)?\s*/i, '');
  return withoutLeagueName.replace(/(\d{4})-(\d{4})/, (_match, firstYear: string, secondYear: string) => `${firstYear}–${secondYear.slice(2)}`);
}

export default async function StatsPage({searchParams}: StatsPageProps) {
  const query = await searchParams;
  const requestedSeason = Array.isArray(query.season) ? query.season[0] : query.season;
  if (requestedSeason === 'overall') redirect('/stats');
  const statsQueryService = await createServerStatsQueryService();
  const statsSnapshot = await statsQueryService.getSnapshot();
  const {playerViews} = statsSnapshot;
  const activeSeasonId = playerViews.find((view) => view.currentSeasonId)?.currentSeasonId;
  const activeSeasonName = playerViews.find((view) => view.currentSeasonId)?.currentSeasonName;
  const historicalOptions: StatsGroupOption[] = getHistoricalSeasonArchives().map((archive) => ({
    id: archive.seasonId,
    label: compactSeasonName(archive.seasonName),
  }));
  const historicalSeasonIds = new Set(historicalOptions.map((option) => option.id));
  if (requestedSeason && requestedSeason !== activeSeasonId && !historicalSeasonIds.has(requestedSeason)) {
    redirect('/stats');
  }

  const liveRows = playerViews.flatMap((view) => {
    const row = toLiveStatsRow(view);
    return row ? [row] : [];
  });
  const liveGroup: StatsGroup | undefined = activeSeasonId && activeSeasonName && !historicalSeasonIds.has(activeSeasonId)
    ? {id: activeSeasonId, label: compactSeasonName(activeSeasonName), rows: liveRows}
    : undefined;
  const requestedHistoricalSeason = requestedSeason && historicalSeasonIds.has(requestedSeason)
    ? requestedSeason
    : undefined;
  const needsHistoricalData = !requestedSeason || Boolean(requestedHistoricalSeason);
  let historicalGroups: StatsGroup[] = [];
  if (needsHistoricalData) {
    const genderByPlayerId = new Map(statsSnapshot.genderByPlayerId);
    const [historicalCiGains, historicalGenderOverrides] = await Promise.all([
      loadServerHistoricalCiGains(requestedHistoricalSeason),
      loadServerHistoricalGenderMap(),
    ]);
    for (const [playerId, gender] of historicalGenderOverrides) {
      genderByPlayerId.set(playerId, gender);
    }
    historicalGroups = (await loadServerHistoricalStatsGroups(
      historicalCiGains,
      genderByPlayerId,
      requestedHistoricalSeason,
    )).map((group) => ({...group, label: compactSeasonName(group.label)}));
  }

  let selectedGroup: StatsGroup | undefined;
  if (!requestedSeason) {
    const sourceSeasonGroups = [...(liveGroup ? [liveGroup] : []), ...historicalGroups];
    const overallClashIndexByPlayer = new Map<string, number>();
    for (const group of historicalGroups) {
      for (const row of group.rows) {
        if (row.clashIndex != null) overallClashIndexByPlayer.set(row.playerId, row.clashIndex);
      }
    }
    for (const view of playerViews) {
      if (view.player.clashIndex != null) overallClashIndexByPlayer.set(view.player.id, view.player.clashIndex);
    }
    selectedGroup = {
      id: 'overall',
      label: 'Overall',
      rows: buildOverallRows(sourceSeasonGroups, overallClashIndexByPlayer)
        .filter((row) => qualifiesStatsRow(row)),
    };
  } else if (requestedSeason === liveGroup?.id) {
    selectedGroup = {...liveGroup, rows: liveGroup.rows.filter((row) => qualifiesStatsRow(row))};
  } else {
    const historicalGroup = historicalGroups.find((group) => group.id === requestedSeason);
    if (historicalGroup) {
      selectedGroup = {...historicalGroup, rows: historicalGroup.rows.filter((row) => qualifiesStatsRow(row))};
    }
  }
  if (!selectedGroup) redirect('/stats');

  const groupOptions: StatsGroupOption[] = [
    {id: 'overall', label: 'Overall'},
    ...(liveGroup ? [{id: liveGroup.id, label: liveGroup.label}] : []),
    ...historicalOptions,
  ];
  const initialView = parseStatsViewState(query);

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
        <StatsTable key={selectedGroup.id} group={selectedGroup} groupOptions={groupOptions} initialView={initialView} />
      </main>
      <Footer />
    </>
  );
}
