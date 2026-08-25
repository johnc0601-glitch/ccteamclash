import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StatsTable} from '@/components/stats/StatsTable';
import {createServerPublicPlayerService} from '@/core/createServerPublicPlayerService';
import {
  getHistoricalSeasonArchives,
  isHistoricalFemalePlayer,
  type HistoricalPlayerSeasonSummary,
} from '@/data/historicalSeed';
import type {PublicPlayerView} from '@/services/public/PublicPlayerService';
import styles from './Stats.module.css';
import './compact.css';

type StatsPageProps = {
  searchParams: Promise<{season?: string | string[]}>;
};

export type StatsRow = {
  playerId: string;
  playerName: string;
  teamName: string;
  teamNames: string[];
  gender: 'Open' | 'Women';
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  singlesWins: number;
  singlesLosses: number;
  singlesTies: number;
  doublesWins: number;
  doublesLosses: number;
  doublesTies: number;
  points: number;
  /** Earned Clash Index movement only. Undefined until the season ledger is backfilled. */
  ciGain?: number;
};

export type StatsGroup = {
  id: string;
  label: string;
  rows: StatsRow[];
};

function compactSeasonName(name: string): string {
  const withoutLeagueName = name.replace(/^Coastal Clash(?: Match Play)?\s*/i, '');
  return withoutLeagueName.replace(/(\d{4})-(\d{4})/, (_match, firstYear: string, secondYear: string) => `${firstYear}–${secondYear.slice(2)}`);
}

function toRow(summary: HistoricalPlayerSeasonSummary): StatsRow {
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
  };
}

function toLiveRow(view: PublicPlayerView): StatsRow | undefined {
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
  };
}

function buildOverallRows(groups: StatsGroup[]): StatsRow[] {
  const players = new Map<string, StatsRow & {teams: Set<string>}>();

  for (const group of groups) {
    for (const row of group.rows) {
      const existing = players.get(row.playerId) ?? {
        ...row,
        teamName: row.teamName,
        teamNames: [],
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        winPercentage: 0,
        singlesWins: 0,
        singlesLosses: 0,
        singlesTies: 0,
        doublesWins: 0,
        doublesLosses: 0,
        doublesTies: 0,
        points: 0,
        ciGain: undefined,
        teams: new Set<string>(),
      };

      row.teamNames.forEach((teamName) => existing.teams.add(teamName));
      existing.matchesPlayed += row.matchesPlayed;
      existing.wins += row.wins;
      existing.losses += row.losses;
      existing.ties += row.ties;
      existing.singlesWins += row.singlesWins;
      existing.singlesLosses += row.singlesLosses;
      existing.singlesTies += row.singlesTies;
      existing.doublesWins += row.doublesWins;
      existing.doublesLosses += row.doublesLosses;
      existing.doublesTies += row.doublesTies;
      existing.points += row.points;
      if (row.ciGain !== undefined) existing.ciGain = (existing.ciGain ?? 0) + row.ciGain;
      const decisions = existing.wins + existing.losses + existing.ties;
      existing.winPercentage = decisions ? ((existing.wins + existing.ties * .5) / decisions) * 100 : 0;
      players.set(row.playerId, existing);
    }
  }

  return Array.from(players.values()).map(({teams, ...row}) => {
    const teamNames = Array.from(teams).sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
    return {
      ...row,
      teamNames,
      teamName: teamNames.length > 1 ? 'Multiple teams' : teamNames[0] ?? row.teamName,
    };
  });
}

export default async function StatsPage({searchParams}: StatsPageProps) {
  const archives = getHistoricalSeasonArchives();
  const historicalGroups: StatsGroup[] = archives.map((archive) => ({
    id: archive.seasonId,
    label: compactSeasonName(archive.seasonName),
    rows: archive.playerSummaries.filter((summary) => summary.matchesPlayed > 0).map(toRow),
  }));

  const playerViews = await (await createServerPublicPlayerService()).getAll();
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
  const seasonGroups = [...liveGroup, ...historicalGroups];
  const groups: StatsGroup[] = [
    {id: 'overall', label: 'Overall', rows: buildOverallRows(seasonGroups)},
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
