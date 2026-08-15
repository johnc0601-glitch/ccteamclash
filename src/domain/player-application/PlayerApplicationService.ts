import {
  isPlayerApplicationGender,
  isPlayerApplicationType,
  isReviewPlayerApplicationStatus,
} from '@/domain/player-application/PlayerApplication';
import type {
  PlayerApplication,
  PlayerApplicationServiceResult,
  ReviewPlayerApplicationStatus,
  SubmitPlayerApplicationInput,
} from '@/domain/player-application/PlayerApplication';
import type {PlayerApplicationRepository} from '@/domain/player-application/PlayerApplicationRepository';

export class PlayerApplicationService {
  constructor(private readonly repository: PlayerApplicationRepository) {}

  async listApplications(seasonId?: string): Promise<PlayerApplication[]> {
    return this.repository.listApplications(seasonId === undefined
      ? undefined
      : requireId(seasonId, 'Season'));
  }

  async getApplication(applicationId: string): Promise<PlayerApplication | undefined> {
    return this.repository.getApplication(requireId(applicationId, 'Application'));
  }

  async submitApplication(
    input: SubmitPlayerApplicationInput,
  ): Promise<PlayerApplicationServiceResult<PlayerApplication>> {
    const message = validateSubmission(input);
    if (message) return {ok: false, message};

    return {ok: true, data: await this.repository.submitApplication({
      ...input,
      seasonId: input.seasonId.trim(),
      requestedTeamId: input.requestedTeamId.trim(),
    })};
  }

  async changeRequestedTeam(
    applicationId: string,
    requestedTeamId: string,
  ): Promise<PlayerApplicationServiceResult<PlayerApplication>> {
    const resolvedApplicationId = applicationId.trim();
    const resolvedTeamId = requestedTeamId.trim();
    if (!resolvedApplicationId) return {ok: false, message: 'Application is required.'};
    if (!resolvedTeamId) return {ok: false, message: 'Choose a requested team.'};

    return {
      ok: true,
      data: await this.repository.changeRequestedTeam(resolvedApplicationId, resolvedTeamId),
    };
  }

  async cancelApplication(
    applicationId: string,
  ): Promise<PlayerApplicationServiceResult<PlayerApplication>> {
    const resolvedApplicationId = applicationId.trim();
    if (!resolvedApplicationId) return {ok: false, message: 'Application is required.'};
    return {ok: true, data: await this.repository.cancelApplication(resolvedApplicationId)};
  }

  async reviewApplication(
    applicationId: string,
    status: ReviewPlayerApplicationStatus,
  ): Promise<PlayerApplicationServiceResult<PlayerApplication>> {
    const resolvedApplicationId = applicationId.trim();
    if (!resolvedApplicationId) return {ok: false, message: 'Application is required.'};
    if (!isReviewPlayerApplicationStatus(status)) {
      return {ok: false, message: 'Choose Approved or Rejected.'};
    }
    return {
      ok: true,
      data: await this.repository.reviewApplication(resolvedApplicationId, status),
    };
  }
}

function validateSubmission(input: SubmitPlayerApplicationInput): string | undefined {
  if (!input.seasonId.trim()) return 'Choose a season.';
  if (!input.requestedTeamId.trim()) return 'Choose a requested team.';
  if (!isPlayerApplicationType(input.playerType)) return 'Choose Adult or Junior.';
  if (!isPlayerApplicationGender(input.gender)) return 'Choose Male or Female.';
  if (typeof input.playedBefore !== 'boolean') return 'Choose whether you played before.';
  return undefined;
}

function requireId(value: string, label: string): string {
  const resolved = value.trim();
  if (!resolved) throw new Error(`${label} is required.`);
  return resolved;
}
