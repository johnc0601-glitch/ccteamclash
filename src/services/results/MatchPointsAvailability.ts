import type {ResultContestInput, ResultContestSide} from '@/domain/results/MatchResult';

export type MatchPlayerGender = 'Male' | 'Female' | 'Unknown';

export type MatchPointsAvailability = {
  homeBasePointsAvailable: number;
  awayBasePointsAvailable: number;
  homeGenderBonusAvailable: number;
  awayGenderBonusAvailable: number;
  homePointsAvailable: number;
  awayPointsAvailable: number;
};

/**
 * Calculates the scoring opportunities represented by a loaded Clash scoreboard.
 *
 * Base availability is one point per filled player slot. A blank contributes no
 * available point to that team. Gender bonus availability is matchup-specific:
 * unmatched female players earn one bonus opportunity each only when opposed by
 * an actual male player. Unknown genders never create a bonus opportunity.
 */
export function calculateMatchPointsAvailability(
  contests: readonly ResultContestInput[],
  playerGenders: ReadonlyMap<string, MatchPlayerGender>,
): MatchPointsAvailability {
  let homeBasePointsAvailable = 0;
  let awayBasePointsAvailable = 0;
  let homeGenderBonusAvailable = 0;
  let awayGenderBonusAvailable = 0;

  for (const contest of contests) {
    const home = countSide(contest, 'Home', playerGenders);
    const away = countSide(contest, 'Away', playerGenders);

    homeBasePointsAvailable += home.filled;
    awayBasePointsAvailable += away.filled;

    homeGenderBonusAvailable += genderBonus(home, away);
    awayGenderBonusAvailable += genderBonus(away, home);
  }

  return {
    homeBasePointsAvailable,
    awayBasePointsAvailable,
    homeGenderBonusAvailable,
    awayGenderBonusAvailable,
    homePointsAvailable: homeBasePointsAvailable + homeGenderBonusAvailable,
    awayPointsAvailable: awayBasePointsAvailable + awayGenderBonusAvailable,
  };
}

export function pointsPercentage(points: number, available: number): number {
  return available > 0 ? points / available : 0;
}

function countSide(
  contest: ResultContestInput,
  side: ResultContestSide,
  playerGenders: ReadonlyMap<string, MatchPlayerGender>,
): {filled: number; female: number; male: number} {
  let filled = 0;
  let female = 0;
  let male = 0;

  for (const player of contest.players) {
    if (player.side !== side || !player.playerId.trim()) continue;
    filled += 1;
    const gender = playerGenders.get(player.playerId) ?? 'Unknown';
    if (gender === 'Female') female += 1;
    if (gender === 'Male') male += 1;
  }

  return {filled, female, male};
}

function genderBonus(
  team: {female: number},
  opponent: {female: number; male: number},
): number {
  const unmatchedFemales = Math.max(0, team.female - opponent.female);
  return Math.min(unmatchedFemales, opponent.male);
}
