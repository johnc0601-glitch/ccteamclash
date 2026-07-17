import type {SeasonService} from '@/domain/season/SeasonService';
import type {Player} from '@/models/Player';
import type {PlayerService} from '@/services/PlayerService';
import type {TeamService} from '@/services/TeamService';
import type {StatisticsEngine} from '@/services/statistics';
import type {PlayerMatchHistoryEntry, PlayerStatistics} from '@/services/statistics';

export type PublicPlayerHistory = PlayerMatchHistoryEntry & {
  opponentTeamName: string;
  seasonName: string;
};

export type PublicPlayerView = {
  player: Player;
  teamName: string;
  currentSeasonName: string;
  currentStatistics?: PlayerStatistics;
  careerStatistics: PlayerStatistics;
  history: PublicPlayerHistory[];
};

type PlayerProvider = Pick<PlayerService, 'getAll'>;
type TeamProvider = Pick<TeamService, 'getAll'>;
type SeasonProvider = Pick<SeasonService, 'getAll' | 'getActive'>;
type StatisticsProvider = Pick<
  StatisticsEngine,
  'getPlayerStatisticsForPlayers' | 'getPlayerCareerStatistics' | 'getPlayerMatchHistory'
>;

export class PublicPlayerService {
  private readonly players: PlayerProvider;
  private readonly teams: TeamProvider;
  private readonly seasons: SeasonProvider;
  private readonly statistics: StatisticsProvider;

  constructor(
    players: PlayerProvider,
    teams: TeamProvider,
    seasons: SeasonProvider,
    statistics: StatisticsProvider,
  ) {
    this.players = players;
    this.teams = teams;
    this.seasons = seasons;
    this.statistics = statistics;
  }

  async getAll(teamId = 'all'): Promise<PublicPlayerView[]> {
    const [players, teams, seasons, activeSeason] = await Promise.all([
      this.players.getAll({status: 'active', teamId}),
      this.teams.getAll(),
      this.seasons.getAll(),
      this.seasons.getActive(),
    ]);
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const seasonNames = new Map(seasons.map((season) => [season.id, season.name]));
    const currentStatistics = activeSeason
      ? await this.statistics.getPlayerStatisticsForPlayers(
        players.map((player) => player.id),
        activeSeason.id,
      )
      : [];
    const currentStatisticsByPlayer = new Map(
      currentStatistics.map((entry) => [entry.playerId, entry]),
    );

    return Promise.all(players.map(async (player) => {
      const [careerStatistics, history] = await Promise.all([
        this.statistics.getPlayerCareerStatistics(player.id),
        this.statistics.getPlayerMatchHistory(player.id),
      ]);

      return {
        player,
        teamName: teamNames.get(player.teamId) ?? player.teamId,
        currentSeasonName: activeSeason?.name ?? 'Current season',
        currentStatistics: currentStatisticsByPlayer.get(player.id),
        careerStatistics,
        history: history.map((entry) => ({
          ...entry,
          opponentTeamName: teamNames.get(entry.opponentTeamId) ?? entry.opponentTeamId,
          seasonName: seasonNames.get(entry.seasonId) ?? entry.seasonId,
        })),
      };
    }));
  }
}
