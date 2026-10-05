import type {Season} from '@/domain/season/Season';
import type {Team} from '@/models/Team';

export type StandingRound = {
  id: string;
  number: number;
  name: string;
  date: string | null;
};

export type TeamRoundStanding = {
  roundId: string;
  matchId: string;
  outcome: 'W' | 'L' | 'T';
  pointsFor: number;
  pointsAvailable: number;
};

export type TeamStanding = {
  rank: number;
  team: Team;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsAvailable: number;
  pointsPercentage: number;
  pointDifferential: number;
  winningPercentage: number;
  roundResults: TeamRoundStanding[];
};

export type SeasonStandings = {
  season: Season;
  entries: TeamStanding[];
  rounds: StandingRound[];
};
