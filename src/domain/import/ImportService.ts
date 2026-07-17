import type {Season} from '@/domain/season/Season';
import type {SeasonService} from '@/domain/season/SeasonService';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';
import type {ScheduleService} from '@/domain/schedule/ScheduleService';
import type {ImportHistory, ImportHistoryAction} from '@/domain/import/ImportHistory';
import type {
  ImportChallenge,
  ImportFieldErrors,
  ImportJob,
  ImportJobInput,
  ImportJobSummary,
  ImportQuery,
  ImportServiceResult,
} from '@/domain/import/ImportJob';
import {ImportMapper} from '@/domain/import/ImportMapper';
import type {ImportRepository} from '@/domain/import/ImportRepository';
import {ImportValidator} from '@/domain/import/ImportValidator';
import type {Team} from '@/models/Team';
import {createSlug} from '@/shared/utils';
import type {TeamService} from '@/services/TeamService';

const DEFAULT_QUERY: ImportQuery = {
  search: '',
  seasonId: 'all',
  status: 'all',
};

export type ImportWorkspace = {
  seasons: Season[];
  teams: Team[];
  challenges: ImportChallenge[];
};

export type ImportPreview = {
  job: ImportJob;
  challenge: ImportChallenge | undefined;
  expectedUpdates: string[];
};

type ImportValidationContext = ImportWorkspace;

function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, {sensitivity: 'base'});
}

export class ImportService {
  private readonly mapper = new ImportMapper();
  private readonly validator = new ImportValidator();

  constructor(
    private readonly repository: ImportRepository,
    private readonly seasonService: SeasonService,
    private readonly teamService: TeamService,
    private readonly scheduleService: ScheduleService,
  ) {}

  async getJobs(query: Partial<ImportQuery> = {}): Promise<ImportJob[]> {
    const resolvedQuery = {...DEFAULT_QUERY, ...query};
    const normalizedSearch = normalizeForComparison(resolvedQuery.search);
    const jobs = await this.repository.getAll();

    return jobs
      .filter((job) => {
        if (resolvedQuery.seasonId !== 'all' && job.seasonId !== resolvedQuery.seasonId) {
          return false;
        }
        if (resolvedQuery.status !== 'all' && job.status !== resolvedQuery.status) {
          return false;
        }
        return true;
      })
      .filter((job) => this.matchesSearch(job, normalizedSearch))
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt) || compareText(left.filename, right.filename),
      );
  }

  async getJob(id: string): Promise<ImportJob | undefined> {
    return this.repository.getById(id);
  }

  async getHistory(query: Partial<ImportQuery> = {}): Promise<ImportHistory[]> {
    const resolvedQuery = {...DEFAULT_QUERY, ...query};
    const normalizedSearch = normalizeForComparison(resolvedQuery.search);
    const history = await this.repository.getHistory();

    return history
      .filter((record) => {
        if (resolvedQuery.seasonId !== 'all' && record.seasonId !== resolvedQuery.seasonId) {
          return false;
        }
        if (resolvedQuery.status !== 'all' && record.status !== resolvedQuery.status) {
          return false;
        }
        return true;
      })
      .filter((record) => [
        record.filename,
        record.source,
        record.importedBy,
        record.status,
        record.action,
        record.summary.challengeLabel,
        record.summary.seasonName,
        record.summary.homeTeamName,
        record.summary.awayTeamName,
      ].some((value) => normalizeForComparison(value).includes(normalizedSearch)))
      .sort((left, right) =>
        right.recordedAt.localeCompare(left.recordedAt) || compareText(left.filename, right.filename),
      );
  }

  async getWorkspace(): Promise<ImportWorkspace> {
    const [seasons, teams, schedules] = await Promise.all([
      this.seasonService.getAll(),
      this.teamService.getAll(),
      this.scheduleService.getSchedules(),
    ]);
    const challengeGroups = await Promise.all(
      schedules.map((schedule) => this.getScheduleChallenges(schedule)),
    );
    return {
      seasons,
      teams,
      challenges: challengeGroups.flat().sort((left, right) =>
        right.date.localeCompare(left.date)
        || left.time.localeCompare(right.time)
        || compareText(left.id, right.id),
      ),
    };
  }

  async createJob(input: ImportJobInput): Promise<ImportServiceResult<ImportJob>> {
    const normalizedInput = this.mapper.normalizeInput(input);
    const fieldErrors = this.validateRequiredUploadFields(normalizedInput);
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const timestamp = new Date().toISOString();
    const job = this.mapper.toNewJob(
      normalizedInput,
      this.createId(normalizedInput.filename, 'import'),
      timestamp,
    );
    const created = await this.repository.create(job);
    await this.recordHistory(created, 'Created', timestamp);
    return {ok: true, data: created};
  }

  async validateJob(id: string): Promise<ImportServiceResult<ImportJob>> {
    const job = await this.repository.getById(id);
    if (!job) return this.notFoundResult();
    if (!['Pending', 'Failed'].includes(job.status)) {
      return {ok: false, message: 'Only pending or failed imports can be validated.'};
    }

    const validatingJob = await this.repository.update({
      ...job,
      status: 'Validating',
      errors: [],
      warnings: [],
      completedAt: '',
    });
    if (!validatingJob) return this.notFoundResult();

    const context = await this.getValidationContext();
    const input = this.jobToInput(validatingJob);
    const validation = this.validator.validateInput(input, context);
    const timestamp = new Date().toISOString();
    const summary = this.buildSummary(input, context);
    const status = validation.errors.length ? 'Failed' : 'Ready';
    const updatedJob = this.mapper.toUpdatedJob(
      validatingJob,
      status,
      timestamp,
      summary,
      validation.errors,
      validation.warnings,
    );
    const storedJob = await this.repository.update(updatedJob);
    if (!storedJob) return this.notFoundResult();

    await this.recordHistory(
      storedJob,
      status === 'Ready' ? 'Validated' : 'Failed',
      timestamp,
    );
    return {ok: true, data: storedJob};
  }

  async getPreview(id: string): Promise<ImportServiceResult<ImportPreview>> {
    const job = await this.repository.getById(id);
    if (!job) return this.notFoundResult();

    const workspace = await this.getWorkspace();
    return {
      ok: true,
      data: {
        job,
        challenge: workspace.challenges.find((challenge) => challenge.id === job.summary.challengeId),
        expectedUpdates: this.getExpectedUpdates(job.status),
      },
    };
  }

  async applyJob(id: string): Promise<ImportServiceResult<ImportJob>> {
    const job = await this.repository.getById(id);
    if (!job) return this.notFoundResult();
    if (job.status !== 'Ready') {
      return {ok: false, message: 'Only validated imports can be applied.'};
    }

    const timestamp = new Date().toISOString();
    const appliedJob = this.mapper.toUpdatedJob(
      job,
      'Applied',
      timestamp,
      {
        ...job.summary,
        expectedUpdates: this.getExpectedUpdates('Applied'),
        recordsApplied: job.summary.recordsFound,
      },
      [],
      job.warnings,
    );
    const storedJob = await this.repository.update(appliedJob);
    if (!storedJob) return this.notFoundResult();

    await this.recordHistory(storedJob, 'Applied', timestamp);
    return {ok: true, data: storedJob};
  }

  async cancelJob(id: string): Promise<ImportServiceResult<ImportJob>> {
    const job = await this.repository.getById(id);
    if (!job) return this.notFoundResult();
    if (!['Pending', 'Validating', 'Ready', 'Failed'].includes(job.status)) {
      return {ok: false, message: 'This import cannot be cancelled.'};
    }

    const timestamp = new Date().toISOString();
    const cancelledJob = this.mapper.toUpdatedJob(
      job,
      'Cancelled',
      timestamp,
      job.summary,
      job.errors,
      job.warnings,
    );
    const storedJob = await this.repository.update(cancelledJob);
    if (!storedJob) return this.notFoundResult();

    await this.recordHistory(storedJob, 'Cancelled', timestamp);
    return {ok: true, data: storedJob};
  }

  private validateRequiredUploadFields(input: ImportJobInput): ImportFieldErrors {
    const fieldErrors: ImportFieldErrors = {};
    if (!input.filename) fieldErrors.filename = 'Choose an import file.';
    if (!input.source) fieldErrors.source = 'Import source is required.';
    if (!input.importedBy) fieldErrors.importedBy = 'Importer name is required.';
    return fieldErrors;
  }

  private async getValidationContext(): Promise<ImportValidationContext> {
    return this.getWorkspace();
  }

  private async getScheduleChallenges(schedule: Schedule): Promise<ImportChallenge[]> {
    const rounds = await this.scheduleService.getRounds(schedule.id);
    const challengeGroups = await Promise.all(
      rounds.map((round) => this.getRoundChallenges(schedule, round)),
    );
    return challengeGroups.flat();
  }

  private async getRoundChallenges(schedule: Schedule, round: Round): Promise<ImportChallenge[]> {
    const matches = await this.scheduleService.getMatches(round.id);
    return matches.map((match) => this.matchToChallenge(schedule, round, match));
  }

  private matchToChallenge(schedule: Schedule, round: Round, match: Match): ImportChallenge {
    return {
      id: match.id,
      seasonId: match.seasonId,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      roundId: round.id,
      roundName: round.name,
      roundNumber: round.number,
      date: match.date,
      time: match.time,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      courseId: match.courseId,
      status: match.status,
    };
  }

  private buildSummary(input: ImportJobInput, context: ImportValidationContext): ImportJobSummary {
    const season = context.seasons.find((candidate) => candidate.id === input.seasonId);
    const challenge = context.challenges.find((candidate) => candidate.id === input.challengeId);
    const homeTeam = context.teams.find((candidate) => candidate.id === input.homeTeamId);
    const awayTeam = context.teams.find((candidate) => candidate.id === input.awayTeamId);
    return {
      challengeId: input.challengeId,
      challengeLabel: challenge ? this.getChallengeLabel(challenge, context.teams) : input.challengeId,
      seasonName: season?.name ?? input.seasonId,
      homeTeamId: input.homeTeamId,
      homeTeamName: homeTeam?.name ?? input.homeTeamId,
      awayTeamId: input.awayTeamId,
      awayTeamName: awayTeam?.name ?? input.awayTeamId,
      importedBy: input.importedBy,
      expectedUpdates: this.getExpectedUpdates('Ready'),
      recordsFound: 1,
      recordsApplied: 0,
    };
  }

  private jobToInput(job: ImportJob): ImportJobInput {
    return {
      seasonId: job.seasonId,
      challengeId: job.summary.challengeId,
      homeTeamId: job.summary.homeTeamId,
      awayTeamId: job.summary.awayTeamId,
      filename: job.filename,
      source: job.source,
      importedBy: job.summary.importedBy,
    };
  }

  private getExpectedUpdates(status: ImportJob['status']): string[] {
    if (status === 'Failed' || status === 'Cancelled') return [];
    return [
      'Attach official results to the selected challenge.',
      'Preserve import warnings and errors in permanent history.',
      'Queue standings and statistics recalculation for future modules.',
    ];
  }

  private getChallengeLabel(challenge: ImportChallenge, teams: Team[]): string {
    const homeTeam = teams.find((team) => team.id === challenge.homeTeamId);
    const awayTeam = teams.find((team) => team.id === challenge.awayTeamId);
    return `${challenge.roundName}: ${homeTeam?.name ?? challenge.homeTeamId} vs ${awayTeam?.name ?? challenge.awayTeamId}`;
  }

  private matchesSearch(job: ImportJob, search: string): boolean {
    if (!search) return true;
    return [
      job.filename,
      job.source,
      job.status,
      job.summary.challengeLabel,
      job.summary.seasonName,
      job.summary.homeTeamName,
      job.summary.awayTeamName,
      job.summary.importedBy,
    ].some((value) => normalizeForComparison(value).includes(search));
  }

  private async recordHistory(
    job: ImportJob,
    action: ImportHistoryAction,
    timestamp: string,
  ): Promise<void> {
    await this.repository.recordHistory(this.mapper.toHistoryRecord(
      job,
      action,
      this.createId(`${job.id}-${action}-${timestamp}`, 'import-history'),
      timestamp,
    ));
  }

  private createId(value: string, fallback: string): string {
    const slug = createSlug(value);
    const uniquePart = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
    return `${slug || fallback}-${uniquePart}`;
  }

  private hasErrors(fieldErrors: ImportFieldErrors): boolean {
    return Object.keys(fieldErrors).length > 0;
  }

  private validationResult<T>(fieldErrors: ImportFieldErrors): ImportServiceResult<T> {
    return {
      ok: false,
      message: 'Review the highlighted import fields.',
      fieldErrors,
    };
  }

  private notFoundResult<T>(): ImportServiceResult<T> {
    return {ok: false, message: 'Import job not found.'};
  }
}
