import type {ClashVenue} from '@/domain/story-engine/ClashPrediction';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import {
  replayHistoricalClashSeason,
  type HistoricalReplayFact,
} from '@/domain/history/HistoricalClashReplay';

export type HistoricalCiQuarantine = {
  deduplicationKey: string;
  seasonId: string;
  eventLabel: string;
  sourceWorkbook: string;
  sourceSheet: string;
  sourceRow: number;
  reason: 'regular-season-side-unresolved';
};

export type HistoricalCiBackfillReconciliation = {
  inputRows: number;
  replayedRows: number;
  quarantinedRows: number;
  accountedRows: number;
  allRowsAccountedFor: boolean;
  replayedPlayers: number;
};

export type HistoricalCiBackfillDryRun = {
  facts: HistoricalReplayFact[];
  endingRatings: Map<string, number>;
  seasonGain: Map<string, number>;
  quarantine: HistoricalCiQuarantine[];
  reconciliation: HistoricalCiBackfillReconciliation;
};

/**
 * Produces the deterministic payload that a historical CI backfill would write,
 * without performing any persistence. Rows that cannot be replayed safely stay
 * visible in quarantine so the caller never has to guess historical venue/side.
 */
export function dryRunHistoricalCiMovementBackfill(
  rows: HistoricalPlayerMatchup[],
  startingRatings: ReadonlyMap<string, number>,
  venueByTeamMatchId: ReadonlyMap<number, ClashVenue> = new Map(),
): HistoricalCiBackfillDryRun {
  const replay = replayHistoricalClashSeason(rows, startingRatings, venueByTeamMatchId);
  const replayedKeys = new Set(replay.facts.map((fact) => fact.matchupDeduplicationKey));
  const quarantine = replay.unresolvedRows.map(toQuarantine);
  const quarantinedKeys = new Set(quarantine.map((entry) => entry.deduplicationKey));
  const accountedKeys = new Set([...replayedKeys, ...quarantinedKeys]);

  return {
    facts: replay.facts,
    endingRatings: replay.endingRatings,
    seasonGain: replay.seasonGain,
    quarantine,
    reconciliation: {
      inputRows: rows.length,
      replayedRows: replayedKeys.size,
      quarantinedRows: quarantinedKeys.size,
      accountedRows: accountedKeys.size,
      allRowsAccountedFor: accountedKeys.size === new Set(rows.map((row) => row.deduplicationKey)).size,
      replayedPlayers: new Set(replay.facts.map((fact) => fact.playerId)).size,
    },
  };
}

function toQuarantine(row: HistoricalPlayerMatchup): HistoricalCiQuarantine {
  return {
    deduplicationKey: row.deduplicationKey,
    seasonId: row.seasonId,
    eventLabel: row.eventLabel,
    sourceWorkbook: row.sourceWorkbook,
    sourceSheet: row.sourceSheet,
    sourceRow: row.sourceRow,
    reason: 'regular-season-side-unresolved',
  };
}
