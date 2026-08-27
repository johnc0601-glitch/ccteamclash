import type {SeasonService} from '@/domain/season/SeasonService';
import type {Player} from '@/models/Player';
import type {PlayerService} from '@/services/PlayerService';
import type {TeamService} from '@/services/TeamService';
import type {StatisticsEngine} from '@/services/statistics';
import type {PlayerStatistics} from '@/services/statistics';

export type StatsPlayerView = {
  player: Player;
  teamName: string;
  currentSeasonId?: string;
  currentSeasonName: string;
  currentStatistics?: PlayerStatistics;
  currentCiGain?: number;
  currentSinglesCiGain?: number;
  currentDoublesCiGain?: number;
};

export type StatsQuerySnapshot = {
  playerViews: StatsPlayerView[];
  genderByPlayerId: Map<string, Player['gender']>;
};

type PlayerProvider = Pick<PlayerService, 'getAll'>;
type TeamProvider = Pick<TeamService, 'getAll'>;
type SeasonProvider = Pick<SeasonService, 'getActive'>;
type StatisticsProvider = Pick<StatisticsEngine, 'getPlayerSeasonStatisticsSnapshot'>;

export class StatsQueryService {
  constructor(
    private readonly players: PlayerProvider,
    private readonly teams: TeamProvider,
    private readonly seasons: SeasonProvider,
    private readonly statistics: StatisticsProvider,
  ) {}

  async getSnapshot(teamId = 'all'): Promise<StatsQuerySnapshot> {
    const [allPlayers, teams, activeSeason] = await Promise.all([
      this.players.getAll({status: 'all'}),
      this.teams.getAll(),
      this.seasons.getActive(),
    ]);
    const genderByPlayerId = new Map(allPlayers.map((player) => [player.id, player.gender]));
    const players = allPlayers.filter((player) =>
      player.active && (teamId === 'all' || player.teamId === teamId));
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const playerIds = players.map((player) => player.id);
    const snapshot = activeSeason
      ? await this.statistics.getPlayerSeasonStatisticsSnapshot(playerIds, activeSeason.id)
      : {statistics: [], ciMovements: new Map()};
    const statisticsByPlayer = new Map(snapshot.statistics.map((entry) => [entry.playerId, entry]));

    const playerViews = players.map((player): StatsPlayerView => {
      const currentStatistics = statisticsByPlayer.get(player.id);
      const currentCiMovement = snapshot.ciMovements.get(player.id);
      return {
        player,
        teamName: player.teamId ? teamNames.get(player.teamId) ?? player.teamId : 'Unassigned',
        currentSeasonId: activeSeason?.id,
        currentSeasonName: activeSeason?.name ?? 'Current season',
        currentStatistics: currentStatistics?.matchesPlayed ? currentStatistics : undefined,
        currentCiGain: currentCiMovement?.ciGain,
        currentSinglesCiGain: currentCiMovement?.singlesCiGain,
        currentDoublesCiGain: currentCiMovement?.doublesCiGain,
      };
    });

    return {playerViews, genderByPlayerId};
  }

  async getAll(teamId = 'all'): Promise<StatsPlayerView[]> {
    return (await this.getSnapshot(teamId)).playerViews;
  }
}
