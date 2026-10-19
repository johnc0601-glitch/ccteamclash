import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {generateRoundFacts, type PulseSource} from './PulseFacts';

// The additive tables are intentionally independent of the generated legacy schema types.
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function loadPulseOptions(client: SupabaseClient) {
  const db = client as any;
  const [seasons, rounds] = await Promise.all([
    db.from('launch_seasons').select('id,name,active').order('year', {ascending: false}),
    db.from('launch_rounds').select('id,season_id,number,name,date').order('number'),
  ]);
  if (seasons.error) throw seasons.error;
  if (rounds.error) throw rounds.error;
  return {seasons: seasons.data as PulseSource['seasons'], rounds: rounds.data as PulseSource['rounds']};
}

async function paged(db: any, table: string, order: string, field?: string, values?: string[], columns = '*') {
  const rows: any[] = [];
  if (values && values.length === 0) return rows;
  for (let from = 0; ; from += 500) {
    let query = db.from(table).select(columns).order(order);
    // Rating facts have a composite primary key; keep page boundaries stable.
    if (table === 'clash_contest_rating_facts') query = query.order('player_id');
    if (field && values) query = query.in(field, values);
    const {data, error} = await query.range(from, from + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

export async function loadPulseSource(client: SupabaseClient, seasonId: string, roundId: string): Promise<PulseSource> {
  const db = client as any;
  const options = await loadPulseOptions(client);
  if (!options.rounds.some(r => r.id === roundId && r.season_id === seasonId)) throw new Error('Choose a round in this season.');
  const [matches, teams] = await Promise.all([
    paged(db, 'launch_schedule_matches', 'id', 'season_id', [seasonId]),
    paged(db, 'launch_teams', 'id', undefined, undefined, 'id,name'),
  ]);
  const selected = options.rounds.find(r => r.id === roundId)!;
  const priorRounds = new Set(options.rounds
    .filter(r => r.season_id === seasonId && r.number <= selected.number)
    .map(r => r.id));
  const ids = matches.filter(m => priorRounds.has(m.round_id)).map(m => m.id);
  const [results, ratings, snapshots, adjustments, predictions, history, rosterPlayers, rosterManifests, frozenRatings] = await Promise.all([
    paged(db, 'launch_match_results', 'match_id', 'match_id', ids),
    paged(db, 'clash_contest_rating_facts', 'contest_id', 'match_id', ids),
    paged(db, 'launch_match_final_snapshots', 'match_id', 'match_id', ids, 'match_id,locked,payload'),
    paged(db, 'launch_match_structural_points', 'id', 'match_id', ids),
    paged(db, 'team_strength_prediction_snapshots', 'match_id', 'match_id', ids),
    paged(db, 'historical_team_matches', 'id', undefined, undefined,
      'id,season_name,event_label,played_on,home_team_name,away_team_name,home_score,away_score'),
    paged(db, 'launch_match_roster_snapshot_players', 'player_id', 'match_id', ids, 'match_id,team_id,player_id'),
    paged(db, 'launch_match_roster_snapshots', 'match_id', 'match_id', ids, 'match_id,team_id'),
    paged(db, 'clash_match_rating_snapshots', 'player_id', 'match_id', ids, 'match_id,team_id,player_id,clash_index_before'),
  ]);
  // PostgREST numeric fields may be strings. Null is never coerced into zero.
  const numeric = (value: unknown) => value == null || value === '' ? NaN : Number(value);
  return {...options, matches: matches.map(m => ({...m, home_name: teams.find(t => t.id === m.home_team_id)?.name ?? m.home_team_id,
    away_name: teams.find(t => t.id === m.away_team_id)?.name ?? m.away_team_id})),
    results: results.map(r => ({...r, home_score: numeric(r.home_score), away_score: numeric(r.away_score)})),
    ratings: ratings.map(r => ({...r, win_probability: numeric(r.win_probability), ci_delta: numeric(r.ci_delta), clash_index_before: numeric(r.clash_index_before)})),
    snapshots, adjustments: adjustments.map(a => ({...a, points: numeric(a.points)})),
    predictions: predictions.map(p => ({...p, expected_score: numeric(p.expected_score), chance_of_victory: numeric(p.chance_of_victory)})),
    history: history.map(h => ({...h, home_score: numeric(h.home_score), away_score: numeric(h.away_score)})),
    rosterPlayers, rosterManifests, frozenRatings: frozenRatings.map(r => ({...r, clash_index_before: numeric(r.clash_index_before)}))};
}

export async function regeneratePulseRound(client: SupabaseClient, seasonId: string, roundId: string) {
  const started = new Date().toISOString();
  const source = await loadPulseSource(client, seasonId, roundId);
  const report = generateRoundFacts(source, roundId);
  const {error} = await (client as any).rpc('save_clash_pulse_generation', {
    p_season_id: seasonId, p_round_id: roundId, p_started_at: started, p_report: report,
  });
  if (error) throw error;
  return report;
}

export async function loadPulseLibrary(client: SupabaseClient, roundId: string) {
  const db = client as any;
  const [facts, generation, queued] = await Promise.all([
    paged(db, 'clash_pulse_facts', 'fact_key', 'round_id', [roundId]),
    db.from('clash_pulse_generations').select('*').eq('round_id', roundId).maybeSingle(),
    db.from('clash_pulse_generation_queue').select('requested_at').eq('round_id', roundId).maybeSingle(),
  ]);
  if (generation.error) throw generation.error;
  if (queued.error) throw queued.error;
  return {facts: facts.filter(f => f.is_current), generation: generation.data, queued: Boolean(queued.data)};
}
