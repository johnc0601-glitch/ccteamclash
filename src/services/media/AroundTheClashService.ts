import {createClient} from '@/lib/supabase/server';

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

export type AroundTheClashData = {
  facts: AroundFact[];
  activeSeasonId: string | null;
  seasonNames: Record<string, string>;
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

type HistoricalFactRow = {
  contest_id: string;
  historical_match_key: string;
  historical_team_match_id: number | string;
  season_id: string;
  player_id: string;
  player_name: string;
  team_id: string;
  side: string;
  venue: string;
  format: string;
  outcome: string;
  clash_index_before: number;
  opponent_effective_ci: number;
  win_probability: number;
  actual_points: number;
  ci_delta: number;
  calculated_at: string;
};

type CurrentFactRow = {
  contest_id: string;
  match_id: string;
  player_id: string;
  player_name: string;
  team_id: string;
  side: string;
  venue: string;
  format: string;
  outcome: string;
  clash_index_before: number;
  opponent_effective_ci: number;
  win_probability: number;
  actual_points: number;
  ci_delta: number;
  calculated_at: string;
};

type HistoricalMatchRow = {
  id: number | string;
  season_name: string;
  event_order: number;
  event_month: string | null;
  event_label: string | null;
};

type ScheduleMatchRow = {
  id: string;
  round_id: string | null;
  season_id: string;
  date: string | null;
};

type RoundRow = {
  id: string;
  number: number;
  name: string | null;
  date: string | null;
};

type SeasonRow = {
  id: string;
  name: string;
  year: number;
  active: boolean;
};

const HISTORICAL_FACT_COLUMNS = [
  'contest_id', 'historical_match_key', 'historical_team_match_id', 'season_id',
  'player_id', 'player_name', 'team_id', 'side', 'venue', 'format', 'outcome',
  'clash_index_before', 'opponent_effective_ci', 'win_probability', 'actual_points',
  'ci_delta', 'calculated_at',
].join(',');

const CURRENT_FACT_COLUMNS = [
  'contest_id', 'match_id', 'player_id', 'player_name', 'team_id', 'side', 'venue',
  'format', 'outcome', 'clash_index_before', 'opponent_effective_ci', 'win_probability',
  'actual_points', 'ci_delta', 'calculated_at',
].join(',');

const PAGE_SIZE = 1000;

/**
 * Commissioner-facing CI desk backed only by immutable contest-rating facts.
 * It does not replay CI, recalculate win probability, or reinterpret outcomes.
 */
export async function getAroundTheClashData(): Promise<AroundTheClashData> {
  const supabase = await createClient();
  const db = supabase as any;

  const [historicalFacts, currentFacts, historicalMatchResult, seasonResult] = await Promise.all([
    loadPagedRows<HistoricalFactRow>(() => db
      .from('historical_clash_contest_rating_facts')
      .select(HISTORICAL_FACT_COLUMNS)
      .order('historical_team_match_id', {ascending: true})
      .order('contest_id', {ascending: true})
      .order('player_id', {ascending: true})),
    loadPagedRows<CurrentFactRow>(() => db
      .from('clash_contest_rating_facts')
      .select(CURRENT_FACT_COLUMNS)
      .order('match_id', {ascending: true})
      .order('contest_id', {ascending: true})
      .order('player_id', {ascending: true})),
    db
      .from('historical_team_matches')
      .select('id,season_name,event_order,event_month,event_label')
      .order('id', {ascending: true}),
    db
      .from('launch_seasons')
      .select('id,name,year,active')
      .order('year', {ascending: false}),
  ]);

  if (historicalMatchResult.error) {
    throw new Error(historicalMatchResult.error.message || 'Historical match context could not be loaded.');
  }
  if (seasonResult.error) {
    throw new Error(seasonResult.error.message || 'Season context could not be loaded.');
  }

  const historicalMatches = (historicalMatchResult.data ?? []) as HistoricalMatchRow[];
  const seasons = (seasonResult.data ?? []) as SeasonRow[];
  const historicalMatchById = new Map(historicalMatches.map((match) => [String(match.id), match]));

  const currentMatchIds = unique(currentFacts.map((row) => row.match_id).filter(Boolean));
  let scheduleMatches: ScheduleMatchRow[] = [];
  if (currentMatchIds.length) {
    const {data, error} = await db
      .from('launch_schedule_matches')
      .select('id,round_id,season_id,date')
      .in('id', currentMatchIds);
    if (error) throw new Error(error.message || 'Current match context could not be loaded.');
    scheduleMatches = (data ?? []) as ScheduleMatchRow[];
  }

  const roundIds = unique(scheduleMatches.map((match) => match.round_id).filter((value): value is string => Boolean(value)));
  let rounds: RoundRow[] = [];
  if (roundIds.length) {
    const {data, error} = await db
      .from('launch_rounds')
      .select('id,number,name,date')
      .in('id', roundIds);
    if (error) throw new Error(error.message || 'Current round context could not be loaded.');
    rounds = (data ?? []) as RoundRow[];
  }

  const scheduleMatchById = new Map(scheduleMatches.map((match) => [match.id, match]));
  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const seasonNames: Record<string, string> = {};
  let activeSeasonId: string | null = null;

  for (const season of seasons) {
    seasonNames[season.id] = cleanText(season.name) || season.id;
    if (!activeSeasonId && season.active === true) activeSeasonId = season.id;
  }
  for (const match of historicalMatches) {
    const seasonId = historicalFacts.find((row) => String(row.historical_team_match_id) === String(match.id))?.season_id;
    if (seasonId && !seasonNames[seasonId]) seasonNames[seasonId] = cleanText(match.season_name) || seasonId;
  }

  const canonicalRows: CanonicalAroundRow[] = [];

  for (const row of historicalFacts) {
    const match = historicalMatchById.get(String(row.historical_team_match_id));
    if (!match) continue;
    const canonical = toHistoricalCanonicalRow(row, match);
    if (canonical) canonicalRows.push(canonical);
  }

  for (const row of currentFacts) {
    const match = scheduleMatchById.get(row.match_id);
    if (!match) continue;
    const round = match.round_id ? roundById.get(match.round_id) : undefined;
    const canonical = toCurrentCanonicalRow(row, match, round);
    if (canonical) canonicalRows.push(canonical);
  }

  return {
    activeSeasonId,
    seasonNames,
    facts: buildAroundFacts(canonicalRows),
  };
}

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

function toHistoricalCanonicalRow(row: HistoricalFactRow, match: HistoricalMatchRow): CanonicalAroundRow | null {
  const ratingBefore = requiredFinite(row.clash_index_before);
  const opponentEffectiveCi = requiredFinite(row.opponent_effective_ci);
  const expectedScore = requiredFinite(row.win_probability);
  const actualScore = requiredFinite(row.actual_points);
  const totalDelta = requiredFinite(row.ci_delta);
  const eventOrder = requiredFinite(match.event_order);
  if ([ratingBefore, opponentEffectiveCi, expectedScore, actualScore, totalDelta, eventOrder].some((value) => value === null)) return null;
  if (expectedScore! < 0 || expectedScore! > 1 || actualScore! < 0 || actualScore! > 1) return null;

  const playerId = cleanText(row.player_id);
  const contestId = cleanText(row.contest_id);
  const matchId = cleanText(row.historical_match_key);
  const seasonId = cleanText(row.season_id);
  const teamId = cleanText(row.team_id);
  if (!playerId || !contestId || !matchId || !seasonId || !teamId) return null;

  return {
    source: 'historical',
    id: `historical:${contestId}:${playerId}`,
    seasonId,
    eventKey: `historical:${seasonId}:${eventOrder}`,
    eventOrder: eventOrder!,
    eventLabel: cleanText(match.event_label) || cleanText(match.event_month) || `Event ${eventOrder}`,
    matchId,
    contestId,
    playerId,
    playerName: cleanText(row.player_name) || playerId,
    teamId,
    side: cleanText(row.side),
    venue: cleanText(row.venue),
    format: cleanText(row.format),
    outcome: cleanText(row.outcome),
    ratingBefore: ratingBefore!,
    opponentEffectiveCi: opponentEffectiveCi!,
    expectedScore: expectedScore!,
    actualScore: actualScore!,
    totalDelta: totalDelta!,
    calculatedAt: cleanText(row.calculated_at),
  };
}

function toCurrentCanonicalRow(row: CurrentFactRow, match: ScheduleMatchRow, round: RoundRow | undefined): CanonicalAroundRow | null {
  const ratingBefore = requiredFinite(row.clash_index_before);
  const opponentEffectiveCi = requiredFinite(row.opponent_effective_ci);
  const expectedScore = requiredFinite(row.win_probability);
  const actualScore = requiredFinite(row.actual_points);
  const totalDelta = requiredFinite(row.ci_delta);
  if ([ratingBefore, opponentEffectiveCi, expectedScore, actualScore, totalDelta].some((value) => value === null)) return null;
  if (expectedScore! < 0 || expectedScore! > 1 || actualScore! < 0 || actualScore! > 1) return null;

  const playerId = cleanText(row.player_id);
  const contestId = cleanText(row.contest_id);
  const matchId = cleanText(row.match_id);
  const seasonId = cleanText(match.season_id);
  const teamId = cleanText(row.team_id);
  if (!playerId || !contestId || !matchId || !seasonId || !teamId) return null;

  const eventOrder = Number.isFinite(Number(round?.number)) ? Number(round?.number) : 0;
  const eventLabel = cleanText(round?.name)
    || (eventOrder > 0 ? `Round ${eventOrder}` : '')
    || cleanText(round?.date)
    || cleanText(match.date)
    || 'Matchday';

  return {
    source: 'current',
    id: `current:${contestId}:${playerId}`,
    seasonId,
    eventKey: cleanText(match.round_id) || `current:${seasonId}:${eventLabel}`,
    eventOrder,
    eventLabel,
    matchId,
    contestId,
    playerId,
    playerName: cleanText(row.player_name) || playerId,
    teamId,
    side: cleanText(row.side),
    venue: cleanText(row.venue),
    format: cleanText(row.format),
    outcome: cleanText(row.outcome),
    ratingBefore: ratingBefore!,
    opponentEffectiveCi: opponentEffectiveCi!,
    expectedScore: expectedScore!,
    actualScore: actualScore!,
    totalDelta: totalDelta!,
    calculatedAt: cleanText(row.calculated_at),
  };
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

async function loadPagedRows<T>(buildQuery: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message || 'Canonical CI facts could not be loaded.');
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
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

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function requiredFinite(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundPrecision(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}
