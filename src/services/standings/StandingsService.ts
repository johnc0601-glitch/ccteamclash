import type {ResultsService} from '@/domain/results/ResultsService';
import type {ScheduleService} from '@/domain/schedule/ScheduleService';
import type {SeasonService} from '@/domain/season/SeasonService';
import type {TeamService} from '@/services/TeamService';
import type {SeasonStandings, TeamStanding} from '@/services/standings/StandingsTypes';

type MutableStanding = Omit<TeamStanding, 'rank' | 'pointDifferential' | 'winningPercentage'>;

export class StandingsService {
  constructor(
    private readonly teams: TeamService,
    private readonly results: ResultsService,
    private readonly schedules: ScheduleService,
    private readonly seasons: SeasonService,
  ) {}

  async getActiveSeasonStandings(): Promise<SeasonStandings | undefined> {
    const season = await this.seasons.getActive();
    if (!season) return undefined;
    return {season, entries: await this.getSeasonStandings(season.id)};
  }

  async getSeasonStandings(seasonId: string): Promise<TeamStanding[]> {
    const [teams, publishedResults] = await Promise.all([
      this.teams.getAll({status: 'active'}),
      this.results.getPublishedResults(),
    ]);
    const entries = new Map<string, MutableStanding>(teams.map((team) => [
      team.id,
      {
        team,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ]));

    const resolved = await Promise.all(publishedResults.map(async (result) => ({
      result,
      match: await this.schedules.getMatch(result.matchId),
    })));
    for (const {result, match} of resolved) {
      if (!match || match.seasonId !== seasonId
        || !match.homeTeamId || !match.awayTeamId
        || result.homeScore === null || result.awayScore === null) continue;
      const home = entries.get(match.homeTeamId);
      const away = entries.get(match.awayTeamId);
      if (!home || !away) continue;

      home.gamesPlayed += 1;
      away.gamesPlayed += 1;
      home.pointsFor += result.homeScore;
      home.pointsAgainst += result.awayScore;
      away.pointsFor += result.awayScore;
      away.pointsAgainst += result.homeScore;
      if (result.homeScore > result.awayScore) {
        home.wins += 1;
        away.losses += 1;
      } else if (result.awayScore > result.homeScore) {
        away.wins += 1;
        home.losses += 1;
      }
    }

    return [...entries.values()]
      .map((entry): Omit<TeamStanding, 'rank'> => ({
        ...entry,
        pointDifferential: entry.pointsFor - entry.pointsAgainst,
        winningPercentage: entry.gamesPlayed ? entry.wins / entry.gamesPlayed : 0,
      }))
      .sort((left, right) =>
        right.winningPercentage - left.winningPercentage
        || right.pointDifferential - left.pointDifferential
        || right.pointsFor - left.pointsFor
        || left.team.name.localeCompare(right.team.name, undefined, {sensitivity: 'base'})
        || left.team.id.localeCompare(right.team.id),
      )
      .map((entry, index) => ({...entry, rank: index + 1}));
  }

  async getTeamStanding(teamId: string, seasonId: string): Promise<TeamStanding | undefined> {
    return (await this.getSeasonStandings(seasonId))
      .find((entry) => entry.team.id === teamId);
  }
}
