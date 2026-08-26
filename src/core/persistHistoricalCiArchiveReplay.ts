import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import {createAdminClient} from '@/lib/supabase/admin';
import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';

export const EXPECTED_COMPLETE_HISTORICAL_CI_FACTS = 2568;

type CountRow = {count: number | null};

export type HistoricalCiPersistenceResult = {
  insertedFacts: number;
  expectedFacts: number;
};

/**
 * Writes the finalized historical CI archive exactly once.
 *
 * The replay itself fails closed on unresolved rows, incomplete contests,
 * duplicate ledger keys, and non-zero-sum contests. This persistence layer adds
 * two more guards: the replay must match the reviewed final source count, and
 * the immutable destination ledger must be empty before insertion.
 */
export async function persistHistoricalCiArchiveReplay(
  expectedFacts: number = EXPECTED_COMPLETE_HISTORICAL_CI_FACTS,
): Promise<HistoricalCiPersistenceResult> {
  const replay = await loadServerHistoricalCiArchiveReplay();
  if (replay.ledger.length !== expectedFacts) {
    throw new Error(`Historical CI replay produced ${replay.ledger.length}/${expectedFacts} expected facts`);
  }

  const admin = createAdminClient() as unknown as SupabaseClient;
  const existing = await admin
    .from('historical_clash_contest_rating_facts')
    .select('*', {count: 'exact', head: true});
  if (existing.error) throw existing.error;
  if ((existing.count ?? 0) !== 0) {
    throw new Error(`Historical CI ledger is not empty (${existing.count ?? 0} existing facts)`);
  }

  // One PostgREST INSERT statement keeps the publication all-or-nothing at the
  // database statement level. Never batch this immutable initial backfill.
  const inserted = await admin
    .from('historical_clash_contest_rating_facts')
    .insert(replay.ledger)
    .select('matchup_deduplication_key');
  if (inserted.error) throw inserted.error;
  if ((inserted.data ?? []).length !== expectedFacts) {
    throw new Error(`Historical CI ledger inserted ${(inserted.data ?? []).length}/${expectedFacts} facts`);
  }

  return {insertedFacts: expectedFacts, expectedFacts};
}
