import {
  playerSeasonCiKey,
  type HistoricalCiLedgerSummary,
} from './HistoricalCiLedgerSummary';

type ReplaySeason = {
  facts: Array<{playerId: string; format: 'Singles' | 'Doubles'; ciDelta: number}>;
  endingRatings: ReadonlyMap<string, number>;
};

export function selectHistoricalCiReplaySummaries(
  seasons: ReadonlyMap<string, ReplaySeason>,
  requestedSeasonId?: string,
): Map<string, HistoricalCiLedgerSummary> {
  const gains = new Map<string, HistoricalCiLedgerSummary>();
  for (const [seasonId, season] of seasons) {
    if (requestedSeasonId && seasonId !== requestedSeasonId) continue;
    const splitByPlayer = new Map<string, {singlesCiGain: number; doublesCiGain: number}>();
    for (const fact of season.facts) {
      const split = splitByPlayer.get(fact.playerId) ?? {singlesCiGain: 0, doublesCiGain: 0};
      if (fact.format === 'Singles') split.singlesCiGain += fact.ciDelta;
      else split.doublesCiGain += fact.ciDelta;
      splitByPlayer.set(fact.playerId, split);
    }
    for (const [playerId, endingCi] of season.endingRatings) {
      const split = splitByPlayer.get(playerId) ?? {singlesCiGain: 0, doublesCiGain: 0};
      gains.set(playerSeasonCiKey(seasonId, playerId), {
        ciGain: split.singlesCiGain + split.doublesCiGain,
        singlesCiGain: split.singlesCiGain,
        doublesCiGain: split.doublesCiGain,
        endingCi,
      });
    }
  }
  return gains;
}
