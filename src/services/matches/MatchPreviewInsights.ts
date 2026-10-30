import 'server-only';
import {selectSwingPlayer, selectProvenPlayer} from './selectSwingPlayer';

import {unstable_cache} from 'next/cache';
import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {HISTORICAL_STATS_CACHE_TAG} from '@/core/historicalStatsCacheTag';

type HistoricalTeamMatch = {
  away_team_name: string;
  home_team_name: string;
  away_score: number;
  home_score: number;
};

type HistoricalPlayerResult = {
  player_id: string;
  player_name: string;
  player_team_name: string;
  opponent_team_name: string;
  outcome: 'W' | 'L' | 'T';
};

export type MatchPreviewInsights = {
  series: string;
  proven: string;
  swing: string;
};

export async function getMatchPreviewInsights(input: {
  awayName: string;
  homeName: string;
  awayRoster: LaunchPlayer[];
  homeRoster: LaunchPlayer[];
}): Promise<MatchPreviewInsights> {
  const [teamMatches, playerResults] = await Promise.all([
    loadHistoricalTeamMatches(),
    loadHistoricalPlayerResults(),
  ]);

  return buildMatchPreviewInsights(input, teamMatches, playerResults);
}

export function buildMatchPreviewInsights(
  input: {awayName: string; homeName: string; awayRoster: LaunchPlayer[]; homeRoster: LaunchPlayer[]},
  teamMatches: HistoricalTeamMatch[],
  playerResults: HistoricalPlayerResult[],
): MatchPreviewInsights {
  const pair = new Set([normalize(input.awayName), normalize(input.homeName)]);
  const meetings = teamMatches.filter((match) => {
    return pair.has(normalize(match.away_team_name))
      && pair.has(normalize(match.home_team_name));
  });
  const wins = new Map<string, number>();
  for (const match of meetings) {
    if (match.away_score === match.home_score) continue;
    const winner = match.away_score > match.home_score ? match.away_team_name : match.home_team_name;
    wins.set(winner, (wins.get(winner) ?? 0) + 1);
  }

  const seriesLeader = [...wins.entries()].sort((left, right) => right[1] - left[1])[0];
  const series = seriesLeader
    ? `${shortTeamName(seriesLeader[0])} leads ${seriesLeader[1]}–${meetings.length - seriesLeader[1]}`
    : meetings.length ? `Series tied ${meetings.length / 2}–${meetings.length / 2}` : 'First meeting';

  const selections = [
    {name: input.awayName, opponent: input.homeName, roster: input.awayRoster},
    {name: input.homeName, opponent: input.awayName, roster: input.homeRoster},
  ].map((team) => ({...team,
    swing: selectSwingPlayer(team.roster, team.opponent, playerResults),
  }));
  const proven = selections.map((team) => {
    const player = selectProvenPlayer(team.roster, playerResults, team.swing?.id);
    if (!player) return `${shortTeamName(team.name)}: No other proven player on record`;
    const ci = player.clashIndex == null ? '' : ` · CI ${player.clashIndex}`;
    return `${shortTeamName(team.name)}: ${player.name}${ci} · ${player.wins} historical wins`;
  }).join('\n');
  const swing = selections.map((team) => {
    const player = team.swing;
    if (!player) return `${shortTeamName(team.name)}: Roster unavailable`;
    const record = player.wins + player.losses + player.ties
      ? `${player.wins}–${player.losses}${player.ties ? `–${player.ties}` : ''}`
      : 'First recorded meeting';
    return `${shortTeamName(team.name)}: ${player.name} · CI ${player.clashIndex ?? 'unavailable'} · ${record} vs ${shortTeamName(team.opponent)}`;
  }).join('\n');

  return {series, proven, swing};
}

const loadHistoricalTeamMatches = unstable_cache(
  async (): Promise<HistoricalTeamMatch[]> => {
    const supabase = await createHistoricalStatsReadClient();
    const {data, error} = await supabase
      .from('historical_team_matches')
      .select('away_team_name,home_team_name,away_score,home_score');
    if (error) throw error;
    return (data ?? []) as HistoricalTeamMatch[];
  },
  ['match-preview-historical-team-matches-v1'],
  {revalidate: 3600, tags: [HISTORICAL_STATS_CACHE_TAG]},
);

const loadHistoricalPlayerResults = unstable_cache(
  async (): Promise<HistoricalPlayerResult[]> => {
    const supabase = await createHistoricalStatsReadClient();
    const rows: HistoricalPlayerResult[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const {data, error} = await supabase
        .from('historical_player_matchups')
        .select('player_id,player_name,player_team_name,opponent_team_name,outcome')
        .order('deduplication_key')
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      const page = (data ?? []) as HistoricalPlayerResult[];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  },
  ['match-preview-historical-player-results-v2'],
  {revalidate: 3600, tags: [HISTORICAL_STATS_CACHE_TAG]},
);

function normalize(value: string) {
  return value.toLocaleLowerCase('en').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function shortTeamName(value: string) {
  const normalized = normalize(value);
  if (normalized === 'cougar country') return 'CC';
  if (normalized === 'dark knights') return 'DK';
  if (normalized === 'hayneous ogs') return 'OG’s';
  if (normalized === 'wild turkey') return 'WT';
  if (normalized === 'beast mode') return 'BM';
  if (normalized === 'riptide') return 'RIP';
  if (normalized === 'ninjas') return 'NIN';
  return value;
}
