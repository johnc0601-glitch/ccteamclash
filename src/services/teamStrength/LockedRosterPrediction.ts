import {rosterStageChanceOfVictoryFromStrengthDifference} from './MatchPrediction';
import {calculateActiveRosterStrength, TEAM_HOME_CI_BONUS} from './TeamStrength';

export type LockedRosterPlayer = {team_id: string; player_id: string};
export type FrozenRosterRating = LockedRosterPlayer & {clash_index_before: number};

/** Replays the roster-lock forecast from official player IDs and frozen CI only.
 * Scores, outcomes, actual pairings and penalty points are deliberately absent.
 * Missing or conflicting frozen CI makes the estimate unavailable.
 */
export function calculateLockedRosterPrediction(input: {
  homeTeamId: string;
  awayTeamId: string;
  rosterPlayers: readonly LockedRosterPlayer[];
  frozenRatings: readonly FrozenRosterRating[];
  venue: 'Home' | 'Neutral';
}) {
  const strength = (teamId: string) => {
    const ids = [...new Set(input.rosterPlayers.filter((row) => row.team_id === teamId).map((row) => row.player_id))];
    if (!ids.length) return undefined;
    const ratings: number[] = [];
    for (const id of ids) {
      const values = input.frozenRatings.filter((row) => row.team_id === teamId && row.player_id === id)
        .map((row) => row.clash_index_before);
      if (!values.length || values.some((ci) => !Number.isFinite(ci) || ci <= 0 || ci !== values[0])) return undefined;
      ratings.push(values[0]);
    }
    return calculateActiveRosterStrength(ratings)?.activeRosterStrength;
  };
  if (input.homeTeamId === input.awayTeamId) return undefined;
  const homeStrength = strength(input.homeTeamId);
  const awayStrength = strength(input.awayTeamId);
  if (homeStrength == null || awayStrength == null) return undefined;
  const difference = homeStrength - awayStrength + (input.venue === 'Home' ? TEAM_HOME_CI_BONUS : 0);
  const homeChanceOfVictory = rosterStageChanceOfVictoryFromStrengthDifference(difference, 'matchLineup');
  return {homeStrength, awayStrength, homeChanceOfVictory, awayChanceOfVictory: 1 - homeChanceOfVictory};
}
