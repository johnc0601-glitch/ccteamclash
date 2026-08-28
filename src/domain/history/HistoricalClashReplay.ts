import type {HistoricalPlayerMatchup} from './HistoricalPlayerMatchup';
import {
  CLASH_MODEL_VERSION,
  doublesPairCi,
  eloProbability,
  SINGLES_HOME_BONUS,
  type ClashVenue,
} from '@/domain/story-engine/ClashPrediction';
import {
  clashCiDelta,
  clashDoublesCiDelta,
  type ClashActualScore,
} from '@/domain/story-engine/ClashRatingDelta';

export type HistoricalReplayFact = {
  seasonId: string;
  historicalMatchKey: string;
  historicalTeamMatchId: number | null;
  matchupDeduplicationKey: string;
  contestId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  opponentTeamId: string;
  opponentTeamName: string;
  format: 'Singles' | 'Doubles';
  side: 'Home' | 'Away' | null;
  venue: ClashVenue;
  outcome: 'W' | 'L' | 'T';
  clashIndexBefore: number;
  opponentEffectiveCi: number;
  winProbability: number;
  actualPoints: ClashActualScore;
  ciDelta: number;
  algorithmVersion: string;
};

export type HistoricalReplayResult = {
  facts: HistoricalReplayFact[];
  endingRatings: Map<string, number>;
  seasonGain: Map<string, number>;
  unresolvedRows: HistoricalPlayerMatchup[];
};

/**
 * Replays historical contests with the same event-freeze rule used by the live
 * Matchday CI pipeline.
 *
 * Regular-season rows require recorded Home/Away context. Playoff/Championship
 * rows are neutral by definition and therefore never invent a side merely to
 * apply CI. Historical rows missing a team-match archive entry are grouped by a
 * deterministic season/event/team-pair key. A non-playoff row with no validated
 * side is returned as unresolved rather than guessed.
 */
export function replayHistoricalClashSeason(
  rows: HistoricalPlayerMatchup[],
  startingRatings: ReadonlyMap<string, number>,
  venueByTeamMatchId: ReadonlyMap<number, ClashVenue> = new Map(),
): HistoricalReplayResult {
  const ratings = new Map(startingRatings);
  const seasonGain = new Map<string, number>();
  const facts: HistoricalReplayFact[] = [];
  const unresolvedRows: HistoricalPlayerMatchup[] = [];

  const matchGroups = groupByHistoricalMatch(rows);
  for (const matchRows of matchGroups) {
    const first = matchRows[0];
    const venue = historicalVenue(first, venueByTeamMatchId);
    if (venue === 'Home' && matchRows.some((row) => row.playerSide !== 'Home' && row.playerSide !== 'Away')) {
      unresolvedRows.push(...matchRows);
      continue;
    }

    const frozenRatings = new Map(ratings);
    const matchDeltas = new Map<string, number>();

    for (const row of matchRows) {
      const fact = buildHistoricalFact(row, frozenRatings, venue);
      facts.push(fact);
      matchDeltas.set(row.playerId, (matchDeltas.get(row.playerId) ?? 0) + fact.ciDelta);
    }

    for (const [playerId, delta] of matchDeltas) {
      const before = requireRating(ratings, playerId);
      ratings.set(playerId, before + delta);
      seasonGain.set(playerId, (seasonGain.get(playerId) ?? 0) + delta);
    }
  }

  return {facts, endingRatings: ratings, seasonGain, unresolvedRows};
}

function buildHistoricalFact(
  row: HistoricalPlayerMatchup,
  frozenRatings: ReadonlyMap<string, number>,
  venue: ClashVenue,
): HistoricalReplayFact {
  const side: 'Home' | 'Away' | null = venue === 'Neutral' ? null : row.playerSide ?? null;
  if (venue === 'Home' && side === null) {
    throw new Error(`Historical row ${row.deduplicationKey} is missing playerSide for a home-site match`);
  }

  const playerCi = requireRating(frozenRatings, row.playerId);
  const actual = outcomePoints(row.outcome);
  let opponentEffectiveCi: number;
  let probability: number;
  let ciDelta: number;

  if (row.format === 'Singles') {
    const opponentCi = requireRating(frozenRatings, row.opponentOnePlayerId);
    const playerEffective = playerCi + (venue === 'Home' && side === 'Home' ? SINGLES_HOME_BONUS : 0);
    opponentEffectiveCi = opponentCi + (venue === 'Home' && side === 'Away' ? SINGLES_HOME_BONUS : 0);
    probability = eloProbability(playerEffective, opponentEffectiveCi);
    ciDelta = clashCiDelta(actual, probability);
  } else {
    if (!row.partnerPlayerId || !row.opponentTwoPlayerId) {
      throw new Error(`Doubles row ${row.deduplicationKey} is missing partner/opponent`);
    }
    const partnerCi = requireRating(frozenRatings, row.partnerPlayerId);
    const opponentOneCi = requireRating(frozenRatings, row.opponentOnePlayerId);
    const opponentTwoCi = requireRating(frozenRatings, row.opponentTwoPlayerId);
    const playerPairCi = doublesPairCi(playerCi, partnerCi);
    opponentEffectiveCi = doublesPairCi(opponentOneCi, opponentTwoCi);
    probability = eloProbability(playerPairCi, opponentEffectiveCi);
    ciDelta = clashDoublesCiDelta(actual, probability);
  }

  return {
    seasonId: row.seasonId,
    historicalMatchKey: historicalMatchKey(row),
    historicalTeamMatchId: row.historicalTeamMatchId ?? null,
    matchupDeduplicationKey: row.deduplicationKey,
    contestId: historicalContestId(row),
    playerId: row.playerId,
    playerName: row.playerName,
    teamId: row.playerTeamId,
    teamName: row.playerTeamName,
    opponentTeamId: row.opponentTeamId,
    opponentTeamName: row.opponentTeamName,
    format: row.format,
    side,
    venue,
    outcome: row.outcome,
    clashIndexBefore: playerCi,
    opponentEffectiveCi,
    winProbability: probability,
    actualPoints: actual,
    ciDelta,
    algorithmVersion: CLASH_MODEL_VERSION,
  };
}

function groupByHistoricalMatch(rows: HistoricalPlayerMatchup[]): HistoricalPlayerMatchup[][] {
  const groups = new Map<string, HistoricalPlayerMatchup[]>();
  for (const row of [...rows].sort(compareHistoricalRows)) {
    const key = historicalMatchKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function historicalMatchKey(row: HistoricalPlayerMatchup): string {
  if (row.historicalTeamMatchId != null) return `team-match:${row.historicalTeamMatchId}`;
  const teams = [row.playerTeamId || row.playerTeamName, row.opponentTeamId || row.opponentTeamName]
    .map((value) => normalizeKeyPart(value))
    .sort();
  return `synthetic:${row.seasonId}:${row.eventOrder}:${normalizeKeyPart(row.eventLabel)}:${teams.join(':')}`;
}

function historicalVenue(
  row: HistoricalPlayerMatchup,
  venueByTeamMatchId: ReadonlyMap<number, ClashVenue>,
): ClashVenue {
  if (isPlayoffLabel(row.eventLabel)) return 'Neutral';
  if (row.historicalTeamMatchId != null) return venueByTeamMatchId.get(row.historicalTeamMatchId) ?? 'Home';
  return 'Home';
}

function isPlayoffLabel(label: string): boolean {
  return /playoff|semi[- ]?final|championship|finals?|3rd\s+place|third\s+place/i.test(label);
}

function compareHistoricalRows(a: HistoricalPlayerMatchup, b: HistoricalPlayerMatchup): number {
  return a.eventOrder - b.eventOrder
    || historicalMatchKey(a).localeCompare(historicalMatchKey(b))
    || a.sourceRow - b.sourceRow
    || a.playerId.localeCompare(b.playerId);
}

function historicalContestId(row: HistoricalPlayerMatchup): string {
  const playerIds = [
    row.playerId,
    row.partnerPlayerId,
    row.opponentOnePlayerId,
    row.opponentTwoPlayerId,
  ].filter((id): id is string => Boolean(id)).sort();
  return `historical:${historicalMatchKey(row)}:${row.format.toLowerCase()}:${playerIds.join(':')}`;
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function requireRating(ratings: ReadonlyMap<string, number>, playerId: string): number {
  const rating = ratings.get(playerId);
  if (rating == null) throw new Error(`Missing starting CI for ${playerId}`);
  return rating;
}

function outcomePoints(outcome: HistoricalPlayerMatchup['outcome']): ClashActualScore {
  if (outcome === 'W') return 1;
  if (outcome === 'T') return 0.5;
  return 0;
}
