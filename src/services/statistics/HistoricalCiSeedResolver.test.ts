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

test('reviewed Zach Settle override prevents an 825 provisional start', () => {
  const seeds = resolveHistoricalCiSeeds(
    'coastal-clash-2025-2026',
    [{playerId: 'zach-settle', playerName: 'Zach Settle', gender: 'Male'}],
    [],
  );

  assert.equal(seeds[0].pdgaRating, 935);
  assert.equal(seeds[0].source, 'HistoricalOverride');
});

test('nearest verified PDGA season fills a missing exact-season seed', () => {
  const seeds = resolveHistoricalCiSeeds(
    'coastal-clash-2024-2025',
    [{playerId: 'jeff-collins', playerName: 'Jeff Collins', gender: 'Male'}],
    [{
      seasonId: 'coastal-clash-2025-2026',
      playerName: 'Jeff Collins',
      rating: 913,
      source: 'PDGA',
    }],
  );

  assert.deepEqual(seeds[0], {
    playerId: 'jeff-collins',
    pdgaRating: 913,
    division: 'Open',
    source: 'HistoricalPDGA',
  });
});

test('exact-season PDGA seed still wins over another season', () => {
  const seeds = resolveHistoricalCiSeeds(
    'coastal-clash-2025-2026',
    [{playerId: 'player', playerName: 'Player One', gender: 'Male'}],
    [
      {seasonId: 'coastal-clash-2024-2025', playerName: 'Player One', rating: 900, source: 'PDGA'},
      {seasonId: 'coastal-clash-2025-2026', playerName: 'Player One', rating: 925, source: 'PDGA'},
    ],
  );

  assert.equal(seeds[0].pdgaRating, 925);
});

test('Kurt Ferguson seed is not borrowed by Kurtis Brandenburg', () => {
  const seeds = resolveHistoricalCiSeeds(
    'coastal-clash-2025-2026',
    [{playerId: 'kurtis-brandenburg', playerName: 'Kurtis Brandenburg', gender: 'Male'}],
    [{
      seasonId: 'coastal-clash-2025-2026',
      playerName: 'Kurt Ferguson',
      rating: 884,
      source: 'PDGA',
    }],
  );

  assert.equal(seeds[0].pdgaRating, null);
  assert.equal(seeds[0].source, 'Provisional');
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

test('Christopher King 2025-26 ghost seed stays provisional instead of using a manual 963 override', () => {
  const seeds = resolveHistoricalCiSeeds(
    'coastal-clash-2025-2026',
    [{playerId: 'christopher-king-jr', playerName: 'Christopher King Jr', gender: 'Male'}],
    [{
      seasonId: 'coastal-clash-2025-2026',
      playerName: 'Christopher King Jr',
      rating: 835,
      source: 'GHOST',
    }],
  );

  assert.equal(seeds[0].pdgaRating, null);
  assert.equal(seeds[0].division, 'Open');
  assert.equal(seeds[0].source, 'Provisional');
});

test('missing historical seed remains provisional when no verified PDGA seed exists', () => {
  const seeds = resolveHistoricalCiSeeds(
    's1',
    [{playerId: 'new', playerName: 'New Player', gender: 'Male'}],
    [],
  );

  assert.equal(seeds[0].pdgaRating, null);
  assert.equal(seeds[0].division, 'Open');
  assert.equal(seeds[0].source, 'Provisional');
});
