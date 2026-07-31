import type {
  MatchResult,
  MatchResultInput,
  ResultContestInput,
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

  async getContests(matchId: string) {
    return this.repository.getContests(matchId);
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
    Object.assign(fieldErrors, this.validateContests(input.contests, false, match.homeTeamId, match.awayTeamId));
    if (Object.keys(fieldErrors).length) return this.validationFailure(fieldErrors);
    const now = new Date().toISOString();
    const saved = await this.repository.save({
      matchId,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      status: 'Draft',
      publishedAt: null,
      reopenedAt: existing?.reopenedAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    if (input.contests) await this.repository.replaceContests(matchId, input.contests);
    return {
      ok: true,
      data: saved,
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
    const contests = input.contests ?? await this.repository.getContests(matchId);
    Object.assign(fieldErrors, this.validateContests(contests, true, match.homeTeamId, match.awayTeamId));
    if (Object.keys(fieldErrors).length) return this.validationFailure(fieldErrors);
    const now = new Date().toISOString();
    if (input.contests) {
      if (!existing) {
        await this.repository.save({
          matchId,
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          status: 'Draft',
          publishedAt: null,
          reopenedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      }
      await this.repository.replaceContests(matchId, input.contests);
    }
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

  private validateContests(
    contests: ResultContestInput[] | undefined,
    requireComplete: boolean,
    homeTeamId: string,
    awayTeamId: string,
  ): ResultsFieldErrors {
    if (!contests) return {};
    const ids = new Set<string>();
    const positions = new Set<string>();
    for (const contest of contests) {
      const key = `${contest.format}:${contest.position}`;
      if (!contest.id || ids.has(contest.id) || positions.has(key) || contest.position < 1) {
        return {contests: 'Each player contest needs a unique format and position.'};
      }
      ids.add(contest.id);
      positions.add(key);
      if (!this.outcomesAreComplementary(contest.homeOutcome, contest.awayOutcome)) {
        return {contests: 'Home and away contest outcomes must agree.'};
      }
      if (contest.format === 'Singles') {
        const scoresPresent = contest.homeScore !== null && contest.awayScore !== null;
        if (requireComplete && !scoresPresent) return {contests: 'Enter both singles scores before publishing.'};
        if ((contest.homeScore === null) !== (contest.awayScore === null)) {
          return {contests: 'Enter both singles scores or leave both blank.'};
        }
        if (scoresPresent && (!this.validScore(contest.homeScore!) || !this.validScore(contest.awayScore!))) {
          return {contests: 'Singles scores must be non-negative whole numbers.'};
        }
        if (scoresPresent && this.outcomeFromScores(contest.homeScore!, contest.awayScore!) !== contest.homeOutcome) {
          return {contests: 'Singles outcome must match the entered scores.'};
        }
      } else if (contest.homeScore !== null || contest.awayScore !== null) {
        return {contests: 'Doubles contests use W/L/T only.'};
      }
      const expectedPlayers = contest.format === 'Singles' ? 2 : 4;
      if (contest.players.length !== expectedPlayers) {
        return {contests: `${contest.format} contests require ${expectedPlayers} players.`};
      }
      const playerIds = new Set(contest.players.map((player) => player.playerId));
      if (playerIds.size !== expectedPlayers || playerIds.has('')) {
        return {contests: 'Select every contest player once.'};
      }
      const slots = new Set(contest.players.map((player) => `${player.side}:${player.slot}`));
      if (slots.size !== expectedPlayers || contest.players.some((player) =>
        player.teamId !== (player.side === 'Home' ? homeTeamId : awayTeamId))) {
        return {contests: 'Contest players must use the scheduled home and away teams.'};
      }
    }
    return {};
  }

  private outcomesAreComplementary(home: string, away: string): boolean {
    return (home === 'W' && away === 'L') || (home === 'L' && away === 'W') || (home === 'T' && away === 'T');
  }

  private validScore(value: number): boolean {
    return Number.isInteger(value) && value >= 0;
  }

  private outcomeFromScores(home: number, away: number): 'W' | 'L' | 'T' {
    return home > away ? 'W' : home < away ? 'L' : 'T';
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
