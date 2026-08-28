import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StatsTable} from '@/components/stats/StatsTable';
import {redirect} from 'next/navigation';
import {loadServerHistoricalCiGains} from '@/core/loadServerHistoricalCiGains';
import {loadServerHistoricalGenderMap} from '@/core/loadServerHistoricalGenderMap';
import {loadServerHistoricalStatsGroups} from '@/core/loadServerHistoricalStatsGroups';
import {createServerStatsQueryService} from '@/core/createServerStatsQueryService';
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
  const statsQueryService = await createServerStatsQueryService();
  const [statsSnapshot, historicalCiGains, historicalGenderOverrides] = await Promise.all([
    statsQueryService.getSnapshot(),
    loadServerHistoricalCiGains(),
    loadServerHistoricalGenderMap(),
  ]);
  const {playerViews} = statsSnapshot;
  const genderByPlayerId = new Map(statsSnapshot.genderByPlayerId);
  for (const [playerId, gender] of historicalGenderOverrides) {
    genderByPlayerId.set(playerId, gender);
  }

  const historicalGroups = (await loadServerHistoricalStatsGroups(
    historicalCiGains,
    genderByPlayerId,
  )).map((group) => ({
    ...group,
    label: compactSeasonName(group.label),
  }));

  const overallClashIndexByPlayer = new Map<string, number>();
  for (const group of historicalGroups) {
    for (const row of group.rows) {
      if (row.clashIndex != null) overallClashIndexByPlayer.set(row.playerId, row.clashIndex);
    }
  }
  for (const view of playerViews) {
    if (view.player.clashIndex != null) overallClashIndexByPlayer.set(view.player.id, view.player.clashIndex);
  }

  const activeSeasonId = playerViews.find((view) => view.currentSeasonId)?.currentSeasonId;
  const activeSeasonName = playerViews.find((view) => view.currentSeasonId)?.currentSeasonName;
  const historicalSeasonIds = new Set(historicalGroups.map((group) => group.id));
  const liveRows = playerViews.flatMap((view) => {
    const row = toLiveStatsRow(view);
    return row ? [row] : [];
  });
  const liveGroup = activeSeasonId && activeSeasonName && !historicalSeasonIds.has(activeSeasonId)
    ? [{id: activeSeasonId, label: compactSeasonName(activeSeasonName), rows: liveRows}]
    : [];
  const sourceSeasonGroups = [...liveGroup, ...historicalGroups];
  const seasonGroups = sourceSeasonGroups.map((group) => ({
    ...group,
    // Array.filter passes (row, index, array). Wrap the qualifier so the
    // array index cannot be mistaken for its optional minimumMatches value.
    rows: group.rows.filter((row) => qualifiesStatsRow(row)),
  }));
  const groups: StatsGroup[] = [
    {
      id: 'overall',
      label: 'Overall',
      rows: buildOverallRows(sourceSeasonGroups, overallClashIndexByPlayer)
        .filter((row) => qualifiesStatsRow(row)),
    },
    ...seasonGroups,
  ];

  const selectedGroupId = requestedSeason ?? 'overall';
  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  if (!selectedGroup || requestedSeason === 'overall') redirect('/stats');
  const groupOptions: StatsGroupOption[] = groups.map(({id, label}) => ({id, label}));
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
