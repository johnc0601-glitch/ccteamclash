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

export type HistoricalCiLedgerInsert = {
  matchup_deduplication_key: string;
  contest_id: string;
  historical_match_key: string;
  historical_team_match_id: number | null;
  season_id: string;
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  opponent_team_id: string;
  opponent_team_name: string;
  side: 'Home' | 'Away' | null;
  venue: ClashVenue;
  format: 'Singles' | 'Doubles';
  outcome: 'W' | 'L' | 'T';
  clash_index_before: number;
  opponent_effective_ci: number;
  win_probability: number;
  actual_points: number;
  expected_points: number;
  performance_vs_expected: number;
  ci_delta: number;
  algorithm_version: string;
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

/**
 * Converts a reconciled dry run into the exact immutable ledger payload.
 * Persistence must never proceed while any row is quarantined, unaccounted, or
 * part of an incomplete/non-zero-sum contest.
 */
export function prepareHistoricalCiLedgerInserts(
  dryRun: HistoricalCiBackfillDryRun,
): HistoricalCiLedgerInsert[] {
  assertHistoricalCiBackfillReady(dryRun);
  return dryRun.facts.map((fact) => ({
    matchup_deduplication_key: fact.matchupDeduplicationKey,
    contest_id: fact.contestId,
    historical_match_key: fact.historicalMatchKey,
    historical_team_match_id: fact.historicalTeamMatchId,
    season_id: fact.seasonId,
    player_id: fact.playerId,
    player_name: fact.playerName,
    team_id: fact.teamId,
    team_name: fact.teamName,
    opponent_team_id: fact.opponentTeamId,
    opponent_team_name: fact.opponentTeamName,
    side: fact.side,
    venue: fact.venue,
    format: fact.format,
    outcome: fact.outcome,
    clash_index_before: fact.clashIndexBefore,
    opponent_effective_ci: fact.opponentEffectiveCi,
    win_probability: fact.winProbability,
    actual_points: fact.actualPoints,
    expected_points: fact.winProbability,
    performance_vs_expected: fact.actualPoints - fact.winProbability,
    ci_delta: fact.ciDelta,
    algorithm_version: fact.algorithmVersion,
  }));
}

export function assertHistoricalCiBackfillReady(dryRun: HistoricalCiBackfillDryRun): void {
  if (!dryRun.reconciliation.allRowsAccountedFor) {
    throw new Error('Historical CI backfill is not fully reconciled');
  }
  if (dryRun.quarantine.length > 0) {
    throw new Error(`Historical CI backfill has ${dryRun.quarantine.length} unresolved rows`);
  }
  if (dryRun.reconciliation.replayedRows !== dryRun.reconciliation.inputRows) {
    throw new Error('Historical CI backfill replay count does not match input count');
  }
  assertCompleteHistoricalContests(dryRun.facts);
}

export function assertCompleteHistoricalContests(facts: HistoricalReplayFact[]): void {
  const factsByContest = new Map<string, HistoricalReplayFact[]>();
  for (const fact of facts) {
    const group = factsByContest.get(fact.contestId) ?? [];
    group.push(fact);
    factsByContest.set(fact.contestId, group);
  }

  for (const [contestId, contestFacts] of factsByContest) {
    const format = contestFacts[0]?.format;
    const expectedRows = format === 'Singles' ? 2 : 4;
    if (contestFacts.length !== expectedRows) {
      throw new Error(`Historical CI contest ${contestId} has ${contestFacts.length}/${expectedRows} player facts`);
    }
    if (contestFacts.some((fact) => fact.format !== format)) {
      throw new Error(`Historical CI contest ${contestId} mixes formats`);
    }
    if (new Set(contestFacts.map((fact) => fact.playerId)).size !== expectedRows) {
      throw new Error(`Historical CI contest ${contestId} contains duplicate player facts`);
    }
    const netMovement = contestFacts.reduce((sum, fact) => sum + fact.ciDelta, 0);
    if (netMovement !== 0) {
      throw new Error(`Historical CI contest ${contestId} is not zero-sum (${netMovement})`);
    }
  }
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
