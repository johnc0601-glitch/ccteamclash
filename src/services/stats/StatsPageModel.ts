import type {HistoricalPlayerSeasonSummary} from '@/data/historicalSeed';
import {isHistoricalFemalePlayer} from '@/data/historicalSeed';
import type {Player} from '@/models/Player';
import {
  playerSeasonCiKey,
  type HistoricalCiLedgerSummary,
} from '@/services/statistics/HistoricalCiLedgerSummary';
import type {StatsPlayerView} from '@/services/stats/StatsQueryService';

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
  clashIndex?: number;
  ciGain?: number;
  singlesCiGain?: number;
  doublesCiGain?: number;
};

export type StatsGroup = {
  id: string;
  label: string;
  rows: StatsRow[];
};

export type HistoricalStatsMatchupRowInput = {
  deduplication_key: string;
  season_id: string;
  season_name: string;
  match_format: string;
  player_id: string;
  player_name: string;
  player_team_name: string;
  outcome: string;
};

export const MIN_STATS_MATCHES = 1;

export function resolveHistoricalStatsGender(
  playerId: string,
  playerName: string,
  genderByPlayerId: ReadonlyMap<string, Player['gender']>,
): StatsRow['gender'] {
  const canonicalGender = genderByPlayerId.get(playerId);
  if (canonicalGender === 'Female') return 'Women';
  if (canonicalGender === 'Male') return 'Open';
  return isHistoricalFemalePlayer(playerName) ? 'Women' : 'Open';
}

export function buildHistoricalStatsGroups(
  matchupRows: HistoricalStatsMatchupRowInput[],
  ciByPlayerSeason: ReadonlyMap<string, HistoricalCiLedgerSummary>,
  genderByPlayerId: ReadonlyMap<string, Player['gender']>,
): StatsGroup[] {
  type PlayerAccumulator = {
    playerId: string;
    playerName: string;
    teams: Set<string>;
    matchesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    singlesWins: number;
    singlesLosses: number;
    singlesTies: number;
    doublesWins: number;
    doublesLosses: number;
    doublesTies: number;
  };
  type SeasonAccumulator = {
    id: string;
    name: string;
    players: Map<string, PlayerAccumulator>;
  };

  const seasons = new Map<string, SeasonAccumulator>();
  for (const matchup of matchupRows) {
    const season = seasons.get(matchup.season_id) ?? {
      id: matchup.season_id,
      name: matchup.season_name,
      players: new Map<string, PlayerAccumulator>(),
    };
    if (season.name !== matchup.season_name) {
      throw new Error(`Historical Stats season ${matchup.season_id} has conflicting names: ${season.name} / ${matchup.season_name}`);
    }

    const player = season.players.get(matchup.player_id) ?? {
      playerId: matchup.player_id,
      playerName: matchup.player_name,
      teams: new Set<string>(),
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      singlesWins: 0,
      singlesLosses: 0,
      singlesTies: 0,
      doublesWins: 0,
      doublesLosses: 0,
      doublesTies: 0,
    };
    if (player.playerName !== matchup.player_name) {
      throw new Error(`Historical Stats player ${matchup.player_id} has conflicting names: ${player.playerName} / ${matchup.player_name}`);
    }

    if (matchup.player_team_name) player.teams.add(matchup.player_team_name);
    player.matchesPlayed += 1;

    const outcome = matchup.outcome.trim().toUpperCase();
    const format = matchup.match_format.trim().toLowerCase();
    const isSingles = format === 'singles';
    const isDoubles = format === 'doubles';
    if (!isSingles && !isDoubles) {
      throw new Error(`Historical Stats matchup ${matchup.deduplication_key} has unsupported format ${matchup.match_format}`);
    }

    if (outcome === 'W') {
      player.wins += 1;
      if (isSingles) player.singlesWins += 1;
      else player.doublesWins += 1;
    } else if (outcome === 'L') {
      player.losses += 1;
      if (isSingles) player.singlesLosses += 1;
      else player.doublesLosses += 1;
    } else if (outcome === 'T') {
      player.ties += 1;
      if (isSingles) player.singlesTies += 1;
      else player.doublesTies += 1;
    } else {
      throw new Error(`Historical Stats matchup ${matchup.deduplication_key} has unsupported outcome ${matchup.outcome}`);
    }

    season.players.set(matchup.player_id, player);
    seasons.set(matchup.season_id, season);
  }

  return [...seasons.values()]
    .sort((a, b) => b.id.localeCompare(a.id))
    .map((season): StatsGroup => ({
      id: season.id,
      label: season.name,
      rows: [...season.players.values()].map((player): StatsRow => {
        const teamNames = [...player.teams].sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
        const ci = ciByPlayerSeason.get(playerSeasonCiKey(season.id, player.playerId));
        const decisions = player.wins + player.losses + player.ties;
        return {
          playerId: player.playerId,
          playerName: player.playerName,
          teamName: teamNames.length > 1 ? 'Multiple teams' : teamNames[0] ?? '',
          teamNames,
          gender: resolveHistoricalStatsGender(player.playerId, player.playerName, genderByPlayerId),
          matchesPlayed: player.matchesPlayed,
          wins: player.wins,
          losses: player.losses,
          ties: player.ties,
          winPercentage: decisions ? ((player.wins + player.ties * .5) / decisions) * 100 : 0,
          singlesWins: player.singlesWins,
          singlesLosses: player.singlesLosses,
          singlesTies: player.singlesTies,
          doublesWins: player.doublesWins,
          doublesLosses: player.doublesLosses,
          doublesTies: player.doublesTies,
          points: player.wins + player.ties * .5,
          ...(ci ? {
            clashIndex: ci.endingCi,
            ciGain: ci.ciGain,
            singlesCiGain: ci.singlesCiGain,
            doublesCiGain: ci.doublesCiGain,
          } : {}),
        };
      }),
    }));
}

export function toHistoricalStatsRow(
  summary: HistoricalPlayerSeasonSummary,
  ci: HistoricalCiLedgerSummary | undefined,
  genderByPlayerId: ReadonlyMap<string, Player['gender']>,
): StatsRow {
  const {wins, losses, ties} = summary.overallRecord;
  return {
    playerId: summary.playerId,
    playerName: summary.playerName,
    teamName: summary.teamName,
    teamNames: [summary.teamName],
    gender: resolveHistoricalStatsGender(summary.playerId, summary.playerName, genderByPlayerId),
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
      clashIndex: ci.endingCi,
      ciGain: ci.ciGain,
      singlesCiGain: ci.singlesCiGain,
      doublesCiGain: ci.doublesCiGain,
    } : {}),
  };
}

export function toLiveStatsRow(view: StatsPlayerView): StatsRow | undefined {
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
    clashIndex: view.player.clashIndex ?? undefined,
    ciGain: view.currentCiGain,
    singlesCiGain: view.currentSinglesCiGain,
    doublesCiGain: view.currentDoublesCiGain,
  };
}

export function qualifiesStatsRow(row: StatsRow, minimumMatches = MIN_STATS_MATCHES): boolean {
  return row.matchesPlayed >= minimumMatches;
}

export function buildOverallRows(
  groups: StatsGroup[],
  clashIndexByPlayer: ReadonlyMap<string, number>,
): StatsRow[] {
  const players = new Map<string, StatsRow & {teams: Set<string>; ciComplete: boolean}>();

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
        ciGain: 0,
        singlesCiGain: 0,
        doublesCiGain: 0,
        teams: new Set<string>(),
        ciComplete: true,
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
      if (row.ciGain === undefined || row.singlesCiGain === undefined || row.doublesCiGain === undefined) {
        existing.ciComplete = false;
      } else {
        existing.ciGain = (existing.ciGain ?? 0) + row.ciGain;
        existing.singlesCiGain = (existing.singlesCiGain ?? 0) + row.singlesCiGain;
        existing.doublesCiGain = (existing.doublesCiGain ?? 0) + row.doublesCiGain;
      }
      const decisions = existing.wins + existing.losses + existing.ties;
      existing.winPercentage = decisions ? ((existing.wins + existing.ties * .5) / decisions) * 100 : 0;
      players.set(row.playerId, existing);
    }
  }

  return Array.from(players.values()).map(({teams, ciComplete, ...row}) => {
    const teamNames = Array.from(teams).sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
    const currentCi = clashIndexByPlayer.get(row.playerId);
    const completeRow: StatsRow = {
      ...row,
      ...(currentCi === undefined ? {} : {clashIndex: currentCi}),
      teamNames,
      teamName: teamNames.length > 1 ? 'Multiple teams' : teamNames[0] ?? row.teamName,
    };
    if (ciComplete) return completeRow;
    const {
      ciGain: _partialCiGain,
      singlesCiGain: _partialSinglesCiGain,
      doublesCiGain: _partialDoublesCiGain,
      ...withoutPartialCi
    } = completeRow;
    return withoutPartialCi;
  });
}
