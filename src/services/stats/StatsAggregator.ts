import type {StatsGroup, StatsRow} from '@/services/stats/StatsTypes';

export const MIN_STATS_MATCHES = 3;

export function buildOverallRows(groups: StatsGroup[]): StatsRow[] {
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
      existing.winPercentage = decisions ? ((existing.wins + existing.ties * 0.5) / decisions) * 100 : 0;
      players.set(row.playerId, existing);
    }
  }

  return Array.from(players.values()).map(({teams, ciComplete, ...row}) => {
    const teamNames = Array.from(teams).sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
    const completeRow: StatsRow = {
      ...row,
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

export function qualifyStatsGroups(groups: StatsGroup[], minimumMatches = MIN_STATS_MATCHES): StatsGroup[] {
  return groups.map((group) => ({
    ...group,
    rows: group.rows.filter((row) => row.matchesPlayed >= minimumMatches),
  }));
}
