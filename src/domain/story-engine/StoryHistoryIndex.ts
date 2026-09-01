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
  contestId: string;
  eventId: string;
  seasonId: string;
  format: RatedResult['format'];
  teamId: string;
  playedAt: string;
  before: number;
  after: number;
  delta: number;
};

export type PlayerCiWindow = {
  playerId: string;
  contests: number;
  totalDelta: number;
  startCi: number;
  currentCi: number;
  observations: PlayerCiObservation[];
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

function ciObservation(result: RatedResult, playerId: string): PlayerCiObservation | null {
  const index = result.subjectPlayerIds.indexOf(playerId);
  if (index < 0) return null;

  // Singles can safely fall back to the aggregate fields because a singles side
  // contains exactly one player. Doubles requires explicit player-level data.
  const before = result.subjectCiBefore?.[index]
    ?? (result.format === 'Singles' ? result.subjectEffectiveCi : undefined);
  const delta = result.subjectCiDeltas?.[index]
    ?? (result.format === 'Singles' ? result.ciDelta : undefined);
  const after = result.subjectCiAfter?.[index]
    ?? (finite(before) && finite(delta) ? before + delta : undefined);

  if (!finite(before) || !finite(after) || !finite(delta)) return null;
  return {
    resultId: result.id,
    contestId: result.contestId,
    eventId: result.eventId,
    seasonId: result.seasonId,
    format: result.format,
    teamId: result.teamId,
    playedAt: result.playedAt,
    before,
    after,
    delta,
  };
}

/**
 * Read-only historical index for Clash Pulse. It joins the two normalized sides
 * of a contest once, then exposes reusable player/team/opponent context without
 * letting individual triggers know anything about persistence.
 */
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

  playerCiObservations(playerId: string, scope: StoryResultScope = {}): PlayerCiObservation[] {
    return this.playerResults(playerId, scope)
      .map((result) => ciObservation(result, playerId))
      .filter((observation): observation is PlayerCiObservation => observation !== null);
  }

  playerCiWindow(playerId: string, contests: number, scope: StoryResultScope = {}): PlayerCiWindow | null {
    if (contests <= 0) return null;
    const observations = this.playerCiObservations(playerId, scope).slice(-contests);
    if (observations.length !== contests) return null;
    return {
      playerId,
      contests,
      totalDelta: observations.reduce((sum, observation) => sum + observation.delta, 0),
      startCi: observations[0].before,
      currentCi: observations.at(-1)!.after,
      observations,
    };
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
