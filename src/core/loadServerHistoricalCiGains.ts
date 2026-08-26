import 'server-only';

import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';

export type HistoricalCiGainBreakdown = {
  ciGain: number;
  singlesCiGain: number;
  doublesCiGain: number;
  endingCi: number;
};

/**
 * Builds historical CI statistics directly from the deterministic archive replay.
 * This keeps Stats usable before the optional immutable historical ledger is
 * published and guarantees the displayed season ending CI uses the same replay
 * that produces each match's CI movement.
 */
export async function loadServerHistoricalCiGains(): Promise<Map<string, HistoricalCiGainBreakdown>> {
  const replay = await loadServerHistoricalCiArchiveReplay();
  const gains = new Map<string, HistoricalCiGainBreakdown>();

  for (const [seasonId, season] of replay.seasons) {
    const splitByPlayer = new Map<string, {singlesCiGain: number; doublesCiGain: number}>();
    for (const fact of season.facts) {
      const split = splitByPlayer.get(fact.playerId) ?? {singlesCiGain: 0, doublesCiGain: 0};
      if (fact.format === 'Singles') split.singlesCiGain += fact.ciDelta;
      else split.doublesCiGain += fact.ciDelta;
      splitByPlayer.set(fact.playerId, split);
    }

    for (const [playerId, endingCi] of season.endingRatings) {
      const split = splitByPlayer.get(playerId) ?? {singlesCiGain: 0, doublesCiGain: 0};
      gains.set(playerSeasonKey(seasonId, playerId), {
        ciGain: split.singlesCiGain + split.doublesCiGain,
        singlesCiGain: split.singlesCiGain,
        doublesCiGain: split.doublesCiGain,
        endingCi,
      });
    }
  }

  return gains;
}

export function playerSeasonCiKey(seasonId: string, playerId: string): string {
  return playerSeasonKey(seasonId, playerId);
}

function playerSeasonKey(seasonId: string, playerId: string): string {
  return `${seasonId}:${playerId}`;
}
