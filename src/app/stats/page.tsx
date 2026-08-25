import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StatsTable} from '@/components/stats/StatsTable';
import {
  getHistoricalSeasonArchives,
  isHistoricalFemalePlayer,
  type HistoricalPlayerSeasonSummary,
} from '@/data/historicalSeed';
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
};

export type StatsGroup = {
  id: string;
  label: string;
  rows: StatsRow[];
};

const MIN_STATS_MATCHES = 3;

function compactSeasonName(name: string): string {
  const withoutLeagueName = name.replace(/^Coastal Clash Match Play\s*/i, '');
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
  const sourceGroups: StatsGroup[] = archives.map((archive) => ({
    id: archive.seasonId,
    label: compactSeasonName(archive.seasonName),
    rows: archive.playerSummaries.filter((summary) => summary.matchesPlayed > 0).map(toRow),
  }));
  const seasonGroups = sourceGroups.map((group) => ({
    ...group,
    rows: group.rows.filter((row) => row.matchesPlayed >= MIN_STATS_MATCHES),
  }));
  const groups: StatsGroup[] = [
    {id: 'overall', label: 'Overall', rows: buildOverallRows(sourceGroups).filter((row) => row.matchesPlayed >= MIN_STATS_MATCHES)},
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
