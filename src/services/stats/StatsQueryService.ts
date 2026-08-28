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
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const allPlayerIds = allPlayers.map((player) => player.id);
    const snapshot = activeSeason
      ? await this.statistics.getPlayerSeasonStatisticsSnapshot(allPlayerIds, activeSeason.id)
      : {statistics: [], ciMovements: new Map()};
    const statisticsByPlayer = new Map(snapshot.statistics.map((entry) => [entry.playerId, entry]));

    const players = allPlayers.filter((player) => {
      const currentStatistics = statisticsByPlayer.get(player.id);
      const hasCurrentResults = Boolean(currentStatistics?.matchesPlayed);
      if (!player.active && !hasCurrentResults) return false;
      if (teamId === 'all') return true;

      const attributedTeamIds = new Set(currentStatistics?.teamIds ?? []);
      if (player.active && player.teamId) attributedTeamIds.add(player.teamId);
      return attributedTeamIds.has(teamId);
    });

    const playerViews = players.map((player): StatsPlayerView => {
      const currentStatistics = statisticsByPlayer.get(player.id);
      const currentCiMovement = snapshot.ciMovements.get(player.id);
      const attributedTeamIds = new Set(currentStatistics?.teamIds ?? []);
      if (player.active && player.teamId) attributedTeamIds.add(player.teamId);
      const attributedTeamNames = [...attributedTeamIds]
        .map((attributedTeamId) => teamNames.get(attributedTeamId) ?? attributedTeamId);

      return {
        player,
        teamName: attributedTeamNames.length ? attributedTeamNames.join(' / ') : 'Unassigned',
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
