import type {HistoricalPlayerSeasonSummary} from '@/data/historicalSeed';
import {isHistoricalFemalePlayer} from '@/data/historicalSeed';
import type {Player} from '@/models/Player';
import type {HistoricalCiLedgerSummary} from '@/services/statistics/HistoricalCiLedgerSummary';
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
