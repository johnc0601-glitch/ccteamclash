import {rosterStageChanceOfVictoryFromStrengthDifference} from './MatchPrediction';
import {calculateActiveRosterStrength, expectedTeamPointShare, STANDARD_MATCH_POINTS, TEAM_HOME_CI_BONUS} from './TeamStrength';

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
  // Historical result publication sometimes appended a player to the opposing
  // roster. Only resolve a duplicated ID when its immutable freeze identifies
  // exactly one team; never borrow that player's CI for the opposing team.
  const rosterPlayers = input.rosterPlayers.filter((row) => {
    const teams = new Set(input.rosterPlayers.filter((player) => player.player_id === row.player_id)
      .map((player) => player.team_id));
    if (teams.size < 2) return true;
    const frozenTeams = new Set(input.frozenRatings.filter((rating) => rating.player_id === row.player_id)
      .map((rating) => rating.team_id));
    return frozenTeams.size !== 1 || frozenTeams.has(row.team_id);
  });
  const homeIds = new Set(rosterPlayers.filter((row) => row.team_id === input.homeTeamId).map((row) => row.player_id));
  if (rosterPlayers.some((row) => row.team_id === input.awayTeamId && homeIds.has(row.player_id))) return undefined;
  const strength = (teamId: string) => {
    const ids = [...new Set(rosterPlayers.filter((row) => row.team_id === teamId).map((row) => row.player_id))];
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
  const homeExpectedScore = expectedTeamPointShare(homeStrength, awayStrength, input.venue) * STANDARD_MATCH_POINTS;
  return {
    homeStrength, awayStrength, homeChanceOfVictory, awayChanceOfVictory: 1 - homeChanceOfVictory,
    homeExpectedScore, awayExpectedScore: STANDARD_MATCH_POINTS - homeExpectedScore,
    expectedMargin: 2 * homeExpectedScore - STANDARD_MATCH_POINTS,
  };
}
