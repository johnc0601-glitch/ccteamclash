import 'server-only';

import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import type {Player} from '@/models/Player';

type PlayerGenderRow = {id: string; gender: Player['gender'] | null};

/**
 * Preview uses staging for live/current-season data, but staging intentionally
 * does not contain the complete historical player archive. Merge canonical
 * production genders into the preview's historical Stats classification only.
 */
export async function loadServerHistoricalGenderMap(): Promise<Map<string, Player['gender']>> {
  if (process.env.VERCEL_ENV !== 'preview') return new Map();

  const supabase = await createHistoricalStatsReadClient();
  const {data, error} = await supabase
    .from('launch_players')
    .select('id,gender');
  if (error) throw error;

  return new Map(
    ((data ?? []) as PlayerGenderRow[])
      .filter((row): row is {id: string; gender: Player['gender']} => row.gender !== null)
      .map((row) => [row.id, row.gender]),
  );
}
