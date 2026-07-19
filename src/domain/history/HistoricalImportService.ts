import type {HistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import type {
  HistoricalImportPreview,
  HistoricalImportResult,
  HistoricalPlayerRecord,
  HistoricalPlayerRecordInput,
  HistoricalRecordTotals,
  HistoricalTeamRecord,
  HistoricalTeamRecordInput,
} from '@/domain/history/HistoricalRecord';

type HistoricalImportOverview = {
  previews: HistoricalImportPreview[];
  appliedResult: HistoricalImportResult | undefined;
  totals: {
    seasons: number;
    teams: number;
    players: number;
  };
};

export class HistoricalImportService {
  private readonly repository: HistoricalImportRepository;

  constructor(repository: HistoricalImportRepository) {
    this.repository = repository;
  }

  async getOverview(): Promise<HistoricalImportOverview> {
    const [sources, appliedResult] = await Promise.all([
      this.repository.getSources(),
      this.repository.getAppliedResult(),
    ]);
    const previews = sources.map((source) => ({
      source,
      status: appliedResult ? 'Applied' as const : 'Ready' as const,
      teamCount: source.teamRecords.length,
      playerCount: source.playerRecords.length,
      warnings: this.getWarnings(source.playerRecords),
      teamRecords: source.teamRecords.map((record) => this.toTeamRecord(record)),
      playerRecords: source.playerRecords.map((record) => this.toPlayerRecord(record)),
    }));

    return {
      previews,
      appliedResult,
      totals: {
        seasons: previews.length,
        teams: previews.reduce((total, preview) => total + preview.teamCount, 0),
        players: previews.reduce((total, preview) => total + preview.playerCount, 0),
      },
    };
  }

  async applyHistoricalRecords(): Promise<HistoricalImportResult> {
    const sources = await this.repository.getSources();
    const result: HistoricalImportResult = {
      status: 'Applied',
      appliedAt: new Date().toISOString(),
      seasonsApplied: sources.length,
      teamRecordsApplied: sources.reduce((total, source) => total + source.teamRecords.length, 0),
      playerRecordsApplied: sources.reduce((total, source) => total + source.playerRecords.length, 0),
    };
    return this.repository.saveAppliedResult(result);
  }

  calculateRecord(record: HistoricalRecordTotals): HistoricalRecordTotals {
    return {
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      matchesPlayed: record.wins + record.losses + record.ties,
    };
  }

  calculateWinPercentage(record: HistoricalRecordTotals): number {
    if (record.matchesPlayed === 0) return 0;
    return (record.wins + record.ties * 0.5) / record.matchesPlayed;
  }

  private toTeamRecord(record: HistoricalTeamRecordInput): HistoricalTeamRecord {
    return {
      ...record,
      pointsPercentage: record.pointsAvailable ? record.pointsEarned / record.pointsAvailable : 0,
    };
  }

  private toPlayerRecord(record: HistoricalPlayerRecordInput): HistoricalPlayerRecord {
    const singles = this.calculateRecord(record.singles);
    const doubles = this.calculateRecord(record.doubles);
    const overall = this.calculateRecord({
      wins: singles.wins + doubles.wins,
      losses: singles.losses + doubles.losses,
      ties: singles.ties + doubles.ties,
      matchesPlayed: 0,
    });

    return {
      ...record,
      singles,
      doubles,
      overall,
      singlesWinPercentage: this.calculateWinPercentage(singles),
      doublesWinPercentage: this.calculateWinPercentage(doubles),
      overallWinPercentage: this.calculateWinPercentage(overall),
    };
  }

  private getWarnings(records: HistoricalPlayerRecordInput[]): string[] {
    const missingPdgaCount = records.filter((record) => !record.pdgaNumber).length;
    const warnings = [
      'Actual match scores are ignored for this import.',
      'Player win percentages are calculated from singles and doubles records.',
    ];
    if (missingPdgaCount > 0) {
      warnings.push(`${missingPdgaCount} players do not have PDGA numbers in the historical record sheets.`);
    }
    return warnings;
  }
}
