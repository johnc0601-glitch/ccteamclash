import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HISTORICAL_ANALYSIS_MANIFESTS,
  getHistoricalAnalysisArchive,
  getHistoricalAnalysisRecords,
} from './historicalAnalysisArchive';

test('historical analysis archive tracks incomplete playoff coverage separately', () => {
  assert.equal(HISTORICAL_ANALYSIS_MANIFESTS.length, 2);
  for (const season of HISTORICAL_ANALYSIS_MANIFESTS) {
    assert.equal(season.playoffs, 'Missing');
    assert.ok(season.knownGaps.some((gap) => gap.toLocaleLowerCase().includes('playoff')));
  }
});

test('historical analysis archive can be populated incrementally without changing its interface', () => {
  const archive = getHistoricalAnalysisArchive();
  assert.equal(archive.manifests.length, 2);
  assert.ok(Array.isArray(archive.records));
  assert.deepEqual(getHistoricalAnalysisRecords({phase: 'Playoffs'}), []);
});
