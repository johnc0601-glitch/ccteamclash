import type {ResultContest} from '@/domain/results/MatchResult';

import {
  exactAutomaticStructuralPointComponents,
  STANDARD_DOUBLES_PLAYER_SLOTS,
  STANDARD_SINGLES_PLAYER_SLOTS,
  type StandardSlotProfile,
} from './StructuralScoring';
import type {StructuralPointComponents} from './TeamStrength';

export type ContestSlotAudit = {
  home: StandardSlotProfile;
  away: StandardSlotProfile;
  homeSinglesSlotsRemaining: number;
  awaySinglesSlotsRemaining: number;
  homeDoublesSlotsRemaining: number;
  awayDoublesSlotsRemaining: number;
};

/**
 * Counts the actual standard player slots represented by contest assignments.
 * This is intentionally independent of unique-player count: automatic scoring
 * is caused by missing singles/doubles slots, not merely by roster size.
 */
export function auditContestPlayerSlots(
  contests: readonly ResultContest[],
): ContestSlotAudit | undefined {
  const home = slotProfile(contests, 'Home');
  const away = slotProfile(contests, 'Away');
  if (!home || !away) return undefined;

  return {
    home,
    away,
    homeSinglesSlotsRemaining: Math.max(
      0,
      STANDARD_SINGLES_PLAYER_SLOTS - home.singlesPlayerSlotsFilled,
    ),
    awaySinglesSlotsRemaining: Math.max(
      0,
      STANDARD_SINGLES_PLAYER_SLOTS - away.singlesPlayerSlotsFilled,
    ),
    homeDoublesSlotsRemaining: Math.max(
      0,
      STANDARD_DOUBLES_PLAYER_SLOTS - home.doublesPlayerSlotsFilled,
    ),
    awayDoublesSlotsRemaining: Math.max(
      0,
      STANDARD_DOUBLES_PLAYER_SLOTS - away.doublesPlayerSlotsFilled,
    ),
  };
}

/**
 * Promotes missing contest slots to automatic points only when the caller knows
 * the contest layout is finalized. A mutable/partial Draft result is not enough:
 * treating an unfinished editor as a short-handed lineup would manufacture
 * automatic points and distort the forecast.
 */
export function exactAutomaticPointsFromFinalizedContestLayout(
  contests: readonly ResultContest[],
  layoutFinalized: boolean,
): {
  home: StructuralPointComponents;
  away: StructuralPointComponents;
} | undefined {
  if (!layoutFinalized) return undefined;

  const audit = auditContestPlayerSlots(contests);
  if (!audit) return undefined;
  const components = exactAutomaticStructuralPointComponents(
    audit.home,
    audit.away,
  );
  if (!components) return undefined;

  // StructuralScoring is team/opponent oriented. Here Home is the team and Away
  // is the opponent, so preserve that orientation explicitly.
  return {
    home: components.team,
    away: components.opponent,
  };
}

function slotProfile(
  contests: readonly ResultContest[],
  side: 'Home' | 'Away',
): StandardSlotProfile | undefined {
  let singlesPlayerSlotsFilled = 0;
  let doublesPlayerSlotsFilled = 0;

  for (const contest of contests) {
    const sidePlayers = contest.players.filter((player) => player.side === side);
    const expectedPlayers = contest.format === 'Singles' ? 1 : 2;
    if (sidePlayers.length > expectedPlayers) return undefined;

    if (contest.format === 'Singles') {
      singlesPlayerSlotsFilled += sidePlayers.length;
    } else {
      doublesPlayerSlotsFilled += sidePlayers.length;
    }
  }

  return {
    singlesPlayerSlotsFilled,
    doublesPlayerSlotsFilled,
  };
}
