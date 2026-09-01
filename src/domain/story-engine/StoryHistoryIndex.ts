import type {RatedResult} from './RatedResult';
import {UPSET_WIN_PROBABILITY_THRESHOLD} from './triggers/UpsetTrigger';

export type StoryResultScope = {
  seasonId?: string;
  format?: RatedResult['format'];
};

export type PlayerHeadToHeadRecord = {
  playerAId: string;
  playerBId: string;
  meetings: number;
  playerAWins: number;
  playerBWins: number;
  ties: number;
  lastMeetingAt: string | null;
};

export type DoublesPairRecord = {
  playerIds: [string, string];
  contests: number;
  wins: number;
  losses: number;
  ties: number;
  expectedPoints: number;
  actualPoints: number;
  performanceVsExpected: number;
  lastPlayedAt: string | null;
};

export type RankedOccurrence = {
  rank: number;
  total: number;
};

export type PlayerCiObservation = {
  resultId: string;
  resultIds: string[];
  matchId: string;
  eventId: string;
  seasonId: string;
  teamId: string;
  playedAt: string;
  before: number;
  after: number;
  delta: number;
};

export type PlayerCiWindow = {
  playerId: string;
  matchdays: number;
  totalDelta: number;
  startCi: number;
  currentCi: number;
  observations: PlayerCiObservation[];
};

type PlayerCiContribution = {
  result: RatedResult;
  before: number;
  delta: number;
};

function chronological(a: RatedResult, b: RatedResult): number {
  return a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id);
}

function inScope(result: RatedResult, scope: StoryResultScope): boolean {
  return (!scope.seasonId || result.seasonId === scope.seasonId)
    && (!scope.format || result.format === scope.format);
}

function pairKey(playerAId: string, playerBId: string): [string, string] {
  return playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
}

function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function longestWinStreak(rows: RatedResult[]): number {
  let longest = 0;
  let current = 0;
  for (const result of [...rows].sort(chronological)) {
    if (result.won) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function ciContribution(result: RatedResult, playerId: string): PlayerCiContribution | null {
  const index = result.subjectPlayerIds.indexOf(playerId);
  if (index < 0) return null;

  const before = result.subjectCiBefore?.[index]
    ?? (result.format === 'Singles' ? result.subjectEffectiveCi : undefined);
  const delta = result.subjectCiDeltas?.[index]
    ?? (result.format === 'Singles' ? result.ciDelta : undefined);
  if (!finite(before) || !finite(delta)) return null;
  return {result, before, delta};
}

export class StoryHistoryIndex {
  private readonly results: RatedResult[];
  private readonly byContestId = new Map<string, RatedResult[]>();
  private readonly byPlayerId = new Map<string, RatedResult[]>();
  private readonly byTeamId = new Map<string, RatedResult[]>();

  constructor(results: RatedResult[]) {
    this.results = [...results].sort(chronological);
    for (const result of this.results) {
      this.push(this.byContestId, result.contestId, result);
      this.push(this.byTeamId, result.teamId, result);
      for (const playerId of result.subjectPlayerIds) this.push(this.byPlayerId, playerId, result);
    }
  }

  playerResults(playerId: string, scope: StoryResultScope = {}): RatedResult[] {
    return (this.byPlayerId.get(playerId) ?? []).filter((result) => inScope(result, scope));
  }

  teamResults(teamId: string, scope: StoryResultScope = {}): RatedResult[] {
    return (this.byTeamId.get(teamId) ?? []).filter((result) => inScope(result, scope));
  }

  contestSides(contestId: string): RatedResult[] {
    return [...(this.byContestId.get(contestId) ?? [])];
  }

  opponentSide(result: RatedResult): RatedResult | null {
    return (this.byContestId.get(result.contestId) ?? []).find((candidate) => candidate.side !== result.side) ?? null;
  }

  playerHeadToHead(
    playerAId: string,
    playerBId: string,
    scope: StoryResultScope = {},
  ): PlayerHeadToHeadRecord {
    let playerAWins = 0;
    let playerBWins = 0;
    let ties = 0;
    let lastMeetingAt: string | null = null;
    const effectiveScope: StoryResultScope = {format: 'Singles', ...scope};

    const meetings = this.playerResults(playerAId, effectiveScope).filter((result) => {
      const opponent = this.opponentSide(result);
      if (!opponent?.subjectPlayerIds.includes(playerBId)) return false;
      lastMeetingAt = result.playedAt;
      if (result.outcome === 'W') playerAWins += 1;
      else if (result.outcome === 'L') playerBWins += 1;
      else ties += 1;
      return true;
    }).length;

    return {playerAId, playerBId, meetings, playerAWins, playerBWins, ties, lastMeetingAt};
  }

  doublesPairRecord(playerAId: string, playerBId: string, scope: Omit<StoryResultScope, 'format'> = {}): DoublesPairRecord {
    const playerIds = pairKey(playerAId, playerBId);
    const rows = this.playerResults(playerIds[0], {...scope, format: 'Doubles'})
      .filter((result) => result.subjectPlayerIds.includes(playerIds[1]));

    let wins = 0;
    let losses = 0;
    let ties = 0;
    let expectedPoints = 0;
    let actualPoints = 0;
    for (const result of rows) {
      if (result.outcome === 'W') wins += 1;
      else if (result.outcome === 'L') losses += 1;
      else ties += 1;
      expectedPoints += result.expectedPoints;
      actualPoints += result.actualPoints;
    }

    return {
      playerIds,
      contests: rows.length,
      wins,
      losses,
      ties,
      expectedPoints,
      actualPoints,
      performanceVsExpected: actualPoints - expectedPoints,
      lastPlayedAt: rows.at(-1)?.playedAt ?? null,
    };
  }

  playerLongestWinStreak(
    playerId: string,
    format: RatedResult['format'],
    scope: Omit<StoryResultScope, 'format'> = {},
  ): number {
    return longestWinStreak(this.playerResults(playerId, {...scope, format}));
  }

  winStreakRank(
    streakLength: number,
    format: RatedResult['format'],
    scope: Omit<StoryResultScope, 'format'> = {},
  ): RankedOccurrence | null {
    if (streakLength <= 0) return null;
    const longestByPlayer = [...this.byPlayerId.keys()]
      .map((playerId) => this.playerLongestWinStreak(playerId, format, scope))
      .filter((length) => length > 0);
    if (longestByPlayer.length === 0) return null;
    return {
      rank: 1 + longestByPlayer.filter((length) => length > streakLength).length,
      total: longestByPlayer.length,
    };
  }

  playerCiObservations(
    playerId: string,
    scope: Omit<StoryResultScope, 'format'> = {},
  ): PlayerCiObservation[] {
    const groups = new Map<string, RatedResult[]>();
    for (const result of this.playerResults(playerId, scope)) {
      const key = `${result.seasonId}\u0000${result.matchId}`;
      const rows = groups.get(key) ?? [];
      rows.push(result);
      groups.set(key, rows);
    }

    const observations: PlayerCiObservation[] = [];
    for (const rows of groups.values()) {
      rows.sort(chronological);
      if (rows.some((result) => result.ciHistoryReliable === false)) continue;
      const contributions = rows
        .map((result) => ciContribution(result, playerId))
        .filter((value): value is PlayerCiContribution => value !== null);
      if (contributions.length !== rows.length || contributions.length === 0) continue;

      const first = contributions[0];
      if (contributions.some(({result, before}) =>
        before !== first.before
        || result.seasonId !== first.result.seasonId
        || result.eventId !== first.result.eventId
        || result.teamId !== first.result.teamId
        || result.playedAt !== first.result.playedAt,
      )) continue;

      const delta = contributions.reduce((sum, contribution) => sum + contribution.delta, 0);
      const representative = rows.at(-1)!;
      observations.push({
        resultId: representative.id,
        resultIds: rows.map((result) => result.id),
        matchId: representative.matchId,
        eventId: representative.eventId,
        seasonId: representative.seasonId,
        teamId: representative.teamId,
        playedAt: representative.playedAt,
        before: first.before,
        after: first.before + delta,
        delta,
      });
    }

    return observations.sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.matchId.localeCompare(b.matchId));
  }

  playerCiWindow(
    playerId: string,
    matchdays: number,
    scope: Omit<StoryResultScope, 'format'> = {},
  ): PlayerCiWindow | null {
    if (matchdays <= 0) return null;
    const observations = this.playerCiObservations(playerId, scope).slice(-matchdays);
    if (observations.length !== matchdays) return null;
    return {
      playerId,
      matchdays,
      totalDelta: observations.reduce((sum, observation) => sum + observation.delta, 0),
      startCi: observations[0].before,
      currentCi: observations.at(-1)!.after,
      observations,
    };
  }

  ciWindowRank(
    playerId: string,
    matchdays: number,
    scope: Omit<StoryResultScope, 'format'> = {},
  ): RankedOccurrence | null {
    const target = this.playerCiWindow(playerId, matchdays, scope);
    if (!target) return null;
    const windows = [...this.byPlayerId.keys()]
      .map((candidatePlayerId) => this.playerCiWindow(candidatePlayerId, matchdays, scope))
      .filter((window): window is PlayerCiWindow => window !== null)
      .sort((a, b) => b.totalDelta - a.totalDelta || b.currentCi - a.currentCi || a.playerId.localeCompare(b.playerId));
    const index = windows.findIndex((window) => window.playerId === playerId);
    return index < 0 ? null : {rank: index + 1, total: windows.length};
  }

  upsetRank(resultId: string, scope: StoryResultScope = {}): RankedOccurrence | null {
    const target = this.results.find((result) => result.id === resultId);
    if (!target?.won || target.winProbability >= UPSET_WIN_PROBABILITY_THRESHOLD) return null;
    const upsets = this.results
      .filter((result) => result.won && result.winProbability < UPSET_WIN_PROBABILITY_THRESHOLD && inScope(result, scope))
      .sort((a, b) => a.winProbability - b.winProbability || b.ciDeficit - a.ciDeficit || a.id.localeCompare(b.id));
    const index = upsets.findIndex((result) => result.id === resultId);
    return index < 0 ? null : {rank: index + 1, total: upsets.length};
  }

  private push(map: Map<string, RatedResult[]>, key: string, result: RatedResult): void {
    const rows = map.get(key) ?? [];
    rows.push(result);
    map.set(key, rows);
  }
}
