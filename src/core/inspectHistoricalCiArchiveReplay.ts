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
  singlesGainHigh: HistoricalCiGainLeader[];
  doublesGainHigh: HistoricalCiGainLeader[];
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
  const singlesGain = new Map<string, number>();
  const doublesGain = new Map<string, number>();

  for (const [seasonId, season] of replay.seasons) {
    seasonFactCounts[seasonId] = season.facts.length;
    for (const fact of season.facts) {
      overallGain.set(fact.playerId, (overallGain.get(fact.playerId) ?? 0) + fact.ciDelta);
      const formatGain = fact.format === 'Singles' ? singlesGain : doublesGain;
      formatGain.set(fact.playerId, (formatGain.get(fact.playerId) ?? 0) + fact.ciDelta);
    }
  }

  const finalRatings = [...replay.finalRatings.entries()].map(([playerId, ci]) => ({playerId, ci}));

  return {
    factCount: replay.ledger.length,
    seasonFactCounts,
    finalRatingsHigh: [...finalRatings].sort((a, b) => b.ci - a.ci || a.playerId.localeCompare(b.playerId)).slice(0, limit),
    finalRatingsLow: [...finalRatings].sort((a, b) => a.ci - b.ci || a.playerId.localeCompare(b.playerId)).slice(0, limit),
    overallGainHigh: gainLeaders(overallGain, limit),
    singlesGainHigh: gainLeaders(singlesGain, limit),
    doublesGainHigh: gainLeaders(doublesGain, limit),
  };
}

function gainLeaders(gains: ReadonlyMap<string, number>, limit: number): HistoricalCiGainLeader[] {
  return [...gains.entries()]
    .map(([playerId, ciGain]) => ({playerId, ciGain}))
    .sort((a, b) => b.ciGain - a.ciGain || a.playerId.localeCompare(b.playerId))
    .slice(0, limit);
}
