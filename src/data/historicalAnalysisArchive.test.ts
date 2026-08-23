import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HISTORICAL_ANALYSIS_MANIFESTS,
  HISTORICAL_ANALYSIS_RECORDS,
  getHistoricalAnalysisArchive,
  getHistoricalAnalysisRecords,
} from './historicalAnalysisArchive';

test('2024-25 playoff coverage is complete while 2025-26 remains missing', () => {
  assert.equal(HISTORICAL_ANALYSIS_MANIFESTS.length, 2);

  const season2425 = HISTORICAL_ANALYSIS_MANIFESTS.find((season) => season.seasonId === 'coastal-clash-2024-2025');
  const season2526 = HISTORICAL_ANALYSIS_MANIFESTS.find((season) => season.seasonId === 'coastal-clash-2025-2026');

  assert.equal(season2425?.playoffs, 'Complete');
  assert.ok(!season2425?.knownGaps.some((gap) => gap.toLocaleLowerCase().includes('playoff')));
  assert.equal(season2526?.playoffs, 'Missing');
  assert.ok(season2526?.knownGaps.some((gap) => gap.toLocaleLowerCase().includes('playoff')));
});

test('April 2025 playoff sheet expands into mirrored canonical player records', () => {
  const playoffRecords = getHistoricalAnalysisRecords({seasonId: 'coastal-clash-2024-2025', phase: 'Playoffs'});

  assert.equal(HISTORICAL_ANALYSIS_RECORDS.length, 100);
  assert.equal(playoffRecords.length, 100);
  assert.equal(playoffRecords.filter((record) => record.format === 'Singles').length, 44);
  assert.equal(playoffRecords.filter((record) => record.format === 'Doubles').length, 56);
  assert.equal(new Set(playoffRecords.map((record) => record.matchupId)).size, 3);
  assert.equal(playoffRecords.filter((record) => record.roundNumber === 1).length, 68);
  assert.equal(playoffRecords.filter((record) => record.roundNumber === 2).length, 32);
});

test('semifinals and championship preserve team and home-away context', () => {
  const darkKnights = getHistoricalAnalysisRecords({seasonId: 'coastal-clash-2024-2025', phase: 'Playoffs', teamName: 'Dark Knights'});
  assert.ok(darkKnights.length > 0);
  assert.ok(darkKnights.every((record) => record.venueSide === 'Home'));

  const championship = getHistoricalAnalysisRecords({seasonId: 'coastal-clash-2024-2025', phase: 'Playoffs'})
    .filter((record) => record.eventId === '2025-playoffs-championship');
  assert.equal(championship.length, 32);
  assert.ok(championship.every((record) => record.eventName === 'April 2025 Championship'));
  assert.ok(championship.some((record) => record.player.teamName === 'Cougar Country' && record.venueSide === 'Away'));
  assert.ok(championship.some((record) => record.player.teamName === 'Dark Knights' && record.venueSide === 'Home'));
});

test('historical analysis archive keeps its filter interface', () => {
  const archive = getHistoricalAnalysisArchive();
  assert.equal(archive.manifests.length, 2);
  assert.equal(archive.records.length, 100);

  const alexKarp = getHistoricalAnalysisRecords({seasonId: 'coastal-clash-2024-2025', phase: 'Playoffs', playerName: 'Alex Karp'});
  assert.equal(alexKarp.length, 2);
  assert.ok(alexKarp.every((record) => record.player.teamName === 'Dark Knights'));
});
