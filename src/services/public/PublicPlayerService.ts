import type {SeasonService} from '@/domain/season/SeasonService';
import {getHistoricalPlayerSeedSummary} from '@/data/historicalSeed';
import type {HistoricalPlayerSeedSummary} from '@/data/historicalSeed';
import {HISTORICAL_2024_25_PLAYOFF_ADJUSTMENTS} from '@/data/historicalPlayoffAdjustments';
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
  currentSeasonId?: string;
  currentSeasonName: string;
  currentStatistics?: PlayerStatistics;
  currentCiGain?: number;
  careerStatistics: PlayerStatistics;
  history: PublicPlayerHistory[];
};

type PlayerProvider = Pick<PlayerService, 'getAll'>;
type TeamProvider = Pick<TeamService, 'getAll'>;
type SeasonProvider = Pick<SeasonService, 'getAll' | 'getActive'>;
type StatisticsProvider = Pick<
  StatisticsEngine,
  | 'getPlayerStatisticsForPlayers'
  | 'getPlayerCareerStatistics'
  | 'getPlayerCareerStatisticsForPlayers'
  | 'getPlayerCiMovementsForPlayers'
  | 'getPlayerMatchHistory'
  | 'getPlayerMatchHistoriesForPlayers'
>;
type CompleteHistoryProvider = {
  getCompleteHistory(playerId: string): Promise<PlayerMatchHistoryEntry[]>;
};

export class PublicPlayerService {
  private readonly players: PlayerProvider;
  private readonly teams: TeamProvider;
  private readonly seasons: SeasonProvider;
  private readonly statistics: StatisticsProvider;
  private readonly completeHistory?: CompleteHistoryProvider;

  constructor(
    players: PlayerProvider,
    teams: TeamProvider,
    seasons: SeasonProvider,
    statistics: StatisticsProvider,
    completeHistory?: CompleteHistoryProvider,
  ) {
    this.players = players;
    this.teams = teams;
    this.seasons = seasons;
    this.statistics = statistics;
    this.completeHistory = completeHistory;
  }

  async getAll(teamId = 'all'): Promise<PublicPlayerView[]> {
    const [players, teams, seasons, activeSeason] = await Promise.all([
      this.players.getAll({status: 'active', teamId}),
      this.teams.getAll(),
      this.seasons.getAll(),
      this.seasons.getActive(),
    ]);
    const playerIds = players.map((player) => player.id);
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const seasonNames = new Map(seasons.map((season) => [season.id, season.name]));
    const [currentStatistics, currentCiMovements] = activeSeason
      ? await Promise.all([
        this.statistics.getPlayerStatisticsForPlayers(playerIds, activeSeason.id),
        this.statistics.getPlayerCiMovementsForPlayers(playerIds, activeSeason.id),
      ])
      : [[], new Map()];
    const currentStatisticsByPlayer = new Map(
      currentStatistics.map((entry) => [entry.playerId, entry]),
    );
    const latestHistoryByPlayer = await this.statistics.getPlayerMatchHistoriesForPlayers(
      playerIds,
      3,
      activeSeason?.id,
    );
    const careerStatistics = await this.statistics.getPlayerCareerStatisticsForPlayers(playerIds);
    const careerStatisticsByPlayer = new Map(careerStatistics.map((entry) => [entry.playerId, entry]));

    return players.map((player) => {
      const playerCareerStatistics = careerStatisticsByPlayer.get(player.id)!;
      const history = latestHistoryByPlayer.get(player.id) ?? [];
      const historicalStatistics = with2024Playoffs(getHistoricalPlayerSeedSummary(player.id), player.id);
      const activeStatistics = currentStatisticsByPlayer.get(player.id);
      const currentStatistics = activeStatistics?.matchesPlayed ? activeStatistics : undefined;

      return {
        player,
        teamName: player.teamId ? teamNames.get(player.teamId) ?? player.teamId : 'Unassigned',
        currentSeasonId: activeSeason?.id,
        currentSeasonName: activeSeason?.name ?? 'Current season',
        currentStatistics,
        currentCiGain: currentCiMovements.get(player.id)?.ciGain,
        careerStatistics: historicalStatistics
          ? {
            playerId: player.id,
            playerName: player.name,
            seasonId: 'historical',
            teamIds: [],
            matchesPlayed: historicalStatistics.matchesPlayed,
            finalsQualified: false,
            singlesRecord: historicalStatistics.singlesRecord,
            doublesRecord: historicalStatistics.doublesRecord,
            overallRecord: historicalStatistics.overallRecord,
            winPercentage: historicalStatistics.winPercentage,
            pointsEarned: historicalStatistics.overallRecord.wins + historicalStatistics.overallRecord.ties * 0.5,
            currentStreak: '--',
          }
          : playerCareerStatistics,
        history: history.map((entry) => ({
          ...entry,
          opponentTeamName: teamNames.get(entry.opponentTeamId) ?? entry.opponentTeamId,
          seasonName: seasonNames.get(entry.seasonId) ?? entry.seasonId,
        })),
      };
    });
  }

  async getHistory(playerId: string): Promise<PublicPlayerHistory[]> {
    const [history, teams, seasons] = await Promise.all([
      this.completeHistory
        ? this.completeHistory.getCompleteHistory(playerId)
        : this.statistics.getPlayerMatchHistory(playerId),
      this.teams.getAll(),
      this.seasons.getAll(),
    ]);
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const seasonNames = new Map(seasons.map((season) => [season.id, season.name]));
    return history.map((entry) => ({
      ...entry,
      opponentTeamName: teamNames.get(entry.opponentTeamId) ?? entry.opponentTeamId,
      seasonName: seasonNames.get(entry.seasonId) ?? entry.seasonId,
    }));
  }
}

function with2024Playoffs(
  summary: HistoricalPlayerSeedSummary | undefined,
  playerId: string,
): HistoricalPlayerSeedSummary | undefined {
  if (!summary) return summary;
  const adjustment = HISTORICAL_2024_25_PLAYOFF_ADJUSTMENTS[playerId];
  if (!adjustment) return summary;

  const singlesRecord = {
    wins: summary.singlesRecord.wins + adjustment.singles.wins,
    losses: summary.singlesRecord.losses + adjustment.singles.losses,
    ties: summary.singlesRecord.ties + adjustment.singles.ties,
  };
  const doublesRecord = {
    wins: summary.doublesRecord.wins + adjustment.doubles.wins,
    losses: summary.doublesRecord.losses + adjustment.doubles.losses,
    ties: summary.doublesRecord.ties + adjustment.doubles.ties,
  };
  const overallRecord = {
    wins: singlesRecord.wins + doublesRecord.wins,
    losses: singlesRecord.losses + doublesRecord.losses,
    ties: singlesRecord.ties + doublesRecord.ties,
  };
  const matchesPlayed = overallRecord.wins + overallRecord.losses + overallRecord.ties;

  return {
    ...summary,
    matchesPlayed,
    singlesRecord,
    doublesRecord,
    overallRecord,
    winPercentage: matchesPlayed
      ? ((overallRecord.wins + overallRecord.ties * 0.5) / matchesPlayed) * 100
      : 0,
  };
}
