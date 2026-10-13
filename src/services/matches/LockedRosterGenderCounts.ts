import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

export function lockedRosterGenderCounts(
  official: Pick<OfficialMatchRoster, 'players'>,
  genders: ReadonlyMap<string, LaunchPlayer['gender']>,
): {maleCount: number | null; femaleCount: number | null} {
  let maleCount = 0;
  let femaleCount = 0;
  for (const player of official.players) {
    const gender = genders.get(player.playerId);
    // Missing player data must not look like a confirmed zero.
    if (gender !== 'Male' && gender !== 'Female') return {maleCount: null, femaleCount: null};
    if (gender === 'Male') maleCount += 1;
    else femaleCount += 1;
  }
  return {maleCount, femaleCount};
}
