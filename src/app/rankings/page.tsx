import {Footer, SiteHeader} from '@/components/SiteHeader';
import {
  RankingsClient,
  type ClashRankingEntry,
  type HistoricalRankingEntry,
  type SeasonRankingGroup,
} from '@/components/rankings/RankingsClient';
import {
  getHistoricalSeasonArchives,
  isHistoricalFemalePlayer,
  type HistoricalPlayerSeasonSummary,
} from '@/data/historicalSeed';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import styles from './Rankings.module.css';

export const dynamic = 'force-dynamic';

export default async function RankingsPage() {
  const archives = getHistoricalSeasonArchives();
  const currentArchive = archives[0];
  const historyArchives = archives.slice(1);
  const current = currentArchive
    ? buildSeasonGroup(currentArchive.seasonId, currentArchive.seasonName, currentArchive.playerSummaries, true)
    : undefined;
  const history = historyArchives.map((archive) =>
    buildSeasonGroup(archive.seasonId, archive.seasonName, archive.playerSummaries, false));
  const clashRankings = await getClashRankings();

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.rankingsPage}`}>
        <header className={styles.pageHeader}>
          <div>
            <span className="eyebrow">League leaderboard</span>
            <h1>Player Rankings</h1>
          </div>
          {current ? <p>{current.seasonName}</p> : null}
        </header>

        <RankingsClient
          current={current}
          history={history}
          clash={clashRankings}
        />
      </main>
      <Footer />
    </>
  );
}

function buildSeasonGroup(
  seasonId: string,
  seasonName: string,
  summaries: HistoricalPlayerSeasonSummary[],
  includeJunior: boolean,
): SeasonRankingGroup {
  const open = rankSeasonEntries(summaries);
  const women = rankSeasonEntries(summaries.filter((summary) => isHistoricalFemalePlayer(summary.playerName)));

  return {
    seasonId,
    seasonName,
    open,
    women,
    junior: includeJunior ? [] : undefined,
  };
}

function rankSeasonEntries(summaries: HistoricalPlayerSeasonSummary[]): HistoricalRankingEntry[] {
  const sorted = [...summaries]
    .filter((summary) => summary.matchesPlayed > 0)
    .sort(compareSeasonSummaries);

  let previous: HistoricalPlayerSeasonSummary | undefined;
  let previousRank = 0;

  return sorted.map((summary, index) => {
    const rank = previous && sameSeasonRank(previous, summary) ? previousRank : index + 1;
    previous = summary;
    previousRank = rank;
    return {rank, summary};
  });
}

function compareSeasonSummaries(first: HistoricalPlayerSeasonSummary, second: HistoricalPlayerSeasonSummary): number {
  return seasonPoints(second) - seasonPoints(first)
    || second.overallRecord.wins - first.overallRecord.wins
    || second.overallRecord.ties - first.overallRecord.ties
    || first.overallRecord.losses - second.overallRecord.losses
    || first.playerName.localeCompare(second.playerName, undefined, {sensitivity: 'base'});
}

function sameSeasonRank(first: HistoricalPlayerSeasonSummary, second: HistoricalPlayerSeasonSummary): boolean {
  return seasonPoints(first) === seasonPoints(second)
    && first.overallRecord.wins === second.overallRecord.wins
    && first.overallRecord.ties === second.overallRecord.ties
    && first.overallRecord.losses === second.overallRecord.losses;
}

function seasonPoints(summary: HistoricalPlayerSeasonSummary): number {
  return summary.overallRecord.wins + summary.overallRecord.ties * 0.5;
}

async function getClashRankings(): Promise<{
  open: ClashRankingEntry[];
  women: ClashRankingEntry[];
  junior: ClashRankingEntry[];
}> {
  if (!hasSupabaseConfig()) return {open: [], women: [], junior: []};

  try {
    const supabase = await createClient();
    const repository = new SupabaseLaunchRepository(supabase);
    const [players, teams] = await Promise.all([
      repository.getPlayers(),
      repository.getTeams(),
    ]);
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const ranked = players
      .filter((player) => player.active && player.clashIndex != null)
      .sort((first, second) =>
        (second.clashIndex ?? 0) - (first.clashIndex ?? 0)
        || first.name.localeCompare(second.name, undefined, {sensitivity: 'base'}));

    const withRanks = toClashEntries(ranked.map((player) => ({
      playerId: player.id,
      playerName: player.name,
      teamName: player.currentTeamId ? teamNames.get(player.currentTeamId) ?? 'Unassigned' : 'Unassigned',
      clashIndex: player.clashIndex ?? 0,
      gender: player.gender,
    })));

    return {
      open: withRanks,
      women: toClashEntries(withRanks.filter((entry) => entry.gender === 'Female')),
      junior: [],
    };
  } catch (error) {
    console.error('Clash Index rankings are unavailable.', error);
    return {open: [], women: [], junior: []};
  }
}

function toClashEntries(entries: Array<Omit<ClashRankingEntry, 'rank'>>): ClashRankingEntry[] {
  let previousIndex: number | undefined;
  let previousRank = 0;

  return entries.map((entry, index) => {
    const rank = previousIndex === entry.clashIndex ? previousRank : index + 1;
    previousIndex = entry.clashIndex;
    previousRank = rank;
    return {...entry, rank};
  });
}
