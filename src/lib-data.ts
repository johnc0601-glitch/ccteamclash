import type {Match, StandingEntry, Story} from '@/shared/types';
import {getLatestHistoricalTeamStandings} from '@/data/historicalSeed';
import {TEAM_MOCK_DATA} from '@/data/teams';
import {seedStories} from '@/data/stories';

export const stories: Story[] = seedStories;
export const teams: StandingEntry[] = getLatestHistoricalTeamStandings().map((standing) => ({
  name: standing.teamName,
  record: standing.record.ties
    ? `${standing.record.wins}-${standing.record.losses}-${standing.record.ties}`
    : `${standing.record.wins}-${standing.record.losses}`,
  diff: `${standing.pointsPercentage.toFixed(1)}%`,
}));
const CURRENT_MATCHUPS = [
  {date: 'Saturday, July 18', time: '9:00 AM', home: 'Riptide', away: 'KB'},
  {date: 'Saturday, July 18', time: '9:00 AM', home: 'Beast Mode', away: 'Dark Knights'},
  {date: 'Saturday, July 18', time: '9:00 AM', home: "Hayneous OG's", away: 'Ninjas'},
  {date: 'Saturday, July 18', time: '9:00 AM', home: 'Cougar Country', away: 'Wild Turkey'},
] as const;

const currentCourseByTeam = new Map(
  TEAM_MOCK_DATA.map((team) => [team.name, team.homeCourse]),
);

export const matches: Match[] = CURRENT_MATCHUPS.map((matchup) => ({
  ...matchup,
  course: currentCourseByTeam.get(matchup.home) ?? '',
}));
