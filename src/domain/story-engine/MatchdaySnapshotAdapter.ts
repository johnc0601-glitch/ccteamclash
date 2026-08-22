import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import type {ClashIndexSource} from './ClashIndexSource';
import {buildMatchRatingSnapshots, type MatchRatingSnapshot, type MatchSnapshotPlayer} from './MatchRatingSnapshot';

/**
 * Matchday already owns the official roster. This adapter is the only place
 * that translates its player CI fields into immutable rating snapshot input.
 */
export function buildMatchdayRatingSnapshots(
  matchday: Pick<PublicMatchday, 'id' | 'homeTeam' | 'awayTeam'>,
  capturedAt = new Date().toISOString(),
): MatchRatingSnapshot[] {
  const players: MatchSnapshotPlayer[] = [
    ...matchday.homeTeam.roster.map((player) => toSnapshotPlayer(player, matchday.homeTeam.id, 'Home')),
    ...matchday.awayTeam.roster.map((player) => toSnapshotPlayer(player, matchday.awayTeam.id, 'Away')),
  ];

  return buildMatchRatingSnapshots(matchday.id, players, capturedAt);
}

function toSnapshotPlayer(
  player: LaunchPlayer,
  teamId: string,
  side: 'Home' | 'Away',
): MatchSnapshotPlayer {
  if (player.clashIndex == null) {
    // This is an invariant failure, not an unrated-player workflow. League CI
    // seeding is expected to give every active Matchday player a numeric CI.
    throw new Error(`Active Matchday player ${player.id} has no Clash Index`);
  }

  return {
    playerId: player.id,
    teamId,
    playerName: player.name,
    teamName: '', // Snapshot persistence can resolve/fill the immutable team display name.
    side,
    clashIndex: player.clashIndex,
    ciSource: sourceForPlayer(player),
  };
}

function sourceForPlayer(player: LaunchPlayer): ClashIndexSource {
  return player.clashIndexProvisional ? 'GhostAverage' : 'Established';
}
