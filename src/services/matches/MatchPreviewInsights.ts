import 'server-only';

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

  const teamNames = new Set([normalize(input.awayName), normalize(input.homeName)]);
  const relevantResults = playerResults.filter((row) => teamNames.has(normalize(row.player_team_name)));
  const playerWins = countWins(relevantResults);
  const provenLeaders = [input.awayRoster, input.homeRoster]
    .map((roster) => bestPlayerForRoster(relevantResults, playerWins, roster))
    .filter((leader): leader is {name: string; wins: number} => Boolean(leader));
  const proven = provenLeaders.length
    ? provenLeaders.map((leader) => `${lastName(leader.name)} · ${leader.wins} wins`).join('  ·  ')
    : 'History building';

  const rosterById = new Map([...input.awayRoster, ...input.homeRoster].map((player) => [player.id, player]));
  const versusRows = playerResults.filter((row) => {
    const team = normalize(row.player_team_name);
    const opponent = normalize(row.opponent_team_name);
    return teamNames.has(team) && teamNames.has(opponent) && team !== opponent;
  });
  const versusWins = countWins(versusRows);
  const candidates = [...new Set(versusRows.map((row) => row.player_id))]
    .map((playerId) => {
      const row = versusRows.find((result) => result.player_id === playerId)!;
      const player = rosterById.get(playerId);
      return {
        name: player?.name ?? row.player_name,
        wins: versusWins.get(playerId) ?? 0,
        ci: player?.clashIndex ?? 1000,
        onRoster: rosterById.has(playerId),
      };
    })
    .filter((candidate) => candidate.wins > 0)
    .sort((left, right) => Number(right.onRoster) - Number(left.onRoster)
      || right.wins - left.wins
      || left.ci - right.ci
      || left.name.localeCompare(right.name));
  const swing = candidates[0]
    ? `${candidates[0].name} · ${candidates[0].wins}–0 vs opponent`
    : 'A new matchup to watch';

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
    const {data, error} = await supabase
      .from('historical_player_matchups')
      .select('player_id,player_name,player_team_name,opponent_team_name,outcome');
    if (error) throw error;
    return (data ?? []) as HistoricalPlayerResult[];
  },
  ['match-preview-historical-player-results-v1'],
  {revalidate: 3600, tags: [HISTORICAL_STATS_CACHE_TAG]},
);

function countWins(rows: HistoricalPlayerResult[]) {
  const wins = new Map<string, number>();
  for (const row of rows) {
    if (row.outcome === 'W') wins.set(row.player_id, (wins.get(row.player_id) ?? 0) + 1);
  }
  return wins;
}

function bestPlayerForRoster(rows: HistoricalPlayerResult[], wins: Map<string, number>, roster: LaunchPlayer[]) {
  const rosterIds = new Set(roster.map((player) => player.id));
  const players = rows.filter((row) => rosterIds.has(row.player_id));
  const best = players
    .map((row) => ({name: row.player_name, wins: wins.get(row.player_id) ?? 0}))
    .sort((left, right) => right.wins - left.wins || left.name.localeCompare(right.name))[0];
  return best?.wins ? best : undefined;
}

function normalize(value: string) {
  return value.toLocaleLowerCase('en').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function lastName(value: string) {
  return value.trim().split(/\s+/).at(-1) ?? value;
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
