import type {ClashDivision} from '@/domain/story-engine/ClashSeasonReset';
import {clashSeasonStartCi} from '@/domain/story-engine/ClashSeasonReset';
import type {ClashVenue} from '@/domain/story-engine/ClashPrediction';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import {
  dryRunHistoricalCiMovementBackfill,
  type HistoricalCiBackfillDryRun,
} from './HistoricalCiMovementBackfill';

export type HistoricalCiSeasonPlayerSeed = {
  playerId: string;
  pdgaRating: number | null;
  division: ClashDivision;
};

export type HistoricalCiSeasonReplayInput = {
  rows: HistoricalPlayerMatchup[];
  players: HistoricalCiSeasonPlayerSeed[];
  priorEndingRatings?: ReadonlyMap<string, number>;
  venueByTeamMatchId?: ReadonlyMap<number, ClashVenue>;
};

export type HistoricalCiSeasonReplayResult = HistoricalCiBackfillDryRun & {
  startingRatings: Map<string, number>;
};

/**
 * Replays one historical season under the current Clash model.
 *
 * Starting CI is deliberately separate from earned CI movement:
 * - first-season/new player: historical PDGA, else division provisional CI;
 * - returning player: 80% prior Clash ending CI + 20% historical PDGA;
 * - returning player without usable PDGA: prior Clash CI carries forward.
 *
 * The reset itself never appears in seasonGain or the immutable contest ledger.
 */
export function replayHistoricalCiSeason({
  rows,
  players,
  priorEndingRatings = new Map(),
  venueByTeamMatchId = new Map(),
}: HistoricalCiSeasonReplayInput): HistoricalCiSeasonReplayResult {
  const requiredPlayerIds = collectRequiredPlayerIds(rows);
  const playerById = new Map(players.map((player) => [player.playerId, player]));
  const startingRatings = new Map<string, number>();

  for (const playerId of requiredPlayerIds) {
    const player = playerById.get(playerId);
    if (!player) throw new Error(`Missing historical CI seed metadata for ${playerId}`);
    startingRatings.set(playerId, clashSeasonStartCi({
      priorClashIndex: priorEndingRatings.get(playerId),
      pdgaRating: player.pdgaRating,
      division: player.division,
    }));
  }

  const dryRun = dryRunHistoricalCiMovementBackfill(rows, startingRatings, venueByTeamMatchId);
  return {...dryRun, startingRatings};
}

function collectRequiredPlayerIds(rows: HistoricalPlayerMatchup[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.playerId);
    ids.add(row.opponentOnePlayerId);
    if (row.partnerPlayerId) ids.add(row.partnerPlayerId);
    if (row.opponentTwoPlayerId) ids.add(row.opponentTwoPlayerId);
  }
  return ids;
}
