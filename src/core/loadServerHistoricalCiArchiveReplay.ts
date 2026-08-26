import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
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

const PAGE_SIZE = 1000;

/**
 * Builds the complete historical CI replay from production archive sources.
 * This function is read-only: it never persists rating facts.
 *
 * Historical PDGA seeds are intentionally read with the service-role client.
 * That table is RLS-protected and an ordinary server client can receive an
 * empty result without an error, which would silently force legitimate PDGA
 * players onto provisional 825/700 starts.
 */
export async function loadServerHistoricalCiArchiveReplay(): Promise<HistoricalCiArchiveReplayResult> {
  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const seasonRows = await loadAllSeasonRows(untyped);

  const seasonIds = [...new Set(seasonRows.map((row) => row.season_id))].sort();
  const [playerResult, seedResult, venueByTeamMatchId] = await Promise.all([
    untyped.from('launch_players').select('id,gender'),
    admin.from('clash_rating_historical_seeds').select('season_id,player_name,rating,source'),
    loadHistoricalCiVenues(untyped),
  ]);
  if (playerResult.error) throw playerResult.error;
  if (seedResult.error) throw seedResult.error;

  const seedRows = (seedResult.data ?? []) as SeedRow[];
  const pdgaSeedCount = seedRows.filter((row) => row.source.trim().toLocaleUpperCase() === 'PDGA').length;
  if (pdgaSeedCount === 0) {
    throw new Error('Historical CI replay cannot run without visible PDGA seed rows');
  }

  const genderByPlayerId = new Map(
    ((playerResult.data ?? []) as PlayerRow[]).map((row) => [row.id, row.gender]),
  );
  const legacySeeds = seedRows.map((row): HistoricalLegacySeed => ({
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
      addParticipant(participantsById, genderByPlayerId, row.playerId, row.playerName);
      addParticipant(participantsById, genderByPlayerId, row.opponentOnePlayerId, row.opponentOnePlayerName);
      if (row.partnerPlayerId && row.partnerPlayerName) {
        addParticipant(participantsById, genderByPlayerId, row.partnerPlayerId, row.partnerPlayerName);
      }
      if (row.opponentTwoPlayerId && row.opponentTwoPlayerName) {
        addParticipant(participantsById, genderByPlayerId, row.opponentTwoPlayerId, row.opponentTwoPlayerName);
      }
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

async function loadAllSeasonRows(supabase: SupabaseClient): Promise<SeasonRow[]> {
  const rows: SeasonRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await supabase
      .from('historical_player_matchups')
      .select('season_id')
      .order('season_id', {ascending: true})
      .order('deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as SeasonRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function addParticipant(
  participants: Map<string, HistoricalCiParticipant>,
  genderByPlayerId: ReadonlyMap<string, string | null>,
  playerId: string,
  playerName: string,
): void {
  if (!genderByPlayerId.has(playerId)) {
    throw new Error(`Historical CI player ${playerId} (${playerName}) is missing from launch_players`);
  }
  const existing = participants.get(playerId);
  if (existing && existing.playerName !== playerName) {
    throw new Error(`Historical CI player ${playerId} has conflicting names: ${existing.playerName} / ${playerName}`);
  }
  participants.set(playerId, {
    playerId,
    playerName,
    gender: genderByPlayerId.get(playerId),
  });
}

async function loadHistoricalCiVenues(
  supabase: SupabaseClient,
): Promise<Map<number, ClashVenue>> {
  const {data, error} = await supabase
    .from('historical_team_matches')
    .select('id,ci_venue');
  if (error) {
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
