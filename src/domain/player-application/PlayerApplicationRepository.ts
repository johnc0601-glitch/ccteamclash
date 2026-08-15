import type {
  PlayerApplication,
  ReviewPlayerApplicationStatus,
  SubmitPlayerApplicationInput,
} from '@/domain/player-application/PlayerApplication';

export interface PlayerApplicationRepository {
  listApplications(seasonId?: string): Promise<PlayerApplication[]>;
  getApplication(applicationId: string): Promise<PlayerApplication | undefined>;
  submitApplication(input: SubmitPlayerApplicationInput): Promise<PlayerApplication>;
  changeRequestedTeam(applicationId: string, requestedTeamId: string): Promise<PlayerApplication>;
  cancelApplication(applicationId: string): Promise<PlayerApplication>;
  reviewApplication(
    applicationId: string,
    status: ReviewPlayerApplicationStatus,
  ): Promise<PlayerApplication>;
}
