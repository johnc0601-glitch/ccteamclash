export type AroundFact = {
  id: string;
  seasonId: string;
  eventKey: string;
  eventOrder: number;
  eventLabel: string;
  matchId: string;
  contestId: string;
  playerId: string;
  playerName: string;
  format: string;
  side: string;
  outcome: string;
  ratingBefore: number;
  partnerPlayerId: string | null;
  partnerName: string | null;
  partnerRating: number | null;
  opponentOnePlayerId: string | null;
  opponentOneName: string | null;
  opponentOneRating: number | null;
  opponentTwoPlayerId: string | null;
  opponentTwoName: string | null;
  opponentTwoRating: number | null;
  ownPairRating: number | null;
  opponentPairRating: number | null;
  homeAdjustment: number;
  expectedScore: number;
  actualScore: number;
  totalDelta: number;
  calculatedAt: string;
};

export type CanonicalAroundRow = {
  source: 'current' | 'historical';
  id: string;
  seasonId: string;
  eventKey: string;
  eventOrder: number;
  eventLabel: string;
  matchId: string;
  contestId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  side: string;
  venue: string;
  format: string;
  outcome: string;
  ratingBefore: number;
  opponentEffectiveCi: number;
  expectedScore: number;
  actualScore: number;
  totalDelta: number;
  calculatedAt: string;
};

const MAX_FACT_ID_LENGTH = 500;

/**
 * Reconstructs teammate/opponent context only by cross-reading immutable rows in
 * the same contest. For doubles, the opposite side's stored opponent-effective
 * CI is the canonical effective CI of this side, so no pair formula is rerun.
 */
export function buildAroundFacts(rows: CanonicalAroundRow[]): AroundFact[] {
  const contests = new Map<string, CanonicalAroundRow[]>();
  for (const row of rows) {
    const key = `${row.source}|${row.matchId}|${row.contestId}`;
    const current = contests.get(key) ?? [];
    current.push(row);
    contests.set(key, current);
  }

  const facts: AroundFact[] = [];
  for (const contestRows of contests.values()) {
    if (!isStructurallyValidContest(contestRows)) continue;

    for (const row of contestRows) {
      const teammates = contestRows
        .filter((candidate) => candidate.teamId === row.teamId && candidate.playerId !== row.playerId)
        .sort(comparePlayers);
      const opponents = contestRows
        .filter((candidate) => candidate.teamId !== row.teamId)
        .sort(comparePlayers);
      const partner = isDoublesFormat(row.format) ? teammates[0] : undefined;
      const oppositeView = opponents[0];
      const ownEffectiveCi = oppositeView?.opponentEffectiveCi ?? null;
      const homeAdjustment = isSinglesFormat(row.format) && ownEffectiveCi !== null
        ? roundPrecision(ownEffectiveCi - row.ratingBefore)
        : 0;

      facts.push({
        id: row.id,
        seasonId: row.seasonId,
        eventKey: row.eventKey,
        eventOrder: row.eventOrder,
        eventLabel: row.eventLabel,
        matchId: row.matchId,
        contestId: row.contestId,
        playerId: row.playerId,
        playerName: row.playerName,
        format: row.format,
        side: row.side,
        outcome: row.outcome,
        ratingBefore: row.ratingBefore,
        partnerPlayerId: partner?.playerId ?? null,
        partnerName: partner?.playerName ?? null,
        partnerRating: partner?.ratingBefore ?? null,
        opponentOnePlayerId: opponents[0]?.playerId ?? null,
        opponentOneName: opponents[0]?.playerName ?? null,
        opponentOneRating: opponents[0]?.ratingBefore ?? null,
        opponentTwoPlayerId: opponents[1]?.playerId ?? null,
        opponentTwoName: opponents[1]?.playerName ?? null,
        opponentTwoRating: opponents[1]?.ratingBefore ?? null,
        ownPairRating: isDoublesFormat(row.format) ? ownEffectiveCi : null,
        opponentPairRating: isDoublesFormat(row.format) ? row.opponentEffectiveCi : null,
        homeAdjustment,
        expectedScore: row.expectedScore,
        actualScore: row.actualScore,
        totalDelta: row.totalDelta,
        calculatedAt: row.calculatedAt,
      });
    }
  }

  return facts.sort((left, right) => {
    if (left.seasonId !== right.seasonId) return right.seasonId.localeCompare(left.seasonId);
    if (left.eventOrder !== right.eventOrder) return right.eventOrder - left.eventOrder;
    if (left.matchId !== right.matchId) return left.matchId.localeCompare(right.matchId);
    if (left.contestId !== right.contestId) return left.contestId.localeCompare(right.contestId);
    return left.playerName.localeCompare(right.playerName);
  });
}

/**
 * Resolves a historical fact to the official Home/Away side. Legacy fact rows
 * may have no stored side, but their team id can still be matched against the
 * official historical match. A conflicting stored side or unknown team is
 * rejected rather than guessed.
 */
export function resolveHistoricalFactSide(input: {
  teamId: string;
  storedSide: string | null | undefined;
  awayTeamName: string;
  homeTeamName: string;
}): 'Away' | 'Home' | null {
  const teamKey = normalizeTeamKey(input.teamId);
  const awayKey = normalizeTeamKey(input.awayTeamName);
  const homeKey = normalizeTeamKey(input.homeTeamName);
  if (!teamKey || !awayKey || !homeKey || awayKey === homeKey) return null;

  const expectedSide = teamKey === awayKey
    ? 'Away'
    : teamKey === homeKey
      ? 'Home'
      : null;
  if (!expectedSide) return null;

  const storedSide = normalize(input.storedSide ?? '');
  if (storedSide && storedSide !== expectedSide.toLowerCase()) return null;
  return expectedSide;
}

export function normalizeAroundFactIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value
    .map((item) => typeof item === 'string' || typeof item === 'number' ? String(item).trim() : '')
    .filter((id) => id.length > 0 && id.length <= MAX_FACT_ID_LENGTH && !/\s/.test(id)));
}

function isStructurallyValidContest(rows: CanonicalAroundRow[]): boolean {
  if (!rows.length) return false;
  if (new Set(rows.map((row) => row.playerId)).size !== rows.length) return false;
  if (new Set(rows.map((row) => row.teamId)).size !== 2) return false;

  const sideCounts = new Map<string, number>();
  for (const row of rows) {
    const side = normalize(row.side);
    sideCounts.set(side, (sideCounts.get(side) ?? 0) + 1);
  }
  if (sideCounts.size !== 2) return false;

  const format = normalize(rows[0].format);
  if (rows.some((row) => normalize(row.format) !== format)) return false;
  if (format.includes('single')) return rows.length === 2 && [...sideCounts.values()].every((count) => count === 1);
  if (format.includes('double')) return rows.length === 4 && [...sideCounts.values()].every((count) => count === 2);
  return false;
}

function comparePlayers(left: CanonicalAroundRow, right: CanonicalAroundRow): number {
  return left.playerName.localeCompare(right.playerName) || left.playerId.localeCompare(right.playerId);
}

function isSinglesFormat(value: string): boolean {
  return normalize(value).includes('single');
}

function isDoublesFormat(value: string): boolean {
  return normalize(value).includes('double');
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeTeamKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function roundPrecision(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}
