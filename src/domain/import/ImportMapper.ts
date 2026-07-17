import type {
  ImportJob,
  ImportJobInput,
  ImportJobSummary,
  ImportStatus,
} from '@/domain/import/ImportJob';
import type {ImportHistory, ImportHistoryAction} from '@/domain/import/ImportHistory';

export class ImportMapper {
  normalizeInput(input: ImportJobInput): ImportJobInput {
    return {
      seasonId: input.seasonId.trim(),
      challengeId: input.challengeId.trim(),
      homeTeamId: input.homeTeamId.trim(),
      awayTeamId: input.awayTeamId.trim(),
      filename: input.filename.trim(),
      source: input.source.trim(),
      importedBy: input.importedBy.trim(),
    };
  }

  createEmptySummary(input: ImportJobInput): ImportJobSummary {
    return {
      challengeId: input.challengeId,
      challengeLabel: input.challengeId,
      seasonName: input.seasonId,
      homeTeamId: input.homeTeamId,
      homeTeamName: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      awayTeamName: input.awayTeamId,
      importedBy: input.importedBy,
      expectedUpdates: [],
      recordsFound: 0,
      recordsApplied: 0,
    };
  }

  toNewJob(input: ImportJobInput, id: string, timestamp: string): ImportJob {
    return {
      id,
      seasonId: input.seasonId,
      filename: input.filename,
      source: input.source,
      status: 'Pending',
      createdAt: timestamp,
      completedAt: '',
      errors: [],
      warnings: [],
      summary: this.createEmptySummary(input),
    };
  }

  toUpdatedJob(
    job: ImportJob,
    status: ImportStatus,
    timestamp: string,
    summary: ImportJobSummary,
    errors: string[],
    warnings: string[],
  ): ImportJob {
    return {
      ...job,
      status,
      completedAt: ['Applied', 'Failed', 'Cancelled'].includes(status) ? timestamp : '',
      errors,
      warnings,
      summary,
    };
  }

  toHistoryRecord(
    job: ImportJob,
    action: ImportHistoryAction,
    id: string,
    timestamp: string,
  ): ImportHistory {
    return {
      id,
      importJobId: job.id,
      seasonId: job.seasonId,
      filename: job.filename,
      source: job.source,
      status: job.status,
      action,
      importedBy: job.summary.importedBy,
      recordedAt: timestamp,
      completedAt: job.completedAt,
      errors: [...job.errors],
      warnings: [...job.warnings],
      summary: {
        ...job.summary,
        expectedUpdates: [...job.summary.expectedUpdates],
      },
    };
  }
}

