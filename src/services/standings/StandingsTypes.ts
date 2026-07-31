import type {Season} from '@/domain/season/Season';
import type {Team} from '@/models/Team';

export type TeamStanding = {
  rank: number;
  team: Team;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  winningPercentage: number;
};

export type SeasonStandings = {
  season: Season;
  entries: TeamStanding[];
};
