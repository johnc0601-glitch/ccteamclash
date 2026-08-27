import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RankingsSection} from '@/components/stats/RankingsSection';
import {StatsHub} from '@/components/stats/StatsHub';
import {StatsTable} from '@/components/stats/StatsTable';
import {
  loadServerHistoricalCiGains,
  playerSeasonCiKey,
  type HistoricalCiGainBreakdown,
} from '@/core/loadServerHistoricalCiGains';
import {createServerStatsQueryService} from '@/core/createServerStatsQueryService';
import {
  getHistoricalSeasonArchives,
  isHistoricalFemalePlayer,
  type HistoricalPlayerSeasonSummary,
} from '@/data/historicalSeed';
import {buildOverallRows, MIN_STATS_MATCHES, qualifyStatsGroups} from '@/services/stats/StatsAggregator';
import type {StatsPlayerView} from '@/services/stats/StatsQueryService';
import type {StatsGroup, StatsRow} from '@/services/stats/StatsTypes';
import styles from './Stats.module.css';
import './compact.css';

type StatsPageProps = {
  searchParams: Promise<{season?: string | string[]}>;
};

function compactSeasonName(name: string): string {
  const withoutLeagueName = name.replace(/^Coastal Clash(?: Match Play)?\s*/i, '');
  return withoutLeagueName.replace(/(\d{4})-(\d{4})/, (_match, firstYear: string, secondYear: string) => `${firstYear}–${secondYear.slice(2)}`);
}

function toRow(summary: HistoricalPlayerSeasonSummary, ci?: HistoricalCiGainBreakdown): StatsRow {
  const {wins, losses, ties} = summary.overallRecord;
  return {
    playerId: summary.playerId,
    playerName: summary.playerName,
    teamName: summary.teamName,
    teamNames: [summary.teamName],
    gender: isHistoricalFemalePlayer(summary.playerName) ? 'Women' : 'Open',
    matchesPlayed: summary.matchesPlayed,
    wins,
    losses,
    ties,
    winPercentage: summary.winPercentage,
    singlesWins: summary.singlesRecord.wins,
    singlesLosses: summary.singlesRecord.losses,
    singlesTies: summary.singlesRecord.ties,
    doublesWins: summary.doublesRecord.wins,
    doublesLosses: summary.doublesRecord.losses,
    doublesTies: summary.doublesRecord.ties,
    points: wins + ties * .5,
    ...(ci ? {
      ciGain: ci.ciGain,
      singlesCiGain: ci.singlesCiGain,
      doublesCiGain: ci.doublesCiGain,
    } : {}),
  };
}

function toLiveRow(view: StatsPlayerView): StatsRow | undefined {
  const statistics = view.currentStatistics;
  if (!statistics?.matchesPlayed) return undefined;
  return {
    playerId: view.player.id,
    playerName: view.player.name,
    teamName: view.teamName,
    teamNames: [view.teamName],
    gender: view.player.gender === 'Female' ? 'Women' : 'Open',
    matchesPlayed: statistics.matchesPlayed,
    wins: statistics.overallRecord.wins,
    losses: statistics.overallRecord.losses,
    ties: statistics.overallRecord.ties,
    winPercentage: statistics.winPercentage,
    singlesWins: statistics.singlesRecord.wins,
    singlesLosses: statistics.singlesRecord.losses,
    singlesTies: statistics.singlesRecord.ties,
    doublesWins: statistics.doublesRecord.wins,
    doublesLosses: statistics.doublesRecord.losses,
    doublesTies: statistics.doublesRecord.ties,
    points: statistics.pointsEarned,
    ciGain: view.currentCiGain,
    singlesCiGain: view.currentSinglesCiGain,
    doublesCiGain: view.currentDoublesCiGain,
  };
}

export default async function StatsPage({searchParams}: StatsPageProps) {
  const archives = getHistoricalSeasonArchives();
  const [playerViews, historicalCiGains] = await Promise.all([
    (await createServerStatsQueryService()).getAll(),
    loadServerHistoricalCiGains(),
  ]);
  const historicalGroups: StatsGroup[] = archives.map((archive) => ({
    id: archive.seasonId,
    label: compactSeasonName(archive.seasonName),
    rows: archive.playerSummaries
      .filter((summary) => summary.matchesPlayed > 0)
      .map((summary) => toRow(
        summary,
        historicalCiGains.get(playerSeasonCiKey(archive.seasonId, summary.playerId)),
      )),
  }));

  const activeSeasonId = playerViews.find((view) => view.currentSeasonId)?.currentSeasonId;
  const activeSeasonName = playerViews.find((view) => view.currentSeasonId)?.currentSeasonName;
  const historicalSeasonIds = new Set(historicalGroups.map((group) => group.id));
  const liveRows = playerViews.flatMap((view) => {
    const row = toLiveRow(view);
    return row ? [row] : [];
  });
  const liveGroup = activeSeasonId && activeSeasonName && !historicalSeasonIds.has(activeSeasonId)
    ? [{id: activeSeasonId, label: compactSeasonName(activeSeasonName), rows: liveRows}]
    : [];
  const sourceSeasonGroups = [...liveGroup, ...historicalGroups];
  const seasonGroups = qualifyStatsGroups(sourceSeasonGroups);
  const groups: StatsGroup[] = [
    {
      id: 'overall',
      label: 'Overall',
      rows: buildOverallRows(sourceSeasonGroups).filter((row) => row.matchesPlayed >= MIN_STATS_MATCHES),
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
          <p>Current rankings and player performance in one place. Completed-season records remain in History.</p>
        </header>
        <StatsHub
          performance={<StatsTable groups={groups} initialGroupId={requestedSeason ?? 'overall'} />}
          rankings={<RankingsSection />}
        />
      </main>
      <Footer />
    </>
  );
}
