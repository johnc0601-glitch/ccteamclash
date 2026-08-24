import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RankingsClient, type ClashRankingEntry, type HistoricalRankingEntry, type SeasonRankingGroup} from '@/components/rankings/RankingsClient';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {SupabasePlayerRepository} from '@/repositories/SupabasePlayerRepository';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {RankingsService} from '@/services/rankings';
import type {RankingEntry} from '@/services/rankings/RankingTypes';
import {StatisticsEngine} from '@/services/statistics';
import {SupabaseStatisticsRepository} from '@/services/statistics/SupabaseStatisticsRepository';
import {TeamService} from '@/services/TeamService';
import styles from './Rankings.module.css';

export const dynamic = 'force-dynamic';

export default async function RankingsPage() {
  const [{current, error: seasonError}, {rankings: clashRankings, teamColors}] = await Promise.all([
    getLiveSeasonRankings(),
    getClashData(),
  ]);

  return <><SiteHeader /><main className={`shell page-shell ${styles.rankingsPage}`}><header className={styles.pageHeader}><h1>Player Rankings</h1>{current ? <p>Coastal Clash Match Play · {current.seasonName}</p> : null}</header>{seasonError ? <p className={styles.emptyState}>{seasonError}</p> : null}<RankingsClient current={current} clash={clashRankings} teamColors={teamColors} /></main><Footer /></>;
}

async function getLiveSeasonRankings(): Promise<{current?: SeasonRankingGroup; error?: string}> {
  if (!hasSupabaseConfig()) {
    return {error: 'Current-season rankings are unavailable because live league data is not configured.'};
  }

  try {
    const supabase = await createClient();
    const teams = new TeamService(new SupabaseScheduleTeamRepository(supabase));
    const players = new PlayerService(new SupabasePlayerRepository(supabase), teams);
    const seasons = new SeasonService(new SupabaseSeasonRepository(supabase));
    const statistics = new StatisticsEngine(new SupabaseStatisticsRepository(supabase));
    const rankings = new RankingsService(players, statistics);
    const activeSeason = await seasons.getActive();

    if (!activeSeason) return {};

    const [rankedPlayers, activeTeams] = await Promise.all([
      rankings.getTotalRankings(activeSeason.id),
      teams.getAll({status: 'active'}),
    ]);
    const teamNames = new Map(activeTeams.map((team) => [team.id, team.name]));
    const open = rankedPlayers.map((entry) => toLiveRankingEntry(entry, activeSeason.name, teamNames));
    const women = rankedPlayers
      .filter((entry) => entry.player.gender === 'Female')
      .map((entry, index) => toLiveRankingEntry(entry, activeSeason.name, teamNames, index + 1));

    return {
      current: {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        open,
        women,
        junior: [],
      },
    };
  } catch (error) {
    console.error('Current-season rankings are unavailable.', error);
    return {error: 'Current-season rankings are temporarily unavailable. Clash Index ratings are still available.'};
  }
}

function toLiveRankingEntry(
  entry: RankingEntry,
  seasonName: string,
  teamNames: Map<string, string>,
  rank = entry.rank,
): HistoricalRankingEntry {
  const teamId = entry.player.teamId || entry.statistics.teamIds[0] || '';
  return {
    rank,
    summary: {
      playerId: entry.player.id,
      playerName: entry.player.name,
      teamId,
      teamName: teamNames.get(teamId) ?? 'Unassigned',
      seasonId: entry.statistics.seasonId,
      seasonName,
      matchesPlayed: entry.statistics.matchesPlayed,
      singlesRecord: entry.statistics.singlesRecord,
      doublesRecord: entry.statistics.doublesRecord,
      overallRecord: entry.statistics.overallRecord,
      winPercentage: entry.statistics.winPercentage,
    },
  };
}

async function getClashData(): Promise<{rankings: {open: ClashRankingEntry[]; women: ClashRankingEntry[]; junior: ClashRankingEntry[]}; teamColors: Record<string, string>}> {
  const empty = {rankings: {open: [], women: [], junior: []}, teamColors: {}};
  if (!hasSupabaseConfig()) return empty;
  try {
    const supabase = await createClient();
    const repository = new SupabaseLaunchRepository(supabase);
    const [players, teamResult] = await Promise.all([
      repository.getPlayers(),
      (supabase as any).from('launch_teams').select('id, name, primary_color').eq('active', true).order('name'),
    ]);
    if (teamResult.error) throw teamResult.error;
    const teams = (teamResult.data ?? []) as Array<{id: string; name: string; primary_color: string | null}>;
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const teamColors = Object.fromEntries(teams.map((team) => [team.name, team.primary_color || '#006f71']));
    const ranked = players.filter((player) => player.active && player.clashIndex != null).sort((first, second) => (second.clashIndex ?? 0) - (first.clashIndex ?? 0) || first.name.localeCompare(second.name, undefined, {sensitivity: 'base'}));
    const withRanks = toClashEntries(ranked.map((player) => ({playerId: player.id, playerName: player.name, teamName: player.currentTeamId ? teamNames.get(player.currentTeamId) ?? 'Unassigned' : 'Unassigned', clashIndex: player.clashIndex ?? 0, gender: player.gender, provisional: isGhostSeed(player)})));
    return {rankings: {open: withRanks, women: toClashEntries(withRanks.filter((entry) => entry.gender === 'Female')), junior: []}, teamColors};
  } catch (error) {
    console.error('Clash Index rankings are unavailable.', error);
    return empty;
  }
}

function isGhostSeed(player: LaunchPlayer): boolean {
  if (player.clashIndexProvisional === true) return true;
  return player.pdgaRating == null && (
    (player.gender === 'Female' && player.clashIndex === 725)
    || (player.gender === 'Male' && player.clashIndex === 850)
  );
}

function toClashEntries(entries: Array<Omit<ClashRankingEntry, 'rank'>>): ClashRankingEntry[] {
  let previousIndex: number | undefined; let previousRank = 0;
  return entries.map((entry, index) => {const rank = previousIndex === entry.clashIndex ? previousRank : index + 1; previousIndex = entry.clashIndex; previousRank = rank; return {...entry, rank};});
}
