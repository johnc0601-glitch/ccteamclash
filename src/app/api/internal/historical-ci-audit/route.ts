import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import {createAdminClient} from '@/lib/supabase/admin';
import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';

const AUDIT_SEASON_ID = 'coastal-clash-2024-2025';
const PAGE_SIZE = 1000;

type PublishedFact = {
  player_id: string;
  player_name: string;
  clash_index_before: number;
  ci_delta: number;
};

export async function GET() {
  // This is a temporary, read-only feature-branch diagnostic. Never expose it
  // on the production deployment even if the file is accidentally merged.
  if (process.env.VERCEL_ENV === 'production') {
    return new Response('Not found', {status: 404});
  }

  const replay = await loadServerHistoricalCiArchiveReplay();
  const season = replay.seasons.get(AUDIT_SEASON_ID);
  if (!season) throw new Error(`Missing replay season ${AUDIT_SEASON_ID}`);

  const admin = createAdminClient() as unknown as SupabaseClient;
  const published = await loadPublishedFacts(admin, AUDIT_SEASON_ID);
  const publishedFirstStart = new Map<string, number>();
  const publishedNames = new Map<string, string>();
  for (const fact of published) {
    if (!publishedFirstStart.has(fact.player_id)) {
      publishedFirstStart.set(fact.player_id, fact.clash_index_before);
      publishedNames.set(fact.player_id, fact.player_name);
    }
  }

  const correctedGain = new Map<string, number>();
  for (const fact of season.facts) {
    correctedGain.set(fact.playerId, (correctedGain.get(fact.playerId) ?? 0) + fact.ciDelta);
  }

  const starts = [...season.startingRatings.entries()]
    .map(([playerId, correctedStart]) => ({
      playerId,
      playerName: publishedNames.get(playerId) ?? playerId,
      publishedStart: publishedFirstStart.get(playerId) ?? null,
      correctedStart,
      difference: publishedFirstStart.has(playerId)
        ? correctedStart - (publishedFirstStart.get(playerId) as number)
        : null,
      correctedGain: correctedGain.get(playerId) ?? 0,
      correctedEndingCi: season.endingRatings.get(playerId) ?? null,
    }))
    .sort((left, right) => {
      const leftAbs = Math.abs(left.difference ?? 0);
      const rightAbs = Math.abs(right.difference ?? 0);
      return rightAbs - leftAbs || left.playerName.localeCompare(right.playerName);
    });

  const brooks = starts.find((row) => row.playerId === 'brooks-mcgill') ?? null;

  return Response.json({
    readOnly: true,
    seasonId: AUDIT_SEASON_ID,
    publishedLedgerFacts: published.length,
    correctedReplayFacts: season.facts.length,
    playerStarts: starts.length,
    changedStarts: starts.filter((row) => row.difference !== 0).length,
    provisional825PublishedStarts: starts.filter((row) => row.publishedStart === 825).length,
    corrected825Starts: starts.filter((row) => row.correctedStart === 825).length,
    brooks,
    largestStartCorrections: starts.slice(0, 30),
  });
}

async function loadPublishedFacts(
  supabase: SupabaseClient,
  seasonId: string,
): Promise<PublishedFact[]> {
  const rows: PublishedFact[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await supabase
      .from('historical_clash_contest_rating_facts')
      .select('player_id,player_name,clash_index_before,ci_delta')
      .eq('season_id', seasonId)
      .order('historical_team_match_id', {ascending: true})
      .order('matchup_deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as PublishedFact[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}
