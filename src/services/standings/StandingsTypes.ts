import type {Team} from '@/models/Team';
import type {TeamQuery} from '@/types/team';
import type {TeamStatistics} from '@/services/statistics';

export type StandingEntry = {
  rank: number;
  team: Team;
  statistics: TeamStatistics;
};

export interface StandingsTeamProvider {
  getAll(query?: Partial<TeamQuery>): Promise<Team[]>;
}

export interface StandingsStatisticsProvider {
  getTeamStatistics(teamId: string, seasonId: string): Promise<TeamStatistics>;
}
