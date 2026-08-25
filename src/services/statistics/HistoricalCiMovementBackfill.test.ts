import assert from 'node:assert/strict';
import test from 'node:test';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import {dryRunHistoricalCiMovementBackfill} from './HistoricalCiMovementBackfill';

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

test('unresolved regular-season rows are quarantined and fully reconciled', () => {
  const unresolved = mirroredRegularRows().map((entry, index) => row({
    ...entry,
    deduplicationKey: `december-${index}`,
    eventLabel: 'December',
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
  assert.equal(result.endingRatings.get('home'), 900);
  assert.equal(result.endingRatings.get('away'), 900);
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

test('same input produces the same backfill facts', () => {
  const rows = mirroredRegularRows();
  const ratings = new Map([['home', 900], ['away', 900]]);
  const first = dryRunHistoricalCiMovementBackfill(rows, ratings);
  const second = dryRunHistoricalCiMovementBackfill(rows, ratings);

  assert.deepEqual(first.facts, second.facts);
  assert.deepEqual([...first.endingRatings], [...second.endingRatings]);
  assert.deepEqual([...first.seasonGain], [...second.seasonGain]);
});
