import type {
  HistoricalImportRepository,
} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import type {
  HistoricalImportResult,
  HistoricalSeasonImportSource,
} from '@/domain/history/HistoricalRecord';
import assert from 'node:assert/strict';
import test from 'node:test';

class TestHistoricalImportRepository implements HistoricalImportRepository {
  appliedResult: HistoricalImportResult | undefined;
  private readonly sources: HistoricalSeasonImportSource[];

  constructor(sources: HistoricalSeasonImportSource[]) {
    this.sources = sources;
  }

  async getSources() {
    return this.sources;
  }

  async getAppliedResult() {
    return this.appliedResult;
  }

  async saveAppliedResult(result: HistoricalImportResult) {
    this.appliedResult = result;
    return result;
  }
}

const source: HistoricalSeasonImportSource = {
  id: 'season-1',
  name: 'Season 1',
  sourceFilename: 'source.xlsx',
  teamRecords: [
    {
      id: 'team-1',
      seasonId: 'season-1',
      teamName: 'Dark Knights',
      wins: 3,
      losses: 1,
      ties: 0,
      matchesPlayed: 4,
      pointsEarned: 75,
      pointsAvailable: 100,
    },
  ],
  playerRecords: [
    {
      id: 'player-1',
      seasonId: 'season-1',
      teamName: 'Dark Knights',
      playerName: 'Test Player',
      pdgaNumber: '',
      pdgaRating: null,
      singles: {wins: 2, losses: 1, ties: 0, matchesPlayed: 3},
      doubles: {wins: 1, losses: 0, ties: 1, matchesPlayed: 2},
    },
  ],
};

test('HistoricalImportService calculates player overall records from singles and doubles', async () => {
  const service = new HistoricalImportService(new TestHistoricalImportRepository([source]));
  const overview = await service.getOverview();
  const player = overview.previews[0].playerRecords[0];

  assert.deepEqual(player.singles, {wins: 2, losses: 1, ties: 0, matchesPlayed: 3});
  assert.deepEqual(player.doubles, {wins: 1, losses: 0, ties: 1, matchesPlayed: 2});
  assert.deepEqual(player.overall, {wins: 3, losses: 1, ties: 1, matchesPlayed: 5});
  assert.equal(player.overallWinPercentage, 0.7);
});

test('HistoricalImportService applies all historical summary records', async () => {
  const repository = new TestHistoricalImportRepository([source]);
  const service = new HistoricalImportService(repository);
  const result = await service.applyHistoricalRecords();

  assert.equal(result.status, 'Applied');
  assert.equal(result.seasonsApplied, 1);
  assert.equal(result.teamRecordsApplied, 1);
  assert.equal(result.playerRecordsApplied, 1);
  assert.equal((await service.getOverview()).appliedResult?.status, 'Applied');
});
