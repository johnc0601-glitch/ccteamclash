import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {PublicPlayerView} from '@/services/public/PublicPlayerService';
import type {PlayerStatistics} from '@/services/statistics';

export function buildPublicTeamRoster(
  launchPlayers: LaunchPlayer[],
  publicPlayers: PublicPlayerView[],
  teamId: string,
  teamName: string,
  currentSeasonName: string,
  rosterPlayerIds?: ReadonlySet<string>,
): PublicPlayerView[] {
  const publicPlayersById = new Map(publicPlayers.map((view) => [view.player.id, view]));
  const publicPlayersByName = new Map(
    publicPlayers.map((view) => [normalizeName(view.player.name), view]),
  );

  return launchPlayers
    .filter((player) => player.active && (
      rosterPlayerIds ? rosterPlayerIds.has(player.id) : player.currentTeamId === teamId
    ))
    .map((player) => {
      const existing = publicPlayersById.get(player.id)
        ?? publicPlayersByName.get(normalizeName(player.name));

      if (!existing) {
        return {
          player: {
            id: player.id,
            name: player.name,
            teamId,
            pdgaNumber: player.pdgaNumber,
            pdgaRating: player.pdgaRating,
            gender: player.gender,
            active: player.active,
            createdAt: player.createdAt,
            updatedAt: player.updatedAt,
          },
          teamName,
          currentSeasonName,
          careerStatistics: emptyPlayerStatistics(player.id, player.name),
          history: [],
        };
      }

      return {
        ...existing,
        player: {
          ...existing.player,
          name: player.name,
          teamId,
          pdgaNumber: player.pdgaNumber,
          pdgaRating: player.pdgaRating,
          gender: player.gender,
          active: player.active,
          updatedAt: player.updatedAt,
        },
        teamName,
        currentSeasonName,
      };
    })
    .sort((first, second) => first.player.name.localeCompare(second.player.name));
}

function emptyPlayerStatistics(playerId: string, playerName: string): PlayerStatistics {
  const emptyRecord = {wins: 0, losses: 0, ties: 0};

  return {
    playerId,
    playerName,
    seasonId: 'current',
    teamIds: [],
    matchesPlayed: 0,
    finalsQualified: false,
    singlesRecord: {...emptyRecord},
    doublesRecord: {...emptyRecord},
    overallRecord: {...emptyRecord},
    winPercentage: 0,
    pointsEarned: 0,
    currentStreak: '--',
  };
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}
