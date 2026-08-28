import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

export const MATCH_STRUCTURE_SINGLES_COUNT = 18;
export const MATCH_STRUCTURE_DOUBLES_COUNT = 9;

export type MatchStructureSide = 'Home' | 'Away';

export type MatchStructureSinglesSlot = {
  position: number;
  homePlayerId: string | null;
  awayPlayerId: string | null;
};

export type MatchStructureDoublesSlot = {
  position: number;
  homePlayerIds: readonly [string | null, string | null];
  awayPlayerIds: readonly [string | null, string | null];
};

export type LockedMatchStructure = {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: 'Locked';
  singles: MatchStructureSinglesSlot[];
  doubles: MatchStructureDoublesSlot[];
  lockedBy: string;
  lockedAt: string;
};

export type MatchStructureValidationResult =
  | {ok: true; data: LockedMatchStructure}
  | {ok: false; errors: string[]};

export type MatchStructureSlotCounts = {
  singlesPlayerSlotsFilled: number;
  doublesPlayerSlotsFilled: number;
};

/**
 * Validates and freezes the actual pre-match format structure.
 *
 * The official roster snapshot answers "who may play". This lock answers
 * "where are they playing". Empty slots are legal and intentional because they
 * are the authoritative input for automatic structural points. A doubles side
 * is either a complete two-player pair or empty; one-player doubles teams are
 * not a valid locked structure.
 */
export function buildLockedMatchStructure(input: {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  singles?: readonly MatchStructureSinglesSlot[];
  doubles?: readonly MatchStructureDoublesSlot[];
  officialRosters: readonly OfficialMatchRoster[];
  lockedBy: string;
  lockedAt?: string;
}): MatchStructureValidationResult {
  const errors: string[] = [];
  const matchId = input.matchId.trim();
  const homeTeamId = input.homeTeamId.trim();
  const awayTeamId = input.awayTeamId.trim();
  const lockedBy = input.lockedBy.trim();
  const lockedAt = input.lockedAt ?? new Date().toISOString();

  if (!matchId) errors.push('Match id is required.');
  if (!homeTeamId || !awayTeamId) errors.push('Both scheduled teams are required.');
  if (homeTeamId && homeTeamId === awayTeamId) errors.push('Home and away teams must differ.');
  if (!lockedBy) errors.push('A lock actor is required.');
  if (!Number.isFinite(Date.parse(lockedAt))) errors.push('Lock timestamp is invalid.');

  const homeRoster = input.officialRosters.find(
    (roster) => roster.matchId === matchId && roster.teamId === homeTeamId,
  );
  const awayRoster = input.officialRosters.find(
    (roster) => roster.matchId === matchId && roster.teamId === awayTeamId,
  );

  if (!homeRoster) errors.push('Official home roster is unavailable.');
  if (!awayRoster) errors.push('Official away roster is unavailable.');
  if (homeRoster?.needsCommissionerReview) {
    errors.push('Official home roster requires commissioner review before structure lock.');
  }
  if (awayRoster?.needsCommissionerReview) {
    errors.push('Official away roster requires commissioner review before structure lock.');
  }

  const singles = normalizeSingles(input.singles ?? [], errors);
  const doubles = normalizeDoubles(input.doubles ?? [], errors);

  if (homeRoster && awayRoster) {
    validateAssignments(
      singles,
      doubles,
      new Set(homeRoster.players.map((player) => player.playerId)),
      new Set(awayRoster.players.map((player) => player.playerId)),
      errors,
    );
  }

  if (errors.length) return {ok: false, errors};

  return {
    ok: true,
    data: {
      matchId,
      homeTeamId,
      awayTeamId,
      status: 'Locked',
      singles,
      doubles,
      lockedBy,
      lockedAt,
    },
  };
}

/** Exact format-slot counts for structural scoring. */
export function matchStructureSlotCounts(
  structure: LockedMatchStructure,
  side: MatchStructureSide,
): MatchStructureSlotCounts {
  const singlesPlayerSlotsFilled = structure.singles.reduce(
    (count, slot) => count + (playerForSinglesSide(slot, side) ? 1 : 0),
    0,
  );
  const doublesPlayerSlotsFilled = structure.doubles.reduce(
    (count, slot) =>
      count + playersForDoublesSide(slot, side).filter((playerId) => Boolean(playerId)).length,
    0,
  );

  return {singlesPlayerSlotsFilled, doublesPlayerSlotsFilled};
}

function normalizeSingles(
  slots: readonly MatchStructureSinglesSlot[],
  errors: string[],
): MatchStructureSinglesSlot[] {
  const byPosition = new Map<number, MatchStructureSinglesSlot>();

  for (const slot of slots) {
    if (!Number.isInteger(slot.position) || slot.position < 1 || slot.position > MATCH_STRUCTURE_SINGLES_COUNT) {
      errors.push(`Singles position ${slot.position} is outside 1-${MATCH_STRUCTURE_SINGLES_COUNT}.`);
      continue;
    }
    if (byPosition.has(slot.position)) {
      errors.push(`Singles position ${slot.position} is duplicated.`);
      continue;
    }
    byPosition.set(slot.position, {
      position: slot.position,
      homePlayerId: cleanPlayerId(slot.homePlayerId),
      awayPlayerId: cleanPlayerId(slot.awayPlayerId),
    });
  }

  return Array.from({length: MATCH_STRUCTURE_SINGLES_COUNT}, (_, index) => {
    const position = index + 1;
    return byPosition.get(position) ?? {
      position,
      homePlayerId: null,
      awayPlayerId: null,
    };
  });
}

function normalizeDoubles(
  slots: readonly MatchStructureDoublesSlot[],
  errors: string[],
): MatchStructureDoublesSlot[] {
  const byPosition = new Map<number, MatchStructureDoublesSlot>();

  for (const slot of slots) {
    if (!Number.isInteger(slot.position) || slot.position < 1 || slot.position > MATCH_STRUCTURE_DOUBLES_COUNT) {
      errors.push(`Doubles position ${slot.position} is outside 1-${MATCH_STRUCTURE_DOUBLES_COUNT}.`);
      continue;
    }
    if (byPosition.has(slot.position)) {
      errors.push(`Doubles position ${slot.position} is duplicated.`);
      continue;
    }
    byPosition.set(slot.position, {
      position: slot.position,
      homePlayerIds: [cleanPlayerId(slot.homePlayerIds[0]), cleanPlayerId(slot.homePlayerIds[1])],
      awayPlayerIds: [cleanPlayerId(slot.awayPlayerIds[0]), cleanPlayerId(slot.awayPlayerIds[1])],
    });
  }

  return Array.from({length: MATCH_STRUCTURE_DOUBLES_COUNT}, (_, index) => {
    const position = index + 1;
    return byPosition.get(position) ?? {
      position,
      homePlayerIds: [null, null] as const,
      awayPlayerIds: [null, null] as const,
    };
  });
}

function validateAssignments(
  singles: readonly MatchStructureSinglesSlot[],
  doubles: readonly MatchStructureDoublesSlot[],
  homeRosterPlayerIds: ReadonlySet<string>,
  awayRosterPlayerIds: ReadonlySet<string>,
  errors: string[],
): void {
  for (const side of ['Home', 'Away'] as const) {
    const rosterPlayerIds = side === 'Home' ? homeRosterPlayerIds : awayRosterPlayerIds;
    const singlesSeen = new Set<string>();
    const doublesSeen = new Set<string>();

    for (const slot of singles) {
      const playerId = playerForSinglesSide(slot, side);
      validatePlayer(playerId, rosterPlayerIds, singlesSeen, `${side} singles`, errors);
    }

    for (const slot of doubles) {
      const pair = playersForDoublesSide(slot, side);
      const filled = pair.filter((playerId) => Boolean(playerId)).length;
      if (filled === 1) {
        errors.push(`${side} doubles position ${slot.position} must contain two players or be empty.`);
      }
      for (const playerId of pair) {
        validatePlayer(playerId, rosterPlayerIds, doublesSeen, `${side} doubles`, errors);
      }
    }
  }
}

function validatePlayer(
  playerId: string | null,
  rosterPlayerIds: ReadonlySet<string>,
  seen: Set<string>,
  context: string,
  errors: string[],
): void {
  if (!playerId) return;
  if (!rosterPlayerIds.has(playerId)) {
    errors.push(`${context} player ${playerId} is not on the official roster.`);
    return;
  }
  if (seen.has(playerId)) {
    errors.push(`${context} player ${playerId} is assigned more than once.`);
    return;
  }
  seen.add(playerId);
}

function playerForSinglesSide(
  slot: MatchStructureSinglesSlot,
  side: MatchStructureSide,
): string | null {
  return side === 'Home' ? slot.homePlayerId : slot.awayPlayerId;
}

function playersForDoublesSide(
  slot: MatchStructureDoublesSlot,
  side: MatchStructureSide,
): readonly [string | null, string | null] {
  return side === 'Home' ? slot.homePlayerIds : slot.awayPlayerIds;
}

function cleanPlayerId(playerId: string | null | undefined): string | null {
  const cleaned = playerId?.trim() ?? '';
  return cleaned || null;
}
