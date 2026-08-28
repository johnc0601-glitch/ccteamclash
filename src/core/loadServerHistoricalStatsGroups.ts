import 'server-only';

import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import type {Player} from '@/models/Player';
import {
  playerSeasonCiKey,
  type HistoricalCiLedgerSummary,
} from '@/services/statistics/HistoricalCiLedgerSummary';
import {
  resolveHistoricalStatsGender,
  type StatsGroup,
  type StatsRow,
} from '@/services/stats/StatsPageModel';

const PAGE_SIZE = 1000;

type HistoricalStatsSummaryRow = {
  season_id: string;
  season_name: string;
  player_id: string;
  player_name: string;
  team_names: string[] | null;
  matches_played: number;
  wins: number;
  losses: number;
  ties: number;
  win_percentage: number;
  singles_wins: number;
  singles_losses: number;
  singles_ties: number;
  doubles_wins: number;
  doubles_losses: number;
  doubles_ties: number;
  points: number;
};

export async function loadServerHistoricalStatsGroups(
  ciByPlayerSeason: ReadonlyMap<string, HistoricalCiLedgerSummary>,
  genderByPlayerId: ReadonlyMap<string, Player['gender']>,
): Promise<StatsGroup[]> {
  const supabase = await createHistoricalStatsReadClient();
  const summaries: HistoricalStatsSummaryRow[] = [];
  let from = 0;

  while (true) {
    const {data, error} = await supabase
      .from('historical_player_stats_summary')
      .select('season_id,season_name,player_id,player_name,team_names,matches_played,wins,losses,ties,win_percentage,singles_wins,singles_losses,singles_ties,doubles_wins,doubles_losses,doubles_ties,points')
      .order('season_id', {ascending: false})
      .order('player_id', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as HistoricalStatsSummaryRow[];
    if (page.length === 0) break;
    summaries.push(...page);
    from += page.length;
  }

  const seasons = new Map<string, StatsGroup>();
  const seenPlayerSeasons = new Set<string>();

  for (const summary of summaries) {
    const playerSeasonKey = playerSeasonCiKey(summary.season_id, summary.player_id);
    if (seenPlayerSeasons.has(playerSeasonKey)) {
      throw new Error(`Duplicate historical Stats summary row for ${playerSeasonKey}.`);
    }
    seenPlayerSeasons.add(playerSeasonKey);

    const teamNames = [...(summary.team_names ?? [])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
    const ci = ciByPlayerSeason.get(playerSeasonKey);
    const row: StatsRow = {
      playerId: summary.player_id,
      playerName: summary.player_name,
      teamName: teamNames.length > 1 ? 'Multiple teams' : teamNames[0] ?? '',
      teamNames,
      gender: resolveHistoricalStatsGender(summary.player_id, summary.player_name, genderByPlayerId),
      matchesPlayed: Number(summary.matches_played),
      wins: Number(summary.wins),
      losses: Number(summary.losses),
      ties: Number(summary.ties),
      winPercentage: Number(summary.win_percentage),
      singlesWins: Number(summary.singles_wins),
      singlesLosses: Number(summary.singles_losses),
      singlesTies: Number(summary.singles_ties),
      doublesWins: Number(summary.doubles_wins),
      doublesLosses: Number(summary.doubles_losses),
      doublesTies: Number(summary.doubles_ties),
      points: Number(summary.points),
      ...(ci ? {
        clashIndex: ci.endingCi,
        ciGain: ci.ciGain,
        singlesCiGain: ci.singlesCiGain,
        doublesCiGain: ci.doublesCiGain,
      } : {}),
    };

    const season = seasons.get(summary.season_id) ?? {
      id: summary.season_id,
      label: summary.season_name,
      rows: [],
    };
    if (summary.season_name.length > season.label.length) season.label = summary.season_name;
    season.rows.push(row);
    seasons.set(summary.season_id, season);
  }

  const groups = [...seasons.values()].sort((a, b) => b.id.localeCompare(a.id));
  const totalRows = groups.reduce((total, group) => total + group.rows.length, 0);
  if (totalRows !== summaries.length) {
    throw new Error(`Historical Stats summary mismatch: loaded ${summaries.length} rows but built ${totalRows}.`);
  }

  console.info('[stats] Historical Stats summary loaded', {
    rows: summaries.length,
    seasons: groups.map((group) => ({id: group.id, players: group.rows.length})),
  });

  return groups;
}
