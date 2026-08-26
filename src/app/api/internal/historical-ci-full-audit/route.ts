import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';
import {clashSeasonStartCi} from '@/domain/story-engine/ClashSeasonReset';
import {createAdminClient} from '@/lib/supabase/admin';
import {
  resolveHistoricalCiSeeds,
  type HistoricalCiParticipant,
  type HistoricalLegacySeed,
} from '@/services/statistics/HistoricalCiSeedResolver';

const SEASON_2024 = 'coastal-clash-2024-2025';
const SEASON_2025 = 'coastal-clash-2025-2026';
const PAGE_SIZE = 1000;

type PublishedFact = {
  matchup_deduplication_key: string;
  season_id: string;
  player_id: string;
  player_name: string;
  clash_index_before: number;
  ci_delta: number;
};

type ParticipantRow = {
  player_id: string;
  player_name: string;
  partner_player_id: string | null;
  partner_player_name: string | null;
  opponent_one_player_id: string;
  opponent_one_player_name: string;
  opponent_two_player_id: string | null;
  opponent_two_player_name: string | null;
};

type PlayerRow = {id: string; gender: string | null};
type SeedRow = {season_id: string; player_name: string; rating: number; source: string};

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return new Response('Not found', {status: 404});
  }

  const admin = createAdminClient() as unknown as SupabaseClient;
  const replay = await loadServerHistoricalCiArchiveReplay();
  const season2024 = replay.seasons.get(SEASON_2024);
  const season2025 = replay.seasons.get(SEASON_2025);
  if (!season2024 || !season2025) throw new Error('Missing historical replay season');

  const [published, participantRows, playerResult, seedResult] = await Promise.all([
    loadPublishedFacts(admin),
    loadParticipantRows(admin, SEASON_2025),
    admin.from('launch_players').select('id,gender'),
    admin.from('clash_rating_historical_seeds').select('season_id,player_name,rating,source'),
  ]);
  if (playerResult.error) throw playerResult.error;
  if (seedResult.error) throw seedResult.error;

  const genderById = new Map(((playerResult.data ?? []) as PlayerRow[]).map((row) => [row.id, row.gender]));
  const participants = collectParticipants(participantRows, genderById);
  const legacySeeds = ((seedResult.data ?? []) as SeedRow[]).map((row): HistoricalLegacySeed => ({
    seasonId: row.season_id,
    playerName: row.player_name,
    rating: row.rating,
    source: row.source,
  }));
  const resolved2025 = resolveHistoricalCiSeeds(SEASON_2025, participants, legacySeeds);
  const resolved2025ById = new Map(resolved2025.map((row) => [row.playerId, row]));

  const resetRows = [...season2025.startingRatings.entries()].map(([playerId, actualStart]) => {
    const priorEndingCi = season2024.endingRatings.get(playerId) ?? null;
    const seed = resolved2025ById.get(playerId);
    if (!seed) throw new Error(`Missing resolved 2025 seed for ${playerId}`);
    const expectedStart = clashSeasonStartCi({
      priorClashIndex: priorEndingCi,
      pdgaRating: seed.pdgaRating,
      division: seed.division,
    });
    return {
      playerId,
      priorEndingCi,
      pdgaRating: seed.pdgaRating,
      seedSource: seed.source,
      expectedStart,
      actualStart,
      matches: expectedStart === actualStart,
      returning: priorEndingCi != null,
    };
  });

  const oldByPlayer = summarizePublished(published);
  const correctedByPlayer = summarizeCorrected(replay);
  const playerIds = new Set([...oldByPlayer.keys(), ...correctedByPlayer.keys()]);
  const comparison = [...playerIds].map((playerId) => {
    const oldRow = oldByPlayer.get(playerId);
    const corrected = correctedByPlayer.get(playerId);
    const oldGain = oldRow?.careerGain ?? 0;
    const correctedGain = corrected?.careerGain ?? 0;
    const oldEndingCi = oldRow?.endingCi ?? null;
    const correctedEndingCi = corrected?.endingCi ?? null;
    return {
      playerId,
      playerName: corrected?.playerName ?? oldRow?.playerName ?? playerId,
      oldGain,
      correctedGain,
      gainDifference: correctedGain - oldGain,
      oldEndingCi,
      correctedEndingCi,
      endingDifference: oldEndingCi == null || correctedEndingCi == null ? null : correctedEndingCi - oldEndingCi,
    };
  }).sort((a, b) => {
    const aMagnitude = Math.max(Math.abs(a.gainDifference), Math.abs(a.endingDifference ?? 0));
    const bMagnitude = Math.max(Math.abs(b.gainDifference), Math.abs(b.endingDifference ?? 0));
    return bMagnitude - aMagnitude || a.playerName.localeCompare(b.playerName);
  });

  const correctedCareerGain = new Map<string, {playerName: string; gain: number}>();
  for (const season of replay.seasons.values()) {
    for (const fact of season.facts) {
      const current = correctedCareerGain.get(fact.playerId) ?? {playerName: fact.playerName, gain: 0};
      current.gain += fact.ciDelta;
      correctedCareerGain.set(fact.playerId, current);
    }
  }

  const outlierGains = [...correctedCareerGain.entries()]
    .map(([playerId, row]) => ({playerId, playerName: row.playerName, gain: row.gain}))
    .filter((row) => Math.abs(row.gain) >= 40)
    .sort((a, b) => Math.abs(b.gain) - Math.abs(a.gain));

  const finalRatings = [...replay.finalRatings.entries()]
    .map(([playerId, ci]) => ({playerId, ci, playerName: correctedByPlayer.get(playerId)?.playerName ?? playerId}));

  return Response.json({
    readOnly: true,
    structure: {
      totalFacts: replay.ledger.length,
      seasonFacts: {
        [SEASON_2024]: season2024.facts.length,
        [SEASON_2025]: season2025.facts.length,
      },
      season2024Quarantine: season2024.quarantine.length,
      season2025Quarantine: season2025.quarantine.length,
      season2024Reconciled: season2024.reconciliation.allRowsAccountedFor,
      season2025Reconciled: season2025.reconciliation.allRowsAccountedFor,
      uniqueLedgerKeys: new Set(replay.ledger.map((row) => row.matchup_deduplication_key)).size,
    },
    reset2025: {
      players: resetRows.length,
      returningPlayers: resetRows.filter((row) => row.returning).length,
      newPlayers: resetRows.filter((row) => !row.returning).length,
      mismatches: resetRows.filter((row) => !row.matches).length,
      seedSources: countBy(resetRows.map((row) => row.seedSource)),
    },
    comparison: {
      playersCompared: comparison.length,
      playersChanged: comparison.filter((row) => row.gainDifference !== 0 || row.endingDifference !== 0).length,
      largestChanges: comparison.slice(0, 40),
    },
    brooks: comparison.find((row) => row.playerId === 'brooks-mcgill') ?? null,
    correctedOutlierGains: outlierGains,
    correctedFinalHigh: [...finalRatings].sort((a, b) => b.ci - a.ci).slice(0, 20),
    correctedFinalLow: [...finalRatings].sort((a, b) => a.ci - b.ci).slice(0, 20),
  });
}

async function loadPublishedFacts(supabase: SupabaseClient): Promise<PublishedFact[]> {
  const rows: PublishedFact[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await supabase
      .from('historical_clash_contest_rating_facts')
      .select('matchup_deduplication_key,season_id,player_id,player_name,clash_index_before,ci_delta')
      .order('season_id', {ascending: true})
      .order('historical_team_match_id', {ascending: true})
      .order('matchup_deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as PublishedFact[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function loadParticipantRows(supabase: SupabaseClient, seasonId: string): Promise<ParticipantRow[]> {
  const rows: ParticipantRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await supabase
      .from('historical_player_matchups')
      .select('player_id,player_name,partner_player_id,partner_player_name,opponent_one_player_id,opponent_one_player_name,opponent_two_player_id,opponent_two_player_name')
      .eq('season_id', seasonId)
      .order('deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as ParticipantRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function collectParticipants(
  rows: ParticipantRow[],
  genderById: ReadonlyMap<string, string | null>,
): HistoricalCiParticipant[] {
  const players = new Map<string, HistoricalCiParticipant>();
  const add = (playerId: string | null, playerName: string | null) => {
    if (!playerId || !playerName || players.has(playerId)) return;
    players.set(playerId, {playerId, playerName, gender: genderById.get(playerId) ?? null});
  };
  for (const row of rows) {
    add(row.player_id, row.player_name);
    add(row.partner_player_id, row.partner_player_name);
    add(row.opponent_one_player_id, row.opponent_one_player_name);
    add(row.opponent_two_player_id, row.opponent_two_player_name);
  }
  return [...players.values()];
}

function summarizePublished(facts: PublishedFact[]) {
  const byPlayer = new Map<string, {
    playerName: string;
    careerGain: number;
    firstStartBySeason: Map<string, number>;
    gainBySeason: Map<string, number>;
    endingCi: number;
  }>();
  for (const fact of facts) {
    const row = byPlayer.get(fact.player_id) ?? {
      playerName: fact.player_name,
      careerGain: 0,
      firstStartBySeason: new Map(),
      gainBySeason: new Map(),
      endingCi: fact.clash_index_before,
    };
    if (!row.firstStartBySeason.has(fact.season_id)) {
      row.firstStartBySeason.set(fact.season_id, fact.clash_index_before);
    }
    row.careerGain += fact.ci_delta;
    row.gainBySeason.set(fact.season_id, (row.gainBySeason.get(fact.season_id) ?? 0) + fact.ci_delta);
    const seasonStart = row.firstStartBySeason.get(fact.season_id) as number;
    row.endingCi = seasonStart + (row.gainBySeason.get(fact.season_id) ?? 0);
    byPlayer.set(fact.player_id, row);
  }
  return byPlayer;
}

function summarizeCorrected(replay: Awaited<ReturnType<typeof loadServerHistoricalCiArchiveReplay>>) {
  const byPlayer = new Map<string, {playerName: string; careerGain: number; endingCi: number}>();
  for (const season of replay.seasons.values()) {
    for (const fact of season.facts) {
      const row = byPlayer.get(fact.playerId) ?? {playerName: fact.playerName, careerGain: 0, endingCi: 0};
      row.careerGain += fact.ciDelta;
      row.playerName = fact.playerName;
      byPlayer.set(fact.playerId, row);
    }
  }
  for (const [playerId, endingCi] of replay.finalRatings) {
    const row = byPlayer.get(playerId) ?? {playerName: playerId, careerGain: 0, endingCi};
    row.endingCi = endingCi;
    byPlayer.set(playerId, row);
  }
  return byPlayer;
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}
