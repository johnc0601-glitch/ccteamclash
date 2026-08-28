import type {StructuralPointComponents} from './TeamStrength';
import {STANDARD_MATCH_PLAYER_COUNT} from './RosterStrength';

export const STANDARD_POINTS_PER_REQUIRED_PLAYER = 2;
export const STANDARD_SINGLES_PLAYER_SLOTS = 18;
export const STANDARD_DOUBLES_PLAYER_SLOTS = 18;
export const WOMEN_BONUS_OPPORTUNITIES_PER_EXTRA_FEMALE = 2;

export type StructuralRosterProfile = {
  playerCount: number;
  femalePlayerCount: number;
};

export type StructuralScoringSignals = {
  teamPlayerShortfall: number;
  opponentPlayerShortfall: number;
  /** Guaranteed lower bound from roster count alone, not the final slot audit. */
  teamMinimumAutomaticPoints: number;
  opponentMinimumAutomaticPoints: number;
  teamExtraFemaleCount: number;
  opponentExtraFemaleCount: number;
  teamWomenBonusOpportunityCount: number;
  opponentWomenBonusOpportunityCount: number;
};

export type StandardSlotProfile = {
  singlesPlayerSlotsFilled: number;
  doublesPlayerSlotsFilled: number;
};

/**
 * Converts a known player pool into structural-scoring signals.
 *
 * Fewer than 18 unique players guarantees missing standard capacity because a
 * player can fill at most one singles slot and one doubles player-slot. Thus a
 * one-player shortfall guarantees at least two automatic points for the
 * opponent. The roster count is only a LOWER BOUND: a team with 18+ unique
 * players can still leave a singles or doubles slot unfilled if not everyone is
 * used in both formats.
 *
 * Extra female participation exposes two likely women-vs-men bonus
 * opportunities per extra female in the normal singles+doubles structure. The
 * opportunity count is not the same as expected or awarded bonus points.
 */
export function structuralScoringSignals(
  team: StructuralRosterProfile,
  opponent: StructuralRosterProfile,
): StructuralScoringSignals | undefined {
  if (!validRosterProfile(team) || !validRosterProfile(opponent)) return undefined;

  const teamPlayerShortfall = Math.max(0, STANDARD_MATCH_PLAYER_COUNT - team.playerCount);
  const opponentPlayerShortfall = Math.max(0, STANDARD_MATCH_PLAYER_COUNT - opponent.playerCount);
  const teamExtraFemaleCount = Math.max(0, team.femalePlayerCount - opponent.femalePlayerCount);
  const opponentExtraFemaleCount = Math.max(0, opponent.femalePlayerCount - team.femalePlayerCount);

  return {
    teamPlayerShortfall,
    opponentPlayerShortfall,
    teamMinimumAutomaticPoints:
      opponentPlayerShortfall * STANDARD_POINTS_PER_REQUIRED_PLAYER,
    opponentMinimumAutomaticPoints:
      teamPlayerShortfall * STANDARD_POINTS_PER_REQUIRED_PLAYER,
    teamExtraFemaleCount,
    opponentExtraFemaleCount,
    teamWomenBonusOpportunityCount:
      teamExtraFemaleCount * WOMEN_BONUS_OPPORTUNITIES_PER_EXTRA_FEMALE,
    opponentWomenBonusOpportunityCount:
      opponentExtraFemaleCount * WOMEN_BONUS_OPPORTUNITIES_PER_EXTRA_FEMALE,
  };
}

/**
 * Exact automatic points caused by missing standard singles/doubles slots.
 * Use this only once actual format-slot assignments are known. It is more
 * precise than inferring points from unique player count.
 */
export function automaticPointsAwardedToOpponentFromSlots(
  teamSlots: StandardSlotProfile,
): number | undefined {
  if (!validSlotProfile(teamSlots)) return undefined;

  return Math.max(0, STANDARD_SINGLES_PLAYER_SLOTS - teamSlots.singlesPlayerSlotsFilled)
    + Math.max(0, STANDARD_DOUBLES_PLAYER_SLOTS - teamSlots.doublesPlayerSlotsFilled);
}

/**
 * Promotes only exact slot-derived automatic points into the Expected Points
 * model. Women bonus opportunities remain separate until matchup-level CI can
 * estimate how often the bonus is actually earned.
 */
export function exactAutomaticStructuralPointComponents(
  teamSlots: StandardSlotProfile,
  opponentSlots: StandardSlotProfile,
): {
  team: StructuralPointComponents;
  opponent: StructuralPointComponents;
} | undefined {
  const pointsAwardedToOpponent = automaticPointsAwardedToOpponentFromSlots(teamSlots);
  const pointsAwardedToTeam = automaticPointsAwardedToOpponentFromSlots(opponentSlots);
  if (pointsAwardedToTeam == null || pointsAwardedToOpponent == null) return undefined;

  return {
    team: {automaticPoints: pointsAwardedToTeam},
    opponent: {automaticPoints: pointsAwardedToOpponent},
  };
}

function validRosterProfile(profile: StructuralRosterProfile): boolean {
  return Number.isInteger(profile.playerCount)
    && profile.playerCount >= 0
    && Number.isInteger(profile.femalePlayerCount)
    && profile.femalePlayerCount >= 0
    && profile.femalePlayerCount <= profile.playerCount;
}

function validSlotProfile(profile: StandardSlotProfile): boolean {
  return Number.isInteger(profile.singlesPlayerSlotsFilled)
    && profile.singlesPlayerSlotsFilled >= 0
    && Number.isInteger(profile.doublesPlayerSlotsFilled)
    && profile.doublesPlayerSlotsFilled >= 0;
}
