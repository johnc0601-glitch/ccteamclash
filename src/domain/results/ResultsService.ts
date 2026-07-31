import type {
  MatchResult,
  MatchResultInput,
  ResultsFieldErrors,
  ResultsServiceResult,
} from '@/domain/results/MatchResult';
import type {ResultsRepository} from '@/domain/results/ResultsRepository';
import type {ScheduleRepository} from '@/domain/schedule/ScheduleRepository';

export class ResultsService {
  constructor(
    private readonly repository: ResultsRepository,
    private readonly scheduleRepository: ScheduleRepository,
  ) {}

  async getResults(): Promise<MatchResult[]> {
    return this.repository.getAll();
  }

  async getResult(matchId: string): Promise<MatchResult | undefined> {
    return this.repository.getByMatchId(matchId);
  }

  async getPublishedResult(matchId: string): Promise<MatchResult | undefined> {
    const result = await this.repository.getByMatchId(matchId);
    return result?.status === 'Published' ? result : undefined;
  }

  async getPublishedResults(): Promise<MatchResult[]> {
    return (await this.repository.getAll())
      .filter((result) => result.status === 'Published');
  }

  async saveDraft(
    matchId: string,
    input: MatchResultInput,
  ): Promise<ResultsServiceResult<MatchResult>> {
    const match = await this.scheduleRepository.getMatch(matchId);
    if (!match) return this.matchNotFound();
    if (!match.homeTeamId || !match.awayTeamId) return this.teamsNotAssigned();
    const existing = await this.repository.getByMatchId(matchId);
    if (existing?.status === 'Published') return this.publishedLock();
    const fieldErrors = this.validateScores(input, false);
    if (Object.keys(fieldErrors).length) return this.validationFailure(fieldErrors);
    const now = new Date().toISOString();
    return {
      ok: true,
      data: await this.repository.save({
        matchId,
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        status: 'Draft',
        publishedAt: null,
        reopenedAt: existing?.reopenedAt ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }),
    };
  }

  async publish(
    matchId: string,
    input: MatchResultInput,
  ): Promise<ResultsServiceResult<MatchResult>> {
    const match = await this.scheduleRepository.getMatch(matchId);
    if (!match) return this.matchNotFound();
    if (!match.homeTeamId || !match.awayTeamId) return this.teamsNotAssigned();
    const existing = await this.repository.getByMatchId(matchId);
    if (existing?.status === 'Published') {
      return {ok: false, message: 'A published result already exists for this match.'};
    }
    const fieldErrors = this.validateScores(input, true);
    if (Object.keys(fieldErrors).length) return this.validationFailure(fieldErrors);
    const now = new Date().toISOString();
    return {
      ok: true,
      data: await this.repository.save({
        matchId,
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        status: 'Published',
        publishedAt: now,
        reopenedAt: existing?.reopenedAt ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }),
    };
  }

  async reopen(matchId: string): Promise<ResultsServiceResult<MatchResult>> {
    if (!await this.scheduleRepository.getMatch(matchId)) return this.matchNotFound();
    const existing = await this.repository.getByMatchId(matchId);
    if (!existing) return {ok: false, message: 'Result not found.'};
    if (existing.status !== 'Published') return {ok: false, message: 'This result is already a draft.'};
    const now = new Date().toISOString();
    return {
      ok: true,
      data: await this.repository.save({
        ...existing,
        status: 'Draft',
        publishedAt: null,
        reopenedAt: now,
        updatedAt: now,
      }),
    };
  }

  private validateScores(input: MatchResultInput, requireComplete: boolean): ResultsFieldErrors {
    const errors: ResultsFieldErrors = {};
    for (const field of ['homeScore', 'awayScore'] as const) {
      const value = input[field];
      if (value === null) {
        if (requireComplete) errors[field] = 'A score is required before publishing.';
      } else if (!Number.isInteger(value) || value < 0) {
        errors[field] = 'Enter a non-negative whole number.';
      }
    }
    return errors;
  }

  private validationFailure(fieldErrors: ResultsFieldErrors): ResultsServiceResult<MatchResult> {
    return {ok: false, message: 'Review the highlighted scores.', fieldErrors};
  }

  private matchNotFound(): ResultsServiceResult<MatchResult> {
    return {ok: false, message: 'Scheduled match not found.'};
  }

  private teamsNotAssigned(): ResultsServiceResult<MatchResult> {
    return {ok: false, message: 'Assign both teams before recording a result.'};
  }

  private publishedLock(): ResultsServiceResult<MatchResult> {
    return {ok: false, message: 'Reopen this result before editing it.'};
  }
}
