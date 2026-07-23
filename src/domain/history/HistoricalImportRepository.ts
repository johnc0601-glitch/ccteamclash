import {HISTORICAL_RECORD_SOURCES} from '@/data/historicalRecords';
import type {
  HistoricalImportResult,
  HistoricalSeasonImportSource,
} from '@/domain/history/HistoricalRecord';

export interface HistoricalImportRepository {
  getSources(): Promise<HistoricalSeasonImportSource[]>;
  getAppliedResult(): Promise<HistoricalImportResult | undefined>;
  saveAppliedResult(result: HistoricalImportResult): Promise<HistoricalImportResult>;
}

function cloneSource(source: HistoricalSeasonImportSource): HistoricalSeasonImportSource {
  return {
    ...source,
    teamRecords: source.teamRecords.map((record) => ({...record})),
    playerRecords: source.playerRecords.map((record) => ({
      ...record,
      singles: {...record.singles},
      doubles: {...record.doubles},
    })),
  };
}

export class MockHistoricalImportRepository implements HistoricalImportRepository {
  private readonly sources = HISTORICAL_RECORD_SOURCES.map(cloneSource);
  private appliedResult: HistoricalImportResult | undefined;

  async getSources(): Promise<HistoricalSeasonImportSource[]> {
    return this.sources.map(cloneSource);
  }

  async getAppliedResult(): Promise<HistoricalImportResult | undefined> {
    return this.appliedResult ? {...this.appliedResult} : undefined;
  }

  async saveAppliedResult(result: HistoricalImportResult): Promise<HistoricalImportResult> {
    this.appliedResult = {...result};
    return {...this.appliedResult};
  }
}
