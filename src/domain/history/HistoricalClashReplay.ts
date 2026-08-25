import type {HistoricalPlayerMatchup} from './HistoricalPlayerMatchup';
import {
  CLASH_MODEL_VERSION,
  doublesPairCi,
  eloProbability,
  SINGLES_HOME_BONUS,
} from '@/domain/story-engine/ClashPrediction';
import {
  clashCiDelta,
  clashDoublesCiDelta,
  type ClashActualScore,
} from '@/domain/story-engine/ClashRatingDelta';

export type HistoricalReplayFact = {
  seasonId: string;
  historicalTeamMatchId: number;
  contestId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  opponentTeamId: string;
  opponentTeamName: string;
  format: 'Singles' | 'Doubles';
  side: 'Home' | 'Away';
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
};

/**
 * Replays historical contests with the same event-freeze rule used by the live
 * Matchday CI pipeline: every player uses their CI at the start of the team
 * match, all contest contributions are calculated from that snapshot, then the
 * player's contributions are summed and applied once after the match.
 */
export function replayHistoricalClashSeason(
  rows: HistoricalPlayerMatchup[],
  startingRatings: ReadonlyMap<string, number>,
): HistoricalReplayResult {
  const ratings = new Map(startingRatings);
  const seasonGain = new Map<string, number>();
  const facts: HistoricalReplayFact[] = [];

  const matchGroups = groupByTeamMatch(rows);
  for (const matchRows of matchGroups) {
    const frozenRatings = new Map(ratings);
    const matchDeltas = new Map<string, number>();

    for (const row of matchRows) {
      const fact = buildHistoricalFact(row, frozenRatings);
      facts.push(fact);
      matchDeltas.set(row.playerId, (matchDeltas.get(row.playerId) ?? 0) + fact.ciDelta);
    }

    for (const [playerId, delta] of matchDeltas) {
      const before = requireRating(ratings, playerId);
      ratings.set(playerId, before + delta);
      seasonGain.set(playerId, (seasonGain.get(playerId) ?? 0) + delta);
    }
  }

  return {facts, endingRatings: ratings, seasonGain};
}

function buildHistoricalFact(
  row: HistoricalPlayerMatchup,
  frozenRatings: ReadonlyMap<string, number>,
): HistoricalReplayFact {
  if (row.historicalTeamMatchId == null) {
    throw new Error(`Historical row ${row.deduplicationKey} is missing historicalTeamMatchId`);
  }
  if (row.playerSide !== 'Home' && row.playerSide !== 'Away') {
    throw new Error(`Historical row ${row.deduplicationKey} is missing playerSide`);
  }

  const playerCi = requireRating(frozenRatings, row.playerId);
  const actual = outcomePoints(row.outcome);
  let opponentEffectiveCi: number;
  let probability: number;
  let ciDelta: number;

  if (row.format === 'Singles') {
    const opponentCi = requireRating(frozenRatings, row.opponentOnePlayerId);
    const playerEffective = playerCi + (row.playerSide === 'Home' ? SINGLES_HOME_BONUS : 0);
    opponentEffectiveCi = opponentCi + (row.playerSide === 'Away' ? SINGLES_HOME_BONUS : 0);
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
    historicalTeamMatchId: row.historicalTeamMatchId,
    contestId: historicalContestId(row),
    playerId: row.playerId,
    playerName: row.playerName,
    teamId: row.playerTeamId,
    teamName: row.playerTeamName,
    opponentTeamId: row.opponentTeamId,
    opponentTeamName: row.opponentTeamName,
    format: row.format,
    side: row.playerSide,
    outcome: row.outcome,
    clashIndexBefore: playerCi,
    opponentEffectiveCi,
    winProbability: probability,
    actualPoints: actual,
    ciDelta,
    algorithmVersion: CLASH_MODEL_VERSION,
  };
}

function groupByTeamMatch(rows: HistoricalPlayerMatchup[]): HistoricalPlayerMatchup[][] {
  const groups = new Map<number, HistoricalPlayerMatchup[]>();
  for (const row of [...rows].sort(compareHistoricalRows)) {
    if (row.historicalTeamMatchId == null) {
      throw new Error(`Historical row ${row.deduplicationKey} is missing historicalTeamMatchId`);
    }
    const group = groups.get(row.historicalTeamMatchId) ?? [];
    group.push(row);
    groups.set(row.historicalTeamMatchId, group);
  }
  return [...groups.values()];
}

function compareHistoricalRows(a: HistoricalPlayerMatchup, b: HistoricalPlayerMatchup): number {
  return a.eventOrder - b.eventOrder
    || (a.historicalTeamMatchId ?? 0) - (b.historicalTeamMatchId ?? 0)
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
  return `historical:${row.seasonId}:${row.historicalTeamMatchId}:${row.format.toLowerCase()}:${playerIds.join(':')}`;
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
