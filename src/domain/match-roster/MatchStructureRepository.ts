import type {LockedMatchStructure, MatchStructureSide} from './MatchStructureLock';

export type MatchStructureSlotRecord = {
  format: 'Singles' | 'Doubles';
  position: number;
  side: MatchStructureSide;
  player_slot: 1 | 2;
  player_id: string | null;
};

export interface MatchStructureRepository {
  getLocked(matchId: string): Promise<LockedMatchStructure | undefined>;
  saveLocked(structure: LockedMatchStructure): Promise<void>;
}

/**
 * Flattens the immutable domain structure to the exact 72-slot database/RPC
 * payload. Null player ids are retained because they carry structural meaning.
 */
export function toMatchStructureSlotRecords(
  structure: LockedMatchStructure,
): MatchStructureSlotRecord[] {
  const records: MatchStructureSlotRecord[] = [];

  for (const slot of structure.singles) {
    records.push(
      {
        format: 'Singles',
        position: slot.position,
        side: 'Home',
        player_slot: 1,
        player_id: slot.homePlayerId,
      },
      {
        format: 'Singles',
        position: slot.position,
        side: 'Away',
        player_slot: 1,
        player_id: slot.awayPlayerId,
      },
    );
  }

  for (const slot of structure.doubles) {
    for (const side of ['Home', 'Away'] as const) {
      const players = side === 'Home' ? slot.homePlayerIds : slot.awayPlayerIds;
      records.push(
        {
          format: 'Doubles',
          position: slot.position,
          side,
          player_slot: 1,
          player_id: players[0],
        },
        {
          format: 'Doubles',
          position: slot.position,
          side,
          player_slot: 2,
          player_id: players[1],
        },
      );
    }
  }

  return records;
}
