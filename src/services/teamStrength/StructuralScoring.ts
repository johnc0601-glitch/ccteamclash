import type {StructuralPointComponents} from './TeamStrength';
import {STANDARD_MATCH_PLAYER_COUNT} from './RosterStrength';

export const STANDARD_POINTS_PER_REQUIRED_PLAYER = 2;
export const WOMEN_BONUS_OPPORTUNITIES_PER_EXTRA_FEMALE = 2;

export type StructuralRosterProfile = {
  playerCount: number;
  femalePlayerCount: number;
};

export type StructuralScoringSignals = {
  teamPlayerShortfall: number;
  opponentPlayerShortfall: number;
  teamAutomaticPoints: number;
  opponentAutomaticPoints: number;
  teamExtraFemaleCount: number;
  opponentExtraFemaleCount: number;
  teamWomenBonusOpportunityCount: number;
  opponentWomenBonusOpportunityCount: number;
};

/**
 * Converts a locked/known participation structure into scoring-rule signals.
 *
 * Each required player represents one singles point and one doubles
 * player-point, so a missing player exposes two standard points to automatic
 * scoring for the opponent. This function describes scoring structure only; it
 * never changes Team Strength or Clash Index.
 *
 * Extra female participation creates two women-vs-men bonus opportunities per
 * extra female in the standard singles+doubles structure. The opportunity count
 * is NOT the same as expected bonus points: the actual bonus award remains
 * outcome-dependent and should only enter Expected Points when the triggering
 * matchups can be evaluated.
 */
export function structuralScoringSignals(
  team: StructuralRosterProfile,
  opponent: StructuralRosterProfile,
): StructuralScoringSignals | undefined {
  if (!validProfile(team) || !validProfile(opponent)) return undefined;

  const teamPlayerShortfall = Math.max(0, STANDARD_MATCH_PLAYER_COUNT - team.playerCount);
  const opponentPlayerShortfall = Math.max(0, STANDARD_MATCH_PLAYER_COUNT - opponent.playerCount);
  const teamExtraFemaleCount = Math.max(0, team.femalePlayerCount - opponent.femalePlayerCount);
  const opponentExtraFemaleCount = Math.max(0, opponent.femalePlayerCount - team.femalePlayerCount);

  return {
    teamPlayerShortfall,
    opponentPlayerShortfall,
    teamAutomaticPoints:
      opponentPlayerShortfall * STANDARD_POINTS_PER_REQUIRED_PLAYER,
    opponentAutomaticPoints:
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
 * Only deterministic automatic points are promoted into Expected Points here.
 * Women bonus opportunities stay separate until matchup-level information is
 * sufficient to estimate whether those bonus points will actually be earned.
 */
export function automaticStructuralPointComponents(
  signals: StructuralScoringSignals,
): {
  team: StructuralPointComponents;
  opponent: StructuralPointComponents;
} {
  return {
    team: {automaticPoints: signals.teamAutomaticPoints},
    opponent: {automaticPoints: signals.opponentAutomaticPoints},
  };
}

function validProfile(profile: StructuralRosterProfile): boolean {
  return Number.isInteger(profile.playerCount)
    && profile.playerCount >= 0
    && Number.isInteger(profile.femalePlayerCount)
    && profile.femalePlayerCount >= 0
    && profile.femalePlayerCount <= profile.playerCount;
}
