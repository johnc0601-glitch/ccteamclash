export type HistoricalCiLedgerFact = {
  seasonId: string;
  playerId: string;
  historicalTeamMatchId: number;
  format: 'Singles' | 'Doubles';
  clashIndexBefore: number;
  ciDelta: number;
};

export type HistoricalTeamMatchOrder = {
  id: number;
  eventOrder: number;
};

export type HistoricalCiLedgerSummary = {
  ciGain: number;
  singlesCiGain: number;
  doublesCiGain: number;
  endingCi: number;
};

export type HistoricalCiLedgerValidationResult =
  | {ok: true; summaries: Map<string, HistoricalCiLedgerSummary>}
  | {ok: false; reason: string};

type TeamMatchBatch = {
  teamMatchId: number;
  eventOrder: number;
  clashIndexBefore: number;
  ciDelta: number;
};

/**
 * Summarizes the immutable historical CI ledger into one row per player/season.
 * Validation failures include a reason so callers can make replay fallback
 * observable instead of silently restoring the expensive calculation path.
 */
export function summarizeHistoricalCiLedger(
  facts: HistoricalCiLedgerFact[],
  teamMatches: HistoricalTeamMatchOrder[],
): HistoricalCiLedgerValidationResult {
  const eventOrderByTeamMatchId = new Map(teamMatches.map((row) => [row.id, row.eventOrder]));
  const totalsByPlayerSeason = new Map<string, {singlesCiGain: number; doublesCiGain: number}>();
  const batchesByPlayerSeason = new Map<string, Map<number, TeamMatchBatch>>();

  for (const fact of facts) {
    const eventOrder = eventOrderByTeamMatchId.get(fact.historicalTeamMatchId);
    if (eventOrder === undefined) {
      return invalid(`missing event order for historical team match ${fact.historicalTeamMatchId}`);
    }

    const key = playerSeasonCiKey(fact.seasonId, fact.playerId);
    const totals = totalsByPlayerSeason.get(key) ?? {singlesCiGain: 0, doublesCiGain: 0};
    if (fact.format === 'Singles') totals.singlesCiGain += fact.ciDelta;
    else totals.doublesCiGain += fact.ciDelta;
    totalsByPlayerSeason.set(key, totals);

    const batches = batchesByPlayerSeason.get(key) ?? new Map<number, TeamMatchBatch>();
    const existing = batches.get(fact.historicalTeamMatchId);
    if (existing) {
      if (existing.clashIndexBefore !== fact.clashIndexBefore) {
        return invalid(
          `inconsistent starting CI for ${key} in historical team match ${fact.historicalTeamMatchId}: `
          + `${existing.clashIndexBefore} vs ${fact.clashIndexBefore}`,
        );
      }
      if (existing.eventOrder !== eventOrder) {
        return invalid(`inconsistent event order for historical team match ${fact.historicalTeamMatchId}`);
      }
      existing.ciDelta += fact.ciDelta;
    } else {
      batches.set(fact.historicalTeamMatchId, {
        teamMatchId: fact.historicalTeamMatchId,
        eventOrder,
        clashIndexBefore: fact.clashIndexBefore,
        ciDelta: fact.ciDelta,
      });
    }
    batchesByPlayerSeason.set(key, batches);
  }

  const summaries = new Map<string, HistoricalCiLedgerSummary>();
  for (const [key, batchesById] of batchesByPlayerSeason) {
    const batches = [...batchesById.values()].sort((a, b) =>
      a.eventOrder - b.eventOrder || a.teamMatchId - b.teamMatchId);
    if (!batches.length) continue;

    let endingCi: number | undefined;
    for (const batch of batches) {
      if (endingCi !== undefined && batch.clashIndexBefore !== endingCi) {
        return invalid(
          `rating discontinuity for ${key} at historical team match ${batch.teamMatchId}: `
          + `expected ${endingCi}, got ${batch.clashIndexBefore}`,
        );
      }
      endingCi = batch.clashIndexBefore + batch.ciDelta;
    }

    const totals = totalsByPlayerSeason.get(key) ?? {singlesCiGain: 0, doublesCiGain: 0};
    summaries.set(key, {
      ciGain: totals.singlesCiGain + totals.doublesCiGain,
      singlesCiGain: totals.singlesCiGain,
      doublesCiGain: totals.doublesCiGain,
      endingCi: endingCi as number,
    });
  }

  return {ok: true, summaries};
}

export function playerSeasonCiKey(seasonId: string, playerId: string): string {
  return `${seasonId}:${playerId}`;
}

function invalid(reason: string): HistoricalCiLedgerValidationResult {
  return {ok: false, reason};
}
