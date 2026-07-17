import type {ImportJobSummary, ImportStatus} from '@/domain/import/ImportJob';

export type ImportHistoryAction =
  | 'Created'
  | 'Validated'
  | 'Applied'
  | 'Failed'
  | 'Cancelled';

export type ImportHistory = {
  id: string;
  importJobId: string;
  seasonId: string;
  filename: string;
  source: string;
  status: ImportStatus;
  action: ImportHistoryAction;
  importedBy: string;
  recordedAt: string;
  completedAt: string;
  errors: string[];
  warnings: string[];
  summary: ImportJobSummary;
};

