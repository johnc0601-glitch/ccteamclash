import {CLASH_MODEL_VERSION, type ClashVenue} from './ClashPrediction';
import type {ClashIndexSource} from './ClashIndexSource';

export type MatchRatingSnapshot = {
  matchId: string;
  playerId: string;
  teamId: string;
  playerName: string;
  teamName: string;
  side: 'Home' | 'Away';
  venue: ClashVenue;
  clashIndexBefore: number;
  ciSourceBefore: ClashIndexSource;
  algorithmVersion: string;
  capturedAt: string;
};

export type MatchSnapshotPlayer = {
  playerId: string;
  teamId: string;
  playerName: string;
  teamName: string;
  side: 'Home' | 'Away';
  clashIndex: number;
  ciSource: ClashIndexSource;
};

/**
 * Every active Matchday player has a numeric CI. A ghost CI is an averaged
 * starting value, not a missing rating. Preserve its source independently so
 * the same numeric pipeline can rate everyone while retaining provenance.
 * Venue is frozen with the snapshot so later course/team-profile edits cannot
 * retroactively change whether singles home advantage applied.
 */
export function buildMatchRatingSnapshots(
  matchId: string,
  players: MatchSnapshotPlayer[],
  venue: ClashVenue = 'Home',
  capturedAt = new Date().toISOString(),
): MatchRatingSnapshot[] {
  return players.map((player) => ({
    matchId,
    playerId: player.playerId,
    teamId: player.teamId,
    playerName: player.playerName,
    teamName: player.teamName,
    side: player.side,
    venue,
    clashIndexBefore: player.clashIndex,
    ciSourceBefore: player.ciSource,
    algorithmVersion: CLASH_MODEL_VERSION,
    capturedAt,
  }));
}
