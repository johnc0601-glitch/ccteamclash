import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import {
  MATCH_STRUCTURE_DOUBLES_COUNT,
  MATCH_STRUCTURE_SINGLES_COUNT,
  type LockedMatchStructure,
} from './MatchStructureLock';
import {
  type MatchStructureRepository,
  toMatchStructureSlotRecords,
} from './MatchStructureRepository';

type StoredLock = {
  id: string;
  match_id: string;
  home_team_id: string;
  away_team_id: string;
  status: string;
  locked_by: string | null;
  locked_at: string | null;
};

type StoredSlot = {
  format: string;
  position: number;
  side: string;
  player_slot: number;
  player_id: string | null;
};

/** Server-side repository. The staged tables/RPC are intentionally isolated
 * behind a narrow cast until the migration lands and generated types refresh. */
export class SupabaseMatchStructureRepository implements MatchStructureRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getLocked(matchId: string): Promise<LockedMatchStructure | undefined> {
    const client = this.supabase as any;
    const {data: lock, error: lockError} = await client
      .from('launch_match_structure_locks')
      .select('id,match_id,home_team_id,away_team_id,status,locked_by,locked_at')
      .eq('match_id', matchId)
      .eq('status', 'Locked')
      .maybeSingle();
    if (lockError) throw lockError;
    if (!lock) return undefined;

    const {data: slots, error: slotError} = await client
      .from('launch_match_structure_slots')
      .select('format,position,side,player_slot,player_id')
      .eq('structure_lock_id', lock.id)
      .order('format')
      .order('position')
      .order('side')
      .order('player_slot');
    if (slotError) throw slotError;

    return fromStoredStructure(lock as StoredLock, (slots ?? []) as StoredSlot[]);
  }

  async saveLocked(structure: LockedMatchStructure): Promise<void> {
    const client = this.supabase as any;
    const {error} = await client.rpc('save_locked_match_structure', {
      p_match_id: structure.matchId,
      p_home_team_id: structure.homeTeamId,
      p_away_team_id: structure.awayTeamId,
      p_locked_by: structure.lockedBy,
      p_locked_at: structure.lockedAt,
      p_slots: toMatchStructureSlotRecords(structure),
    });
    if (error) throw error;
  }
}

export function fromStoredStructure(
  lock: StoredLock,
  slots: readonly StoredSlot[],
): LockedMatchStructure | undefined {
  if (
    lock.status !== 'Locked'
    || !lock.match_id
    || !lock.home_team_id
    || !lock.away_team_id
    || !lock.locked_by
    || !lock.locked_at
    || !Number.isFinite(Date.parse(lock.locked_at))
    || slots.length !== 72
  ) return undefined;

  const singles = Array.from({length: MATCH_STRUCTURE_SINGLES_COUNT}, (_, index) => ({
    position: index + 1,
    homePlayerId: null as string | null,
    awayPlayerId: null as string | null,
  }));
  const doubles = Array.from({length: MATCH_STRUCTURE_DOUBLES_COUNT}, (_, index) => ({
    position: index + 1,
    homePlayerIds: [null, null] as [string | null, string | null],
    awayPlayerIds: [null, null] as [string | null, string | null],
  }));
  const seen = new Set<string>();

  for (const slot of slots) {
    const key = `${slot.format}:${slot.position}:${slot.side}:${slot.player_slot}`;
    if (seen.has(key)) return undefined;
    seen.add(key);

    if (slot.format === 'Singles') {
      if (
        slot.position < 1
        || slot.position > MATCH_STRUCTURE_SINGLES_COUNT
        || slot.player_slot !== 1
        || (slot.side !== 'Home' && slot.side !== 'Away')
      ) return undefined;
      if (slot.side === 'Home') singles[slot.position - 1].homePlayerId = slot.player_id;
      else singles[slot.position - 1].awayPlayerId = slot.player_id;
      continue;
    }

    if (
      slot.format !== 'Doubles'
      || slot.position < 1
      || slot.position > MATCH_STRUCTURE_DOUBLES_COUNT
      || (slot.player_slot !== 1 && slot.player_slot !== 2)
      || (slot.side !== 'Home' && slot.side !== 'Away')
    ) return undefined;

    const pair = slot.side === 'Home'
      ? doubles[slot.position - 1].homePlayerIds
      : doubles[slot.position - 1].awayPlayerIds;
    pair[slot.player_slot - 1] = slot.player_id;
  }

  if (seen.size !== 72) return undefined;

  return {
    matchId: lock.match_id,
    homeTeamId: lock.home_team_id,
    awayTeamId: lock.away_team_id,
    status: 'Locked',
    singles,
    doubles,
    lockedBy: lock.locked_by,
    lockedAt: lock.locked_at,
  };
}
