import assert from 'node:assert/strict';
import test from 'node:test';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import {
  assertCompleteHistoricalContests,
  dryRunHistoricalCiMovementBackfill,
  prepareHistoricalCiLedgerInserts,
} from './HistoricalCiMovementBackfill';

function row(overrides: Partial<HistoricalPlayerMatchup>): HistoricalPlayerMatchup {
  return {
    deduplicationKey: 'row',
    seasonId: 'season-1',
    seasonName: 'Season 1',
    eventLabel: 'Round 1',
    eventMonth: 'October',
    eventOrder: 1,
    format: 'Singles',
    playerId: 'home',
    playerName: 'Home Player',
    playerTeamId: 'team-home',
    playerTeamName: 'Home Team',
    partnerPlayerId: null,
    partnerPlayerName: null,
    opponentOnePlayerId: 'away',
    opponentOnePlayerName: 'Away Player',
    opponentTwoPlayerId: null,
    opponentTwoPlayerName: null,
    opponentTeamId: 'team-away',
    opponentTeamName: 'Away Team',
    outcome: 'W',
    rawResult: null,
    rawScore: null,
    sourceWorkbook: 'history.xlsx',
    sourceSheet: 'Round 1',
    sourceRow: 1,
    historicalTeamMatchId: 10,
    playerSide: 'Home',
    homeAwayValidated: true,
    ...overrides,
  };
}

function mirroredRegularRows(): HistoricalPlayerMatchup[] {
  return [
    row({deduplicationKey: 'home'}),
    row({
      deduplicationKey: 'away',
      playerId: 'away',
      playerName: 'Away Player',
      playerTeamId: 'team-away',
      playerTeamName: 'Away Team',
      opponentOnePlayerId: 'home',
      opponentOnePlayerName: 'Home Player',
      opponentTeamId: 'team-home',
      opponentTeamName: 'Home Team',
      outcome: 'L',
      playerSide: 'Away',
      sourceRow: 2,
    }),
  ];
}

test('dry run reconciles every replayed row without persistence', () => {
  const result = dryRunHistoricalCiMovementBackfill(
    mirroredRegularRows(),
    new Map([['home', 900], ['away', 900]]),
  );

  assert.equal(result.facts.length, 2);
  assert.equal(result.quarantine.length, 0);
  assert.deepEqual(result.reconciliation, {
    inputRows: 2,
    replayedRows: 2,
    quarantinedRows: 0,
    accountedRows: 2,
    allRowsAccountedFor: true,
    replayedPlayers: 2,
  });
});

test('truly unresolved regular-season rows remain blocked instead of guessed', () => {
  const unresolved = mirroredRegularRows().map((entry, index) => row({
    ...entry,
    deduplicationKey: `unknown-side-${index}`,
    eventLabel: 'Round 3',
    eventMonth: 'December',
    eventOrder: 3,
    historicalTeamMatchId: null,
    playerSide: null,
    homeAwayValidated: false,
    sourceRow: 20 + index,
  }));

  const result = dryRunHistoricalCiMovementBackfill(
    unresolved,
    new Map([['home', 900], ['away', 900]]),
  );

  assert.equal(result.facts.length, 0);
  assert.equal(result.quarantine.length, 2);
  assert.equal(result.quarantine[0].reason, 'regular-season-side-unresolved');
  assert.equal(result.reconciliation.allRowsAccountedFor, true);
  assert.equal(result.reconciliation.accountedRows, 2);
  assert.throws(() => prepareHistoricalCiLedgerInserts(result), /unresolved rows/);
});

test('playoff rows without historical side replay as neutral instead of quarantine', () => {
  const playoff = mirroredRegularRows().map((entry, index) => row({
    ...entry,
    deduplicationKey: `playoff-${index}`,
    eventLabel: 'Championship',
    eventMonth: 'March',
    eventOrder: 6,
    historicalTeamMatchId: null,
    playerSide: null,
    homeAwayValidated: false,
    sourceRow: 30 + index,
  }));

  const result = dryRunHistoricalCiMovementBackfill(
    playoff,
    new Map([['home', 900], ['away', 900]]),
  );

  assert.equal(result.quarantine.length, 0);
  assert.equal(result.facts.length, 2);
  assert.ok(result.facts.every((fact) => fact.venue === 'Neutral'));
  assert.ok(result.facts.every((fact) => fact.side === null));
  assert.equal(result.reconciliation.allRowsAccountedFor, true);
});

test('validated dry run maps exactly to immutable historical ledger rows', () => {
  const dryRun = dryRunHistoricalCiMovementBackfill(
    mirroredRegularRows(),
    new Map([['home', 900], ['away', 900]]),
  );
  const inserts = prepareHistoricalCiLedgerInserts(dryRun);

  assert.equal(inserts.length, 2);
  assert.equal(inserts[0].matchup_deduplication_key, dryRun.facts[0].matchupDeduplicationKey);
  assert.equal(inserts[0].expected_points, dryRun.facts[0].winProbability);
  assert.equal(
    inserts[0].performance_vs_expected,
    dryRun.facts[0].actualPoints - dryRun.facts[0].winProbability,
  );
  assert.equal(inserts[0].ci_delta, dryRun.facts[0].ciDelta);
  assert.equal(inserts[0].algorithm_version, dryRun.facts[0].algorithmVersion);
});

test('incomplete contest blocks immutable ledger preparation', () => {
  const dryRun = dryRunHistoricalCiMovementBackfill(
    [mirroredRegularRows()[0]],
    new Map([['home', 900], ['away', 900]]),
  );
  assert.throws(() => prepareHistoricalCiLedgerInserts(dryRun), /1\/2 player facts/);
});

test('contest validation rejects non-zero-sum facts', () => {
  const dryRun = dryRunHistoricalCiMovementBackfill(
    mirroredRegularRows(),
    new Map([['home', 900], ['away', 900]]),
  );
  const altered = dryRun.facts.map((fact, index) => index === 0 ? {...fact, ciDelta: fact.ciDelta + 1} : fact);
  assert.throws(() => assertCompleteHistoricalContests(altered), /not zero-sum/);
});

test('contest validation rejects team/opponent assignments that do not describe one contest', () => {
  const dryRun = dryRunHistoricalCiMovementBackfill(
    mirroredRegularRows(),
    new Map([['home', 900], ['away', 900]]),
  );
  const altered = dryRun.facts.map((fact, index) => index === 1
    ? {...fact, teamId: 'team-third', teamName: 'Third Team'}
    : fact);
  assert.throws(() => assertCompleteHistoricalContests(altered), /inconsistent opponent teams/);
});

test('same input produces the same backfill facts', () => {
  const rows = mirroredRegularRows();
  const ratings = new Map([['home', 900], ['away', 900]]);
  const first = dryRunHistoricalCiMovementBackfill(rows, ratings);
  const second = dryRunHistoricalCiMovementBackfill(rows, ratings);

  assert.deepEqual(first.facts, second.facts);
  assert.deepEqual([...first.endingRatings], [...second.endingRatings]);
  assert.deepEqual([...first.seasonGain], [...second.seasonGain]);
});