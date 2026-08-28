import {describe, expect, it} from 'vitest';
import {summarizeHistoricalCiLedger} from '@/services/statistics/HistoricalCiLedgerSummary';

describe('summarizeHistoricalCiLedger', () => {
  it('combines same-team-match contests before advancing the player rating', () => {
    const result = summarizeHistoricalCiLedger([
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 1, format: 'Singles', clashIndexBefore: 925, ciDelta: -4},
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 1, format: 'Doubles', clashIndexBefore: 925, ciDelta: 2},
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 2, format: 'Singles', clashIndexBefore: 923, ciDelta: 3},
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 2, format: 'Doubles', clashIndexBefore: 923, ciDelta: 5},
    ], [
      {id: 1, eventOrder: 1},
      {id: 2, eventOrder: 2},
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.summaries.get('s1:p1')).toEqual({
      ciGain: 6,
      singlesCiGain: -1,
      doublesCiGain: 7,
      endingCi: 931,
    });
  });

  it('uses team-match id as the deterministic tie-break within one event order', () => {
    const result = summarizeHistoricalCiLedger([
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 28, format: 'Singles', clashIndexBefore: 783, ciDelta: 9},
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 29, format: 'Singles', clashIndexBefore: 792, ciDelta: -17},
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 31, format: 'Singles', clashIndexBefore: 775, ciDelta: 6},
    ], [
      {id: 28, eventOrder: 3},
      {id: 29, eventOrder: 3},
      {id: 31, eventOrder: 4},
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.summaries.get('s1:p1')).toMatchObject({ciGain: -2, endingCi: 781});
  });

  it('returns an observable reason for a discontinuous ledger', () => {
    const result = summarizeHistoricalCiLedger([
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 1, format: 'Singles', clashIndexBefore: 925, ciDelta: 2},
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 2, format: 'Singles', clashIndexBefore: 930, ciDelta: 1},
    ], [
      {id: 1, eventOrder: 1},
      {id: 2, eventOrder: 2},
    ]);

    expect(result).toEqual({
      ok: false,
      reason: 'rating discontinuity for s1:p1 at historical team match 2: expected 927, got 930',
    });
  });

  it('returns an observable reason for conflicting starting CI inside one team-match batch', () => {
    const result = summarizeHistoricalCiLedger([
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 1, format: 'Singles', clashIndexBefore: 925, ciDelta: -4},
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 1, format: 'Doubles', clashIndexBefore: 926, ciDelta: 2},
    ], [{id: 1, eventOrder: 1}]);

    expect(result).toEqual({
      ok: false,
      reason: 'inconsistent starting CI for s1:p1 in historical team match 1: 925 vs 926',
    });
  });

  it('returns an observable reason when a fact has no team-match ordering row', () => {
    const result = summarizeHistoricalCiLedger([
      {seasonId: 's1', playerId: 'p1', historicalTeamMatchId: 99, format: 'Singles', clashIndexBefore: 925, ciDelta: 1},
    ], []);

    expect(result).toEqual({
      ok: false,
      reason: 'missing event order for historical team match 99',
    });
  });
});
