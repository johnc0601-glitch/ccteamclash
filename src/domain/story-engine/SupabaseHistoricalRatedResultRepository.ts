import type {SupabaseClient} from '@supabase/supabase-js';
import {doublesPairCi, type ClashVenue} from './ClashPrediction';
import type {RatedResult} from './RatedResult';
import type {RatedResultRepository} from './RatedResultRepository';

const PAGE_SIZE = 500;

export type StoredHistoricalRatingFact = {
  matchup_deduplication_key: string;
  contest_id: string;
  historical_match_key: string;
  season_id: string;
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  opponent_team_id: string;
  opponent_team_name: string;
  side: string | null;
  venue: string;
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

export type HistoricalEventMetadataRow = {
  deduplication_key: string;
  season_id: string;
  season_name: string;
  event_label: string;
  event_order: number;
};

function validFormat(value: string): value is RatedResult['format'] {
  return value === 'Singles' || value === 'Doubles';
}

function validOutcome(value: string): value is RatedResult['outcome'] {
  return value === 'W' || value === 'L' || value === 'T';
}

function validVenue(value: string): value is ClashVenue {
  return value === 'Home' || value === 'Neutral';
}

function effectiveCi(facts: StoredHistoricalRatingFact[], format: RatedResult['format']): number | null {
  if (format === 'Singles') return facts.length === 1 ? facts[0].clash_index_before : null;
  if (facts.length !== 2) return null;
  return doublesPairCi(facts[0].clash_index_before, facts[1].clash_index_before);
}

function historicalPlayedAt(seasonName: string, seasonId: string, eventOrder: number): string | null {
  const match = `${seasonName} ${seasonId}`.match(/20\d{2}/);
  if (!match || eventOrder < 1) return null;
  const startYear = Number(match[0]);
  if (!Number.isFinite(startYear)) return null;
  // A synthetic chronology key only: one month apart from an October season start.
  // Human-facing copy uses seasonName/eventLabel, never this generated date.
  return new Date(Date.UTC(startYear, 9 + (eventOrder - 1), 1)).toISOString();
}

/**
 * Converts the immutable historical CI ledger plus source event metadata into
 * normalized story results. No historical row is written into live Matchday.
 */
export function buildHistoricalRatedResults(
  facts: StoredHistoricalRatingFact[],
  metadataRows: HistoricalEventMetadataRow[],
): RatedResult[] {
  const metadata = new Map(metadataRows.map((row) => [row.deduplication_key, row]));
  const byContest = new Map<string, StoredHistoricalRatingFact[]>();
  for (const fact of facts) {
    const rows = byContest.get(fact.contest_id) ?? [];
    rows.push(fact);
    byContest.set(fact.contest_id, rows);
  }

  const results: RatedResult[] = [];
  for (const [contestId, contestFacts] of byContest) {
    const teams = new Map<string, StoredHistoricalRatingFact[]>();
    for (const fact of contestFacts) {
      const rows = teams.get(fact.team_id) ?? [];
      rows.push(fact);
      teams.set(fact.team_id, rows);
    }
    if (teams.size !== 2) continue;
    const teamIds = [...teams.keys()].sort();

    for (const teamId of teamIds) {
      const sideFacts = (teams.get(teamId) ?? []).sort((a, b) => a.player_id.localeCompare(b.player_id));
      const representative = sideFacts[0];
      if (!representative || !validFormat(representative.format) || !validOutcome(representative.outcome) || !validVenue(representative.venue)) continue;
      if (sideFacts.some((fact) =>
        fact.format !== representative.format
        || fact.outcome !== representative.outcome
        || fact.venue !== representative.venue
        || fact.historical_match_key !== representative.historical_match_key
        || fact.season_id !== representative.season_id
        || fact.algorithm_version !== representative.algorithm_version
      )) continue;

      const eventRows = sideFacts
        .map((fact) => metadata.get(fact.matchup_deduplication_key))
        .filter((row): row is HistoricalEventMetadataRow => Boolean(row));
      if (eventRows.length !== sideFacts.length) continue;
      const event = eventRows[0];
      if (eventRows.some((row) => row.season_id !== event.season_id || row.event_order !== event.event_order || row.event_label !== event.event_label)) continue;

      const opponentTeamId = teamIds.find((candidate) => candidate !== teamId);
      const opponentFacts = opponentTeamId ? teams.get(opponentTeamId) ?? [] : [];
      if (!opponentTeamId || opponentFacts.length === 0) continue;

      const subjectEffectiveCi = effectiveCi(sideFacts, representative.format);
      const playedAt = historicalPlayedAt(event.season_name, event.season_id, event.event_order);
      if (subjectEffectiveCi === null || !playedAt) continue;

      let side: RatedResult['side'];
      if (representative.venue === 'Home') {
        if (representative.side !== 'Home' && representative.side !== 'Away') continue;
        side = representative.side;
      } else {
        // Neutral historical facts intentionally have no real side. Assign a
        // deterministic internal side while preserving venue=Neutral.
        side = teamId === teamIds[0] ? 'Home' : 'Away';
      }

      results.push({
        id: `historical:${contestId}:${teamId}`,
        contestId,
        matchId: representative.historical_match_key,
        eventId: `historical:${event.season_id}:event-${event.event_order}`,
        seasonId: event.season_id,
        seasonName: event.season_name,
        eventLabel: event.event_label,
        eventOrder: event.event_order,
        format: representative.format,
        side,
        venue: representative.venue,
        subjectPlayerIds: sideFacts.map((fact) => fact.player_id),
        subjectNames: sideFacts.map((fact) => fact.player_name),
        subjectCiBefore: sideFacts.map((fact) => fact.clash_index_before),
        subjectCiAfter: sideFacts.map((fact) => fact.clash_index_before + fact.ci_delta),
        subjectCiDeltas: sideFacts.map((fact) => fact.ci_delta),
        teamId: representative.team_id,
        teamName: representative.team_name,
        opponentTeamId: representative.opponent_team_id,
        opponentTeamName: representative.opponent_team_name,
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
        playedAt,
      });
    }
  }

  return results.sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id));
}

export class SupabaseHistoricalRatedResultRepository implements RatedResultRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getRatedResults(): Promise<RatedResult[]> {
    const [facts, metadata] = await Promise.all([this.loadFacts(), this.loadMetadata()]);
    return buildHistoricalRatedResults(facts, metadata);
  }

  private async loadFacts(): Promise<StoredHistoricalRatingFact[]> {
    const rows: StoredHistoricalRatingFact[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('historical_clash_contest_rating_facts')
        .select('matchup_deduplication_key,contest_id,historical_match_key,season_id,player_id,player_name,team_id,team_name,opponent_team_id,opponent_team_name,side,venue,format,outcome,clash_index_before,opponent_effective_ci,win_probability,actual_points,expected_points,ci_delta,algorithm_version')
        .order('matchup_deduplication_key', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as StoredHistoricalRatingFact[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }

  private async loadMetadata(): Promise<HistoricalEventMetadataRow[]> {
    const rows: HistoricalEventMetadataRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('historical_player_matchups')
        .select('deduplication_key,season_id,season_name,event_label,event_order')
        .order('deduplication_key', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as HistoricalEventMetadataRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }
}
