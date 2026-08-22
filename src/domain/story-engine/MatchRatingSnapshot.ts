export const CLASH_MODEL_VERSION = '2026-27-v1-home15-doubles80-20' as const;

export type MatchRatingSnapshot = {
  matchId: string;
  playerId: string;
  teamId: string;
  playerName: string;
  teamName: string;
  side: 'Home' | 'Away';
  clashIndexBefore: number;
  provisionalBefore: boolean;
  algorithmVersion: string;
  capturedAt: string;
};

export type MatchSnapshotPlayer = {
  playerId: string;
  teamId: string;
  playerName: string;
  teamName: string;
  side: 'Home' | 'Away';
  clashIndex: number | null;
  provisional: boolean;
};

/**
 * Builds the immutable rating state for a team match before any of that match's
 * contests are applied. Players without a CI are deliberately excluded rather
 * than silently assigning a synthetic rating.
 */
export function buildMatchRatingSnapshots(
  matchId: string,
  players: MatchSnapshotPlayer[],
  capturedAt = new Date().toISOString(),
): MatchRatingSnapshot[] {
  return players.flatMap((player) => player.clashIndex === null ? [] : [{
    matchId,
    playerId: player.playerId,
    teamId: player.teamId,
    playerName: player.playerName,
    teamName: player.teamName,
    side: player.side,
    clashIndexBefore: player.clashIndex,
    provisionalBefore: player.provisional,
    algorithmVersion: CLASH_MODEL_VERSION,
    capturedAt,
  }]);
}
