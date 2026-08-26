import 'server-only';

import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';

export type HistoricalCiLeader = {
  playerId: string;
  ci: number;
};

export type HistoricalCiGainLeader = {
  playerId: string;
  ciGain: number;
};

export type HistoricalCiReplayInspection = {
  factCount: number;
  seasonFactCounts: Record<string, number>;
  finalRatingsHigh: HistoricalCiLeader[];
  finalRatingsLow: HistoricalCiLeader[];
  overallGainHigh: HistoricalCiGainLeader[];
};

/**
 * Read-only review report for the complete historical replay. Use this before
 * the immutable backfill so obviously wrong ending ratings or CI Gain leaders
 * can be caught without touching the ledger.
 */
export async function inspectHistoricalCiArchiveReplay(limit = 15): Promise<HistoricalCiReplayInspection> {
  const replay = await loadServerHistoricalCiArchiveReplay();
  const seasonFactCounts: Record<string, number> = {};
  const overallGain = new Map<string, number>();

  for (const [seasonId, season] of replay.seasons) {
    seasonFactCounts[seasonId] = season.facts.length;
    for (const [playerId, gain] of season.seasonGain) {
      overallGain.set(playerId, (overallGain.get(playerId) ?? 0) + gain);
    }
  }

  const finalRatings = [...replay.finalRatings.entries()].map(([playerId, ci]) => ({playerId, ci}));
  const gains = [...overallGain.entries()].map(([playerId, ciGain]) => ({playerId, ciGain}));

  return {
    factCount: replay.ledger.length,
    seasonFactCounts,
    finalRatingsHigh: [...finalRatings].sort((a, b) => b.ci - a.ci || a.playerId.localeCompare(b.playerId)).slice(0, limit),
    finalRatingsLow: [...finalRatings].sort((a, b) => a.ci - b.ci || a.playerId.localeCompare(b.playerId)).slice(0, limit),
    overallGainHigh: [...gains].sort((a, b) => b.ciGain - a.ciGain || a.playerId.localeCompare(b.playerId)).slice(0, limit),
  };
}
