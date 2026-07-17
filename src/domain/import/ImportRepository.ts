import type {ImportHistory} from '@/domain/import/ImportHistory';
import type {ImportJob} from '@/domain/import/ImportJob';

export interface ImportRepository {
  getAll(): Promise<ImportJob[]>;
  getById(id: string): Promise<ImportJob | undefined>;
  create(job: ImportJob): Promise<ImportJob>;
  update(job: ImportJob): Promise<ImportJob | undefined>;
  getHistory(): Promise<ImportHistory[]>;
  recordHistory(record: ImportHistory): Promise<ImportHistory>;
}

const IMPORT_JOB_MOCK_DATA = [
  {
    id: 'summer-r1-dark-ninjas-import',
    seasonId: 'summer-team-clash-2026',
    filename: 'summer-r1-dark-ninjas.json',
    source: 'Official Scoring Export',
    status: 'Applied',
    createdAt: '2026-07-18T18:10:00.000Z',
    completedAt: '2026-07-18T18:14:00.000Z',
    errors: [],
    warnings: [],
    summary: {
      challengeId: 'summer-2026-r1-dark-ninjas',
      challengeLabel: 'Opening Round: Dark Knights vs Ninjas',
      seasonName: 'Summer Team Clash 2026',
      homeTeamId: 'dark-knights',
      homeTeamName: 'Dark Knights',
      awayTeamId: 'ninjas',
      awayTeamName: 'Ninjas',
      importedBy: 'Commissioner',
      expectedUpdates: [
        'Attach official results to the selected challenge.',
        'Queue standings recalculation for a future module.',
      ],
      recordsFound: 1,
      recordsApplied: 1,
    },
  },
  {
    id: 'summer-r1-chain-bogey-preview',
    seasonId: 'summer-team-clash-2026',
    filename: 'summer-r1-chain-bogey.csv',
    source: 'Official Scoring Export',
    status: 'Ready',
    createdAt: '2026-07-18T19:02:00.000Z',
    completedAt: '',
    errors: [],
    warnings: ['Imported away team differs from the scheduled challenge away team.'],
    summary: {
      challengeId: 'summer-2026-r1-chain-bogey',
      challengeLabel: 'Opening Round: Chain Hawks vs Bogey Men',
      seasonName: 'Summer Team Clash 2026',
      homeTeamId: 'chain-hawks',
      homeTeamName: 'Chain Hawks',
      awayTeamId: 'bogey-men',
      awayTeamName: 'Bogey Men',
      importedBy: 'Commissioner',
      expectedUpdates: [
        'Attach official results to the selected challenge.',
        'Queue standings recalculation for a future module.',
      ],
      recordsFound: 1,
      recordsApplied: 0,
    },
  },
  {
    id: 'spring-opener-failed-import',
    seasonId: 'spring-team-clash-2026',
    filename: 'spring-opener.pdf',
    source: 'Official Scoring Export',
    status: 'Failed',
    createdAt: '2026-02-08T12:30:00.000Z',
    completedAt: '2026-02-08T12:31:00.000Z',
    errors: ['Unsupported file type.'],
    warnings: [],
    summary: {
      challengeId: 'spring-2026-opener',
      challengeLabel: 'Spring Opener: Chain Hawks vs Ninjas',
      seasonName: 'Spring Team Clash 2026',
      homeTeamId: 'chain-hawks',
      homeTeamName: 'Chain Hawks',
      awayTeamId: 'ninjas',
      awayTeamName: 'Ninjas',
      importedBy: 'Commissioner',
      expectedUpdates: [],
      recordsFound: 0,
      recordsApplied: 0,
    },
  },
] as const satisfies readonly ImportJob[];

const IMPORT_HISTORY_MOCK_DATA = IMPORT_JOB_MOCK_DATA.map((job) => ({
  id: `${job.id}-history`,
  importJobId: job.id,
  seasonId: job.seasonId,
  filename: job.filename,
  source: job.source,
  status: job.status,
  action: job.status === 'Applied' ? 'Applied' : job.status === 'Failed' ? 'Failed' : 'Validated',
  importedBy: job.summary.importedBy,
  recordedAt: job.completedAt || job.createdAt,
  completedAt: job.completedAt,
  errors: [...job.errors],
  warnings: [...job.warnings],
  summary: {
    ...job.summary,
    expectedUpdates: [...job.summary.expectedUpdates],
  },
})) satisfies ImportHistory[];

function cloneJob(job: ImportJob): ImportJob {
  return {
    ...job,
    errors: [...job.errors],
    warnings: [...job.warnings],
    summary: {
      ...job.summary,
      expectedUpdates: [...job.summary.expectedUpdates],
    },
  };
}

function cloneHistory(record: ImportHistory): ImportHistory {
  return {
    ...record,
    errors: [...record.errors],
    warnings: [...record.warnings],
    summary: {
      ...record.summary,
      expectedUpdates: [...record.summary.expectedUpdates],
    },
  };
}

export class MockImportRepository implements ImportRepository {
  private jobs: ImportJob[] = IMPORT_JOB_MOCK_DATA.map(cloneJob);
  private history: ImportHistory[] = IMPORT_HISTORY_MOCK_DATA.map(cloneHistory);

  async getAll(): Promise<ImportJob[]> {
    return this.jobs.map(cloneJob);
  }

  async getById(id: string): Promise<ImportJob | undefined> {
    const job = this.jobs.find((candidate) => candidate.id === id);
    return job ? cloneJob(job) : undefined;
  }

  async create(job: ImportJob): Promise<ImportJob> {
    const storedJob = cloneJob(job);
    this.jobs.push(storedJob);
    return cloneJob(storedJob);
  }

  async update(job: ImportJob): Promise<ImportJob | undefined> {
    const index = this.jobs.findIndex((candidate) => candidate.id === job.id);
    if (index === -1) return undefined;

    this.jobs[index] = cloneJob(job);
    return cloneJob(this.jobs[index]);
  }

  async getHistory(): Promise<ImportHistory[]> {
    return this.history.map(cloneHistory);
  }

  async recordHistory(record: ImportHistory): Promise<ImportHistory> {
    const storedRecord = cloneHistory(record);
    this.history.push(storedRecord);
    return cloneHistory(storedRecord);
  }
}
