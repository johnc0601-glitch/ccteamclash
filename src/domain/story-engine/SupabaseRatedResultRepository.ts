import type {SupabaseClient} from '@supabase/supabase-js';
import {doublesPairCi} from './ClashPrediction';
import type {RatedResult} from './RatedResult';
import type {RatedResultRepository} from './RatedResultRepository';

const PAGE_SIZE = 500;
const MATCH_ID_CHUNK_SIZE = 50;

type PublishedMatchRow = {
  match_id: string;
  published_at: string | null;
};

type ScheduleRow = {
  id: string;
  round_id: string;
  season_id: string;
  date: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

export type StoredContestRatingFact = {
  contest_id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  player_name: string;
  team_name: string;
  side: string;
  format: string;
  outcome: string;
  clash_index_before: number;
  opponent_effective_ci: number;
  win_probability: number;
  actual_points: number;
  expected_points: number;
  ci_delta: number;
  algorithm_version: string;
};

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function validSide(value: string): value is RatedResult['side'] {
  return value === 'Home' || value === 'Away';
}

function validFormat(value: string): value is RatedResult['format'] {
  return value === 'Singles' || value === 'Doubles';
}

function validOutcome(value: string): value is RatedResult['outcome'] {
  return value === 'W' || value === 'L' || value === 'T';
}

function effectiveCi(facts: StoredContestRatingFact[], format: RatedResult['format']): number | null {
  if (format === 'Singles') return facts.length === 1 ? facts[0].clash_index_before : null;
  if (facts.length !== 2) return null;
  return doublesPairCi(facts[0].clash_index_before, facts[1].clash_index_before);
}

/**
 * Pure adapter from immutable published rating facts to the normalized result
 * shape consumed by Stats Desk and Clash Pulse. Invalid/partial contest sides
 * are omitted rather than repaired or inferred.
 */
export function buildRatedResultsFromStoredFacts(
  publishedMatches: PublishedMatchRow[],
  schedules: ScheduleRow[],
  facts: StoredContestRatingFact[],
): RatedResult[] {
  const publishedByMatchId = new Map(publishedMatches.map((row) => [row.match_id, row]));
  const scheduleByMatchId = new Map(schedules.map((row) => [row.id, row]));
  const factsByContest = new Map<string, StoredContestRatingFact[]>();
  for (const fact of facts) {
    const rows = factsByContest.get(fact.contest_id) ?? [];
    rows.push(fact);
    factsByContest.set(fact.contest_id, rows);
  }

  const results: RatedResult[] = [];
  for (const [contestId, contestFacts] of factsByContest) {
    const matchId = contestFacts[0]?.match_id;
    if (!matchId || !publishedByMatchId.has(matchId)) continue;
    const schedule = scheduleByMatchId.get(matchId);
    if (!schedule?.round_id || !schedule.season_id || !schedule.date) continue;

    for (const side of ['Home', 'Away'] as const) {
      const sideFacts = contestFacts
        .filter((fact) => fact.side === side)
        .sort((a, b) => a.player_id.localeCompare(b.player_id));
      const opponentFacts = contestFacts.filter((fact) => fact.side !== side);
      if (sideFacts.length === 0 || opponentFacts.length === 0) continue;

      const representative = sideFacts[0];
      if (!validSide(representative.side) || !validFormat(representative.format) || !validOutcome(representative.outcome)) continue;
      if (sideFacts.some((fact) =>
        fact.match_id !== matchId
        || fact.format !== representative.format
        || fact.outcome !== representative.outcome
        || fact.team_id !== representative.team_id
        || fact.algorithm_version !== representative.algorithm_version
      )) continue;

      const subjectEffectiveCi = effectiveCi(sideFacts, representative.format);
      const opponent = opponentFacts[0];
      if (subjectEffectiveCi === null || !opponent?.team_id || !opponent.team_name) continue;

      results.push({
        id: `${contestId}:${side.toLowerCase()}`,
        contestId,
        matchId,
        eventId: schedule.round_id,
        seasonId: schedule.season_id,
        format: representative.format,
        side: representative.side,
        subjectPlayerIds: sideFacts.map((fact) => fact.player_id),
        subjectNames: sideFacts.map((fact) => fact.player_name),
        subjectCiBefore: sideFacts.map((fact) => fact.clash_index_before),
        subjectCiAfter: sideFacts.map((fact) => fact.clash_index_before + fact.ci_delta),
        subjectCiDeltas: sideFacts.map((fact) => fact.ci_delta),
        teamId: representative.team_id,
        teamName: representative.team_name,
        opponentTeamId: opponent.team_id,
        opponentTeamName: opponent.team_name,
        outcome: representative.outcome,
        won: representative.outcome === 'W',
        actualPoints: Number(representative.actual_points),
        expectedPoints: Number(representative.expected_points),
        winProbability: Number(representative.win_probability),
        subjectEffectiveCi,
        opponentEffectiveCi: Number(representative.opponent_effective_ci),
        ciDeficit: Number(representative.opponent_effective_ci) - subjectEffectiveCi,
        ciDelta: sideFacts.reduce((sum, fact) => sum + Number(fact.ci_delta), 0),
        modelVersion: representative.algorithm_version,
        playedAt: schedule.date,
      });
    }
  }

  return results.sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id));
}

/** Read-only repository over immutable published Matchday CI facts. */
export class SupabaseRatedResultRepository implements RatedResultRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getRatedResults(): Promise<RatedResult[]> {
    const publishedMatches = await this.loadPublishedMatches();
    if (publishedMatches.length === 0) return [];
    const matchIds = publishedMatches.map((row) => row.match_id);
    const [schedules, facts] = await Promise.all([
      this.loadSchedules(matchIds),
      this.loadFacts(matchIds),
    ]);
    return buildRatedResultsFromStoredFacts(publishedMatches, schedules, facts);
  }

  private async loadPublishedMatches(): Promise<PublishedMatchRow[]> {
    const rows: PublishedMatchRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('launch_match_results')
        .select('match_id,published_at')
        .eq('status', 'Published')
        .order('match_id', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as PublishedMatchRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }

  private async loadSchedules(matchIds: string[]): Promise<ScheduleRow[]> {
    const rows: ScheduleRow[] = [];
    for (const ids of chunks(matchIds, MATCH_ID_CHUNK_SIZE)) {
      const {data, error} = await this.supabase
        .from('launch_schedule_matches')
        .select('id,round_id,season_id,date,home_team_id,away_team_id')
        .in('id', ids);
      if (error) throw error;
      rows.push(...((data ?? []) as ScheduleRow[]));
    }
    return rows;
  }

  private async loadFacts(matchIds: string[]): Promise<StoredContestRatingFact[]> {
    const rows: StoredContestRatingFact[] = [];
    for (const ids of chunks(matchIds, MATCH_ID_CHUNK_SIZE)) {
      for (let from = 0; ; from += PAGE_SIZE) {
        const {data, error} = await this.supabase
          .from('clash_contest_rating_facts')
          .select('contest_id,match_id,player_id,team_id,player_name,team_name,side,format,outcome,clash_index_before,opponent_effective_ci,win_probability,actual_points,expected_points,ci_delta,algorithm_version')
          .in('match_id', ids)
          .order('contest_id', {ascending: true})
          .order('player_id', {ascending: true})
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const page = (data ?? []) as StoredContestRatingFact[];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
    }
    return rows;
  }
}
