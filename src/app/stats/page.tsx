import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StatsTable} from '@/components/stats/StatsTable';
import {
  loadServerHistoricalCiGains,
  playerSeasonCiKey,
} from '@/core/loadServerHistoricalCiGains';
import {createServerStatsQueryService} from '@/core/createServerStatsQueryService';
import {getHistoricalSeasonArchives} from '@/data/historicalSeed';
import {
  buildOverallRows,
  qualifiesStatsRow,
  toHistoricalStatsRow,
  toLiveStatsRow,
  type StatsGroup,
} from '@/services/stats/StatsPageModel';
import styles from './Stats.module.css';
import './compact.css';

export type {StatsGroup, StatsRow} from '@/services/stats/StatsPageModel';

type StatsPageProps = {
  searchParams: Promise<{season?: string | string[]}>;
};

function compactSeasonName(name: string): string {
  const withoutLeagueName = name.replace(/^Coastal Clash(?: Match Play)?\s*/i, '');
  return withoutLeagueName.replace(/(\d{4})-(\d{4})/, (_match, firstYear: string, secondYear: string) => `${firstYear}–${secondYear.slice(2)}`);
}

export default async function StatsPage({searchParams}: StatsPageProps) {
  const archives = getHistoricalSeasonArchives();
  const statsQueryService = await createServerStatsQueryService();
  const [statsSnapshot, historicalCiGains] = await Promise.all([
    statsQueryService.getSnapshot(),
    loadServerHistoricalCiGains(),
  ]);
  const {playerViews, genderByPlayerId} = statsSnapshot;
  const historicalGroups: StatsGroup[] = archives.map((archive) => ({
    id: archive.seasonId,
    label: compactSeasonName(archive.seasonName),
    rows: archive.playerSummaries
      .filter((summary) => summary.matchesPlayed > 0)
      .map((summary) => toHistoricalStatsRow(
        summary,
        historicalCiGains.get(playerSeasonCiKey(archive.seasonId, summary.playerId)),
        genderByPlayerId,
      )),
  }));

  const overallClashIndexByPlayer = new Map<string, number>();
  for (const archive of archives) {
    for (const summary of archive.playerSummaries) {
      const ci = historicalCiGains.get(playerSeasonCiKey(archive.seasonId, summary.playerId));
      if (ci) overallClashIndexByPlayer.set(summary.playerId, ci.endingCi);
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
    rows: group.rows.filter(qualifiesStatsRow),
  }));
  const groups: StatsGroup[] = [
    {
      id: 'overall',
      label: 'Overall',
      rows: buildOverallRows(sourceSeasonGroups, overallClashIndexByPlayer)
        .filter(qualifiesStatsRow),
    },
    ...seasonGroups,
  ];
  const query = await searchParams;
  const requestedSeason = Array.isArray(query.season) ? query.season[0] : query.season;

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <header className={styles.pageHeader}>
          <span className="eyebrow">League statistics</span>
          <h1>Stats</h1>
          <p>Player performance by season or across the full recorded Coastal Clash history.</p>
        </header>
        <StatsTable groups={groups} initialGroupId={requestedSeason ?? 'overall'} />
      </main>
      <Footer />
    </>
  );
}
