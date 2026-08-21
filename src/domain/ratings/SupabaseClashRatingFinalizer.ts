import type {SupabaseClient} from '@supabase/supabase-js';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {buildClashContestLedger} from '@/domain/ratings/ClashRatingAudit';
import {calculateEventRatings, type ClashRatingState} from '@/domain/ratings/ClashRatingEngine';
import {assessClashFinalization, finalizeClashEvent} from '@/domain/ratings/ClashRatingFinalizationService';
import {
  resolveEventStartStates,
  type PriorEventRatingSnapshot,
  type PriorSeasonRatingSnapshot,
} from '@/domain/ratings/ClashRatingStateResolver';
import {SupabaseResultsRepository} from '@/domain/results/SupabaseResultsRepository';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';

export const CLASH_ALGORITHM_VERSION = 'CR-2026-v1';

type AnyClient = SupabaseClient<any>;

type FinalizationRow = {
  player_id: string;
  rating_before: number;
  singles_delta: number;
  doubles_delta: number;
  provisional_adjustment: number;
  rating_after: number;
  rated_results_before: number;
  rated_results_after: number;
  provisional_events_before: number;
  provisional_events_after: number;
  provisional_before: boolean;
  provisional_after: boolean;
};

type LedgerRow = {
  source_key: string;
  source_contest_id: string;
  player_id: string;
  format: 'Singles' | 'Doubles';
  side: 'Home' | 'Away';
  outcome: 'W' | 'L' | 'T';
  rating_before: number;
  partner_player_id: string | null;
  partner_rating: number | null;
  opponent_one_player_id: string;
  opponent_one_rating: number;
  opponent_two_player_id: string | null;
  opponent_two_rating: number | null;
  own_pair_rating: number | null;
  opponent_pair_rating: number | null;
  home_adjustment: number;
  expected_score: number;
  actual_score: 0 | 0.5 | 1;
  competitive_delta: number;
  provisional_multiplier: number;
  provisional_adjustment: number;
  total_delta: number;
};

export type ClashFinalizationPreview = {
  roundId: string;
  seasonId: string;
  eventOrder: number;
  eventLabel: string;
  eligibleMatches: number;
  publishedMatches: number;
  participatingPlayers: number;
  ratedContests: number;
  rows: FinalizationRow[];
  ledger: LedgerRow[];
};

export class SupabaseClashRatingFinalizer {
  private readonly db: AnyClient;
  private readonly schedules: SupabaseScheduleRepository;
  private readonly results: SupabaseResultsRepository;
  private readonly launch: SupabaseLaunchRepository;

  constructor(supabase: AnyClient) {
    this.db = supabase;
    this.schedules = new SupabaseScheduleRepository(supabase as never);
    this.results = new SupabaseResultsRepository(supabase as never);
    this.launch = new SupabaseLaunchRepository(supabase as never);
  }

  async preview(roundId: string): Promise<ClashFinalizationPreview> {
    const round = await this.schedules.getRound(roundId);
    if (!round) throw new Error('Round not found.');

    const matches = await this.schedules.getMatches(round.id);
    const matchIds = new Set(matches.map((match) => match.id));
    const results = (await this.results.getAll()).filter((result) => matchIds.has(result.matchId));
    const contestsByMatch = new Map(
      await Promise.all(matches.map(async (match) => [match.id, await this.results.getContests(match.id)] as const)),
    );

    const readiness = assessClashFinalization(round, matches, results, contestsByMatch);
    if (!readiness.ready) throw new Error(readiness.message);

    await this.assertEventOrder(round.seasonId, round.id, round.number);

    const contests = readiness.eligibleMatchIds.flatMap((matchId) => contestsByMatch.get(matchId) ?? []);
    const participantIds = new Set(contests.flatMap((contest) => contest.players.map((player) => player.playerId)));
    const players = (await this.launch.getPlayers()).filter((player) => participantIds.has(player.id));
    if (players.length !== participantIds.size) {
      throw new Error('One or more contest players could not be loaded from the player database.');
    }

    const [priorSeason, latestPriorByPlayer] = await Promise.all([
      this.loadPriorSeasonSnapshots(round.seasonId),
      this.loadLatestPriorPlayerStates(round.seasonId, round.number, participantIds),
    ]);
    const states = resolveEventStartStates({players, priorSeason, latestPriorByPlayer});
    const event = finalizeClashEvent({round, matches, results, contestsByMatch, states});
    const rows = buildFinalizationRows(event.contests, states, event.result.nextStates);
    const ledger = buildClashContestLedger(event.contests, states).map((row) => ({
      source_key: row.sourceKey,
      source_contest_id: row.sourceContestId,
      player_id: row.playerId,
      format: row.format,
      side: row.side,
      outcome: row.outcome,
      rating_before: row.ratingBefore,
      partner_player_id: row.partnerPlayerId,
      partner_rating: row.partnerRating,
      opponent_one_player_id: row.opponentOnePlayerId,
      opponent_one_rating: row.opponentOneRating,
      opponent_two_player_id: row.opponentTwoPlayerId,
      opponent_two_rating: row.opponentTwoRating,
      own_pair_rating: row.ownPairRating,
      opponent_pair_rating: row.opponentPairRating,
      home_adjustment: row.homeAdjustment,
      expected_score: row.expectedScore,
      actual_score: row.actualScore,
      competitive_delta: row.competitiveDelta,
      provisional_multiplier: row.provisionalMultiplier,
      provisional_adjustment: row.provisionalAdjustment,
      total_delta: row.totalDelta,
    }));

    assertLedgerMatchesRows(rows, ledger);

    return {
      roundId: round.id,
      seasonId: round.seasonId,
      eventOrder: round.number,
      eventLabel: round.name || `Round ${round.number}`,
      eligibleMatches: readiness.eligibleMatchIds.length,
      publishedMatches: readiness.publishedMatchIds.length,
      participatingPlayers: rows.length,
      ratedContests: event.contests.length,
      rows,
      ledger,
    };
  }

  async finalize(roundId: string): Promise<{runId: string; preview: ClashFinalizationPreview}> {
    const preview = await this.preview(roundId);
    const {data, error} = await this.db.rpc('finalize_clash_rating_event', {
      p_season_id: preview.seasonId,
      p_event_key: preview.roundId,
      p_event_order: preview.eventOrder,
      p_event_label: preview.eventLabel,
      p_algorithm_version: CLASH_ALGORITHM_VERSION,
      p_rows: preview.rows,
      p_ledger: preview.ledger,
    });
    if (error) throw error;
    if (typeof data !== 'string' || !data) throw new Error('Clash rating finalization did not return a run id.');
    return {runId: data, preview};
  }

  private async assertEventOrder(seasonId: string, eventKey: string, eventOrder: number) {
    const {data: existing, error: existingError} = await this.db
      .from('clash_rating_event_players')
      .select('player_id')
      .eq('season_id', seasonId)
      .eq('event_key', eventKey)
      .limit(1);
    if (existingError) throw existingError;
    if (existing?.length) throw new Error('This event has already been finalized.');

    const {data: last, error: lastError} = await this.db
      .from('clash_rating_event_players')
      .select('event_order')
      .eq('season_id', seasonId)
      .order('event_order', {ascending: false})
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;
    const lastOrder = last?.event_order as number | undefined;
    if (lastOrder === undefined && eventOrder !== 1) {
      throw new Error('Round 1 must be finalized before later events.');
    }
    if (lastOrder !== undefined && eventOrder !== lastOrder + 1) {
      throw new Error(`Events must be finalized in order. Round ${lastOrder} is the latest finalized event.`);
    }
  }

  private async loadPriorSeasonSnapshots(seasonId: string): Promise<PriorSeasonRatingSnapshot[]> {
    const {data: current, error: currentError} = await this.db
      .from('launch_seasons')
      .select('start_date')
      .eq('id', seasonId)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current?.start_date) return [];

    const {data: priorSeason, error: priorSeasonError} = await this.db
      .from('launch_seasons')
      .select('id')
      .eq('published', true)
      .lt('end_date', current.start_date)
      .order('end_date', {ascending: false})
      .limit(1)
      .maybeSingle();
    if (priorSeasonError) throw priorSeasonError;
    if (!priorSeason?.id) return [];

    const {data, error} = await this.db
      .from('clash_rating_season_snapshots')
      .select('player_id,rating,rated_results')
      .eq('season_id', priorSeason.id)
      .eq('algorithm_version', CLASH_ALGORITHM_VERSION);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      playerId: row.player_id,
      rating: row.rating,
      ratedResults: row.rated_results,
    }));
  }

  private async loadLatestPriorPlayerStates(
    seasonId: string,
    eventOrder: number,
    participantIds: Set<string>,
  ): Promise<PriorEventRatingSnapshot[]> {
    if (eventOrder <= 1 || !participantIds.size) return [];
    const {data, error} = await this.db
      .from('clash_rating_event_players')
      .select('player_id,event_order,rating_after,rated_results_after,provisional_events_after,provisional_after')
      .eq('season_id', seasonId)
      .lt('event_order', eventOrder)
      .in('player_id', [...participantIds])
      .order('event_order', {ascending: false});
    if (error) throw error;

    const latest = new Map<string, PriorEventRatingSnapshot>();
    for (const row of data ?? []) {
      if (latest.has(row.player_id)) continue;
      latest.set(row.player_id, {
        playerId: row.player_id,
        ratingAfter: row.rating_after,
        ratedResultsAfter: row.rated_results_after,
        provisionalEventsAfter: row.provisional_events_after,
        provisionalAfter: row.provisional_after,
      });
    }
    return [...latest.values()];
  }
}

function buildFinalizationRows(
  contests: Awaited<ReturnType<SupabaseResultsRepository['getContests']>>,
  states: ClashRatingState[],
  nextStates: ClashRatingState[],
): FinalizationRow[] {
  const full = calculateEventRatings(contests, states);
  const singles = calculateEventRatings(contests.filter((contest) => contest.format === 'Singles'), states);
  const doubles = calculateEventRatings(contests.filter((contest) => contest.format === 'Doubles'), states);
  const fullDelta = new Map(full.deltas.map((delta) => [delta.playerId, delta]));
  const singlesDelta = new Map(singles.deltas.map((delta) => [delta.playerId, delta.competitiveDelta]));
  const doublesDelta = new Map(doubles.deltas.map((delta) => [delta.playerId, delta.competitiveDelta]));
  const before = new Map(states.map((state) => [state.playerId, state]));
  const after = new Map(nextStates.map((state) => [state.playerId, state]));

  return [...fullDelta.keys()].map((playerId) => {
    const start = before.get(playerId);
    const end = after.get(playerId);
    const delta = fullDelta.get(playerId);
    if (!start || !end || !delta) throw new Error(`Incomplete Clash finalization row for ${playerId}.`);
    return {
      player_id: playerId,
      rating_before: start.rating,
      singles_delta: singlesDelta.get(playerId) ?? 0,
      doubles_delta: doublesDelta.get(playerId) ?? 0,
      provisional_adjustment: delta.provisionalAdjustment,
      rating_after: end.rating,
      rated_results_before: start.ratedResults,
      rated_results_after: end.ratedResults,
      provisional_events_before: start.provisionalEventsPlayed,
      provisional_events_after: end.provisionalEventsPlayed,
      provisional_before: start.provisional,
      provisional_after: end.provisional,
    };
  });
}

function assertLedgerMatchesRows(rows: FinalizationRow[], ledger: LedgerRow[]) {
  const totals = new Map<string, number>();
  for (const row of ledger) totals.set(row.player_id, (totals.get(row.player_id) ?? 0) + row.total_delta);
  for (const row of rows) {
    const ledgerTotal = totals.get(row.player_id) ?? 0;
    const eventTotal = row.rating_after - row.rating_before;
    if (Math.abs(ledgerTotal - eventTotal) > 0.001) {
      throw new Error(`Clash ledger mismatch for ${row.player_id}: event ${eventTotal}, ledger ${ledgerTotal}.`);
    }
  }
}
