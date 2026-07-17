import type {
  StandingEntry,
  StandingsStatisticsProvider,
  StandingsTeamProvider,
} from '@/services/standings/StandingsTypes';
import type {TeamStatistics} from '@/services/statistics';

function compareStatistics(left: TeamStatistics, right: TeamStatistics): number {
  return right.record.wins - left.record.wins
    || right.pointsPercentage - left.pointsPercentage
    || right.pointDifferential - left.pointDifferential
    || right.pointsFor - left.pointsFor;
}

export class StandingsService {
  private readonly teams: StandingsTeamProvider;
  private readonly statistics: StandingsStatisticsProvider;

  constructor(
    teams: StandingsTeamProvider,
    statistics: StandingsStatisticsProvider,
  ) {
    this.teams = teams;
    this.statistics = statistics;
  }

  async getSeasonStandings(seasonId: string): Promise<StandingEntry[]> {
    const teams = await this.teams.getAll({status: 'active'});
    const entries = await Promise.all(teams.map(async (team) => ({
      team,
      statistics: await this.statistics.getTeamStatistics(team.id, seasonId),
    })));

    return entries
      .sort((left, right) =>
        compareStatistics(left.statistics, right.statistics)
        || left.team.name.localeCompare(right.team.name, undefined, {sensitivity: 'base'}),
      )
      .map((entry, index) => ({...entry, rank: index + 1}));
  }

  async getTeamStanding(teamId: string, seasonId: string): Promise<StandingEntry | undefined> {
    const standings = await this.getSeasonStandings(seasonId);
    return standings.find((entry) => entry.team.id === teamId);
  }
}
