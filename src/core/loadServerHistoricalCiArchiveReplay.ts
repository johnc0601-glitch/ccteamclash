import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {SupabaseHistoricalPlayerMatchupRepository} from '@/domain/history/SupabaseHistoricalPlayerMatchupRepository';
import type {ClashVenue} from '@/domain/story-engine/ClashPrediction';
import {
  replayHistoricalCiArchive,
  type HistoricalCiArchiveReplayResult,
  type HistoricalCiArchiveSeason,
} from '@/services/statistics/HistoricalCiArchiveReplay';
import type {
  HistoricalCiParticipant,
  HistoricalLegacySeed,
} from '@/services/statistics/HistoricalCiSeedResolver';

type SeasonRow = {season_id: string};
type PlayerRow = {id: string; gender: string | null};
type SeedRow = {season_id: string; player_name: string; rating: number; source: string};
type VenueRow = {id: number; ci_venue: string | null};

/**
 * Builds the complete historical CI replay from production archive sources.
 * This function is read-only: it never persists rating facts.
 */
export async function loadServerHistoricalCiArchiveReplay(): Promise<HistoricalCiArchiveReplayResult> {
  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;
  const seasonResult = await untyped
    .from('historical_player_matchups')
    .select('season_id')
    .order('season_id', {ascending: true});
  if (seasonResult.error) throw seasonResult.error;

  const seasonIds = [...new Set(((seasonResult.data ?? []) as SeasonRow[]).map((row) => row.season_id))].sort();
  const [playerResult, seedResult, venueByTeamMatchId] = await Promise.all([
    untyped.from('launch_players').select('id,gender'),
    untyped.from('clash_rating_historical_seeds').select('season_id,player_name,rating,source'),
    loadHistoricalCiVenues(untyped),
  ]);
  if (playerResult.error) throw playerResult.error;
  if (seedResult.error) throw seedResult.error;

  const genderByPlayerId = new Map(
    ((playerResult.data ?? []) as PlayerRow[]).map((row) => [row.id, row.gender]),
  );
  const legacySeeds = ((seedResult.data ?? []) as SeedRow[]).map((row): HistoricalLegacySeed => ({
    seasonId: row.season_id,
    playerName: row.player_name,
    rating: row.rating,
    source: row.source,
  }));
  const repository = new SupabaseHistoricalPlayerMatchupRepository(supabase);
  const archive: HistoricalCiArchiveSeason[] = [];

  for (const seasonId of seasonIds) {
    const rows = await repository.getBySeasonId(seasonId);
    const participantsById = new Map<string, HistoricalCiParticipant>();
    for (const row of rows) {
      if (!genderByPlayerId.has(row.playerId)) {
        throw new Error(`Historical CI player ${row.playerId} is missing from launch_players`);
      }
      participantsById.set(row.playerId, {
        playerId: row.playerId,
        playerName: row.playerName,
        gender: genderByPlayerId.get(row.playerId),
      });
    }
    archive.push({
      seasonId,
      rows,
      participants: [...participantsById.values()],
      legacySeeds,
      venueByTeamMatchId,
    });
  }

  return replayHistoricalCiArchive(archive);
}

async function loadHistoricalCiVenues(
  supabase: SupabaseClient,
): Promise<Map<number, ClashVenue>> {
  const {data, error} = await supabase
    .from('historical_team_matches')
    .select('id,ci_venue');
  if (error) {
    // During staged rollout this column does not exist until the venue migration
    // is applied. Historical regular season defaults Home and postseason labels
    // are independently classified Neutral by the replay engine.
    if (isMissingVenueColumn(error)) return new Map();
    throw error;
  }
  const rows = (data ?? []) as VenueRow[];
  return new Map(rows.map((row) => [row.id, row.ci_venue === 'Neutral' ? 'Neutral' : 'Home']));
}

function isMissingVenueColumn(error: {code?: string; message?: string}): boolean {
  return error.code === '42703'
    || error.code === 'PGRST204'
    || Boolean(error.message?.includes('ci_venue'));
}
