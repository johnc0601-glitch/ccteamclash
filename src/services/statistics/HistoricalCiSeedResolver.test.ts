import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveHistoricalCiSeeds} from './HistoricalCiSeedResolver';

test('historical PDGA seed wins over legacy ghost seed', () => {
  const seeds = resolveHistoricalCiSeeds(
    's1',
    [{playerId: 'hunter', playerName: 'Hunter Gainey', gender: 'Male'}],
    [
      {seasonId: 's1', playerName: 'Hunter Gainey', rating: 850, source: 'GHOST'},
      {seasonId: 's1', playerName: 'Hunter Gainey', rating: 910, source: 'PDGA'},
    ],
  );

  assert.deepEqual(seeds[0], {
    playerId: 'hunter',
    pdgaRating: 910,
    division: 'Open',
    source: 'HistoricalPDGA',
  });
});

test('confirmed historical alias resolves the correct PDGA seed', () => {
  const seeds = resolveHistoricalCiSeeds(
    's1',
    [{playerId: 'will-deering', playerName: 'Will Deering', gender: 'Male'}],
    [{seasonId: 's1', playerName: 'William Deering', rating: 994, source: 'PDGA'}],
  );

  assert.deepEqual(seeds[0], {
    playerId: 'will-deering',
    pdgaRating: 994,
    division: 'Open',
    source: 'HistoricalPDGA',
  });
});

test('explicit reviewed historical seed override is used', () => {
  const seeds = resolveHistoricalCiSeeds(
    'coastal-clash-2025-2026',
    [{playerId: 'john-loyd', playerName: 'John Loyd', gender: 'Male'}],
    [],
  );

  assert.deepEqual(seeds[0], {
    playerId: 'john-loyd',
    pdgaRating: 900,
    division: 'Open',
    source: 'HistoricalOverride',
  });
});

test('legacy ghost rating is ignored so finalized provisional baseline owns the start', () => {
  const seeds = resolveHistoricalCiSeeds(
    's1',
    [{playerId: 'abby', playerName: 'Abby Bertone', gender: 'Female'}],
    [{seasonId: 's1', playerName: 'Abby Bertone', rating: 725, source: 'GHOST'}],
  );

  assert.equal(seeds[0].pdgaRating, null);
  assert.equal(seeds[0].division, 'Women');
  assert.equal(seeds[0].source, 'Provisional');
});

test('missing historical seed does not borrow a current PDGA rating', () => {
  const seeds = resolveHistoricalCiSeeds(
    's1',
    [{playerId: 'new', playerName: 'New Player', gender: 'Male'}],
    [],
  );

  assert.equal(seeds[0].pdgaRating, null);
  assert.equal(seeds[0].division, 'Open');
  assert.equal(seeds[0].source, 'Provisional');
});
