import type {Match, StandingEntry, Story} from '@/shared/types';
import {getLatestHistoricalTeamStandings} from '@/data/historicalSeed';
import {seedStories} from '@/data/stories';

export const stories: Story[] = seedStories;
export const teams: StandingEntry[] = getLatestHistoricalTeamStandings().map((standing) => ({
  name: standing.teamName,
  record: standing.record.ties
    ? `${standing.record.wins}-${standing.record.losses}-${standing.record.ties}`
    : `${standing.record.wins}-${standing.record.losses}`,
  diff: `${standing.pointsPercentage.toFixed(1)}%`,
}));
export const matches: Match[] = [
  {date: 'Saturday, July 18', time: '9:00 AM', course: 'Castle Hayne Disc Golf Course', home: 'Riptide', away: 'KB'},
  {date: 'Saturday, July 18', time: '9:00 AM', course: 'Arrowhead Park', home: 'Beast Mode', away: 'Dark Knights'},
  {date: 'Saturday, July 18', time: '9:00 AM', course: 'Joe Eakes Park', home: "Hayneous OG's", away: 'Ninjas'},
  {date: 'Saturday, July 18', time: '9:00 AM', course: 'Veterans Park', home: 'Cougar Country', away: 'Wild Turkey'},
]
