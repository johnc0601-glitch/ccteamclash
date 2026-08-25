import {
  CLASH_MODEL_VERSION,
  doublesProbability,
  singlesProbability,
} from '@/domain/story-engine/ClashPrediction';
import {
  clashCiDelta,
  clashDoublesCiDelta,
  type ClashActualScore,
} from '@/domain/story-engine/ClashRatingDelta';

export type HistoricalReplaySide = 'Home' | 'Away';
export type HistoricalReplayFormat = 'Singles' | 'Doubles';
export type HistoricalReplayOutcome = 'W' | 'L' | 'T';

export type HistoricalReplayRow = {
  deduplicationKey: string;
  seasonId: string;
  eventOrder: number;
  eventLabel: string;
  historicalTeamMatchId?: number | null;
  format: HistoricalReplayFormat;
  playerId: string;
  playerName: string;
  playerTeamId: string;
  partnerPlayerId: string | null;
  opponentOnePlayerId: string;
  opponentTwoPlayerId: string | null;
  opponentTeamId: string;
  outcome: HistoricalReplayOutcome;
  playerSide?: HistoricalReplaySide | null;
};

export type HistoricalReplayFact = {
  seasonId: string;
  eventOrder: number;
  eventLabel: string;
  contestKey: string;
  playerId: string;
  playerName: string;
  format: HistoricalReplayFormat;
  outcome: HistoricalReplayOutcome;
  clashIndexBefore: number;
  opponentEffectiveCi: number;
  winProbability: number;
  ciDelta: number;
  algorithmVersion: typeof CLASH_MODEL_VERSION;
};

export type HistoricalReplayPlayerSummary = {
  playerId: string;
  startCi: number;
  endCi: number;
  ciGain: number;
  ratedContests: number;
};

export type HistoricalReplayResult = {
  facts: HistoricalReplayFact[];
  players: HistoricalReplayPlayerSummary[];
};

export class HistoricalCiReplayError extends Error {}

/**
 * Replays historical results through the current finalized Clash Index model.
 * Ratings are frozen for an entire event (eventOrder), all contest movement is
 * calculated from that frozen value, and movement is applied only after the
 * event is complete. Offseason/reseed movement is intentionally outside this
 * engine, so ciGain is always earned match movement only.
 */
export function replayHistoricalCi(
  rows: HistoricalReplayRow[],
  startingRatings: ReadonlyMap<string, number>,
): HistoricalReplayResult {
  if (!rows.length) return {facts: [], players: []};

  const seasonIds = new Set(rows.map((row) => row.seasonId));
  if (seasonIds.size !== 1) {
    throw new HistoricalCiReplayError('Historical CI replay accepts exactly one season at a time.');
  }

  const currentRatings = new Map(startingRatings);
  const initialRatings = new Map(startingRatings);
  const facts: HistoricalReplayFact[] = [];
  const ratedContestCounts = new Map<string, number>();
  const events = new Map<number, HistoricalReplayRow[]>();

  for (const row of rows) {
    const bucket = events.get(row.eventOrder) ?? [];
    bucket.push(row);
    events.set(row.eventOrder, bucket);
  }

  for (const eventOrder of [...events.keys()].sort((a, b) => a - b)) {
    const eventRows = events.get(eventOrder) ?? [];
    const frozen = new Map(currentRatings);
    const eventDeltas = new Map<string, number>();
    const contests = groupContests(eventRows);

    for (const contestRows of contests.values()) {
      const contestFacts = rateContest(contestRows, frozen);
      for (const fact of contestFacts) {
        facts.push(fact);
        eventDeltas.set(fact.playerId, (eventDeltas.get(fact.playerId) ?? 0) + fact.ciDelta);
        ratedContestCounts.set(fact.playerId, (ratedContestCounts.get(fact.playerId) ?? 0) + 1);
      }
    }

    for (const [playerId, delta] of eventDeltas) {
      const before = frozen.get(playerId);
      if (before === undefined) throw missingStart(playerId);
      currentRatings.set(playerId, before + delta);
    }
  }

  const players = [...ratedContestCounts.keys()]
    .map((playerId): HistoricalReplayPlayerSummary => {
      const startCi = initialRatings.get(playerId);
      const endCi = currentRatings.get(playerId);
      if (startCi === undefined || endCi === undefined) throw missingStart(playerId);
      return {
        playerId,
        startCi,
        endCi,
        ciGain: endCi - startCi,
        ratedContests: ratedContestCounts.get(playerId) ?? 0,
      };
    })
    .sort((a, b) => b.ciGain - a.ciGain || a.playerId.localeCompare(b.playerId));

  return {facts, players};
}

function groupContests(rows: HistoricalReplayRow[]): Map<string, HistoricalReplayRow[]> {
  const groups = new Map<string, HistoricalReplayRow[]>();
  for (const row of rows) {
    const ids = row.format === 'Singles'
      ? [row.playerId, row.opponentOnePlayerId]
      : [row.playerId, row.partnerPlayerId, row.opponentOnePlayerId, row.opponentTwoPlayerId]
        .filter((id): id is string => Boolean(id));
    const teamMatch = row.historicalTeamMatchId ?? [row.playerTeamId, row.opponentTeamId].sort().join('~');
    const key = `${row.eventOrder}|${teamMatch}|${row.format}|${[...new Set(ids)].sort().join('~')}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }
  return groups;
}

function rateContest(
  rows: HistoricalReplayRow[],
  frozen: ReadonlyMap<string, number>,
): HistoricalReplayFact[] {
  const representative = rows[0];
  if (!representative) return [];
  const playerIds = [...new Set(rows.map((row) => row.playerId))];
  const expectedPlayers = representative.format === 'Singles' ? 2 : 4;
  if (playerIds.length !== expectedPlayers) {
    throw new HistoricalCiReplayError(
      `${representative.eventLabel} ${representative.format} contest has ${playerIds.length} player rows; expected ${expectedPlayers}.`,
    );
  }

  const teams = [...new Set(rows.map((row) => row.playerTeamId))];
  if (teams.length !== 2) {
    throw new HistoricalCiReplayError(`${representative.eventLabel} contest must contain exactly two teams.`);
  }

  const contestKey = canonicalContestKey(rows);
  if (representative.format === 'Singles') {
    return rateSingles(rows, frozen, contestKey);
  }
  return rateDoubles(rows, frozen, contestKey);
}

function rateSingles(
  rows: HistoricalReplayRow[],
  frozen: ReadonlyMap<string, number>,
  contestKey: string,
): HistoricalReplayFact[] {
  if (rows.some((row) => row.playerSide !== 'Home' && row.playerSide !== 'Away')) {
    throw new HistoricalCiReplayError(
      `${rows[0]?.eventLabel ?? 'Historical'} singles contest is missing validated home/away; +15 home CI cannot be applied safely.`,
    );
  }
  const home = rows.find((row) => row.playerSide === 'Home');
  const away = rows.find((row) => row.playerSide === 'Away');
  if (!home || !away) {
    throw new HistoricalCiReplayError(`${rows[0]?.eventLabel ?? 'Historical'} singles contest needs one Home and one Away player.`);
  }
  const homeCi = requireRating(home.playerId, frozen);
  const awayCi = requireRating(away.playerId, frozen);
  const homeWinProbability = singlesProbability(homeCi, awayCi);

  return rows.map((row) => {
    const isHome = row.playerSide === 'Home';
    const winProbability = isHome ? homeWinProbability : 1 - homeWinProbability;
    return makeFact(
      row,
      contestKey,
      requireRating(row.playerId, frozen),
      isHome ? awayCi : homeCi,
      winProbability,
      clashCiDelta(actualScore(row.outcome), winProbability),
    );
  });
}

function rateDoubles(
  rows: HistoricalReplayRow[],
  frozen: ReadonlyMap<string, number>,
  contestKey: string,
): HistoricalReplayFact[] {
  const teams = [...new Set(rows.map((row) => row.playerTeamId))];
  const firstTeamRows = rows.filter((row) => row.playerTeamId === teams[0]);
  const secondTeamRows = rows.filter((row) => row.playerTeamId === teams[1]);
  if (firstTeamRows.length !== 2 || secondTeamRows.length !== 2) {
    throw new HistoricalCiReplayError(`${rows[0]?.eventLabel ?? 'Historical'} doubles contest needs two players per team.`);
  }

  const firstCis = firstTeamRows.map((row) => requireRating(row.playerId, frozen)) as [number, number];
  const secondCis = secondTeamRows.map((row) => requireRating(row.playerId, frozen)) as [number, number];
  const firstWinProbability = doublesProbability(firstCis, secondCis);

  return rows.map((row) => {
    const firstTeam = row.playerTeamId === teams[0];
    const winProbability = firstTeam ? firstWinProbability : 1 - firstWinProbability;
    const opponentRows = firstTeam ? secondTeamRows : firstTeamRows;
    const opponentCis = opponentRows.map((candidate) => requireRating(candidate.playerId, frozen));
    const opponentEffectiveCi = Math.max(...opponentCis) * 0.8 + Math.min(...opponentCis) * 0.2;
    return makeFact(
      row,
      contestKey,
      requireRating(row.playerId, frozen),
      opponentEffectiveCi,
      winProbability,
      clashDoublesCiDelta(actualScore(row.outcome), winProbability),
    );
  });
}

function makeFact(
  row: HistoricalReplayRow,
  contestKey: string,
  clashIndexBefore: number,
  opponentEffectiveCi: number,
  winProbability: number,
  ciDelta: number,
): HistoricalReplayFact {
  return {
    seasonId: row.seasonId,
    eventOrder: row.eventOrder,
    eventLabel: row.eventLabel,
    contestKey,
    playerId: row.playerId,
    playerName: row.playerName,
    format: row.format,
    outcome: row.outcome,
    clashIndexBefore,
    opponentEffectiveCi,
    winProbability,
    ciDelta,
    algorithmVersion: CLASH_MODEL_VERSION,
  };
}

function canonicalContestKey(rows: HistoricalReplayRow[]): string {
  const first = rows[0];
  const teamMatch = first?.historicalTeamMatchId ?? [...new Set(rows.flatMap((row) => [row.playerTeamId, row.opponentTeamId]))].sort().join('~');
  return `${first?.seasonId}|${first?.eventOrder}|${teamMatch}|${first?.format}|${[...new Set(rows.map((row) => row.playerId))].sort().join('~')}`;
}

function actualScore(outcome: HistoricalReplayOutcome): ClashActualScore {
  return outcome === 'W' ? 1 : outcome === 'T' ? 0.5 : 0;
}

function requireRating(playerId: string, ratings: ReadonlyMap<string, number>): number {
  const rating = ratings.get(playerId);
  if (rating === undefined) throw missingStart(playerId);
  return rating;
}

function missingStart(playerId: string): HistoricalCiReplayError {
  return new HistoricalCiReplayError(`Missing starting Clash Index for ${playerId}.`);
}
