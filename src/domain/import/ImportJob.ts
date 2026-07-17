import type {MatchStatus} from '@/domain/schedule/Match';

export const IMPORT_STATUSES = [
  'Pending',
  'Validating',
  'Ready',
  'Applied',
  'Failed',
  'Cancelled',
] as const;

export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export type ImportStatusFilter = 'all' | ImportStatus;

export type ImportChallenge = {
  id: string;
  seasonId: string;
  scheduleId: string;
  scheduleName: string;
  roundId: string;
  roundName: string;
  roundNumber: number;
  date: string;
  time: string;
  homeTeamId: string;
  awayTeamId: string;
  courseId: string;
  status: MatchStatus;
};

export type ImportJobSummary = {
  challengeId: string;
  challengeLabel: string;
  seasonName: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  importedBy: string;
  expectedUpdates: string[];
  recordsFound: number;
  recordsApplied: number;
};

export type ImportJob = {
  id: string;
  seasonId: string;
  filename: string;
  source: string;
  status: ImportStatus;
  createdAt: string;
  completedAt: string;
  errors: string[];
  warnings: string[];
  summary: ImportJobSummary;
};

export type ImportJobInput = {
  seasonId: string;
  challengeId: string;
  homeTeamId: string;
  awayTeamId: string;
  filename: string;
  source: string;
  importedBy: string;
};

export type ImportQuery = {
  search: string;
  seasonId: string;
  status: ImportStatusFilter;
};

export type ImportFieldErrors = Partial<Record<keyof ImportJobInput, string>>;

export type ImportServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: ImportFieldErrors};

