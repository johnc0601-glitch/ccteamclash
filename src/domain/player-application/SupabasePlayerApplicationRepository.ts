import type {SupabaseClient} from '@supabase/supabase-js';
import type {
  PlayerApplication,
  ReviewPlayerApplicationStatus,
  SubmitPlayerApplicationInput,
} from '@/domain/player-application/PlayerApplication';
import type {PlayerApplicationRepository} from '@/domain/player-application/PlayerApplicationRepository';
import type {Database} from '@/lib/supabase/database';

export type PlayerApplicationRow = {
  id: string;
  profile_id: string;
  season_id: string;
  requested_team_id: string;
  player_type: string;
  gender: string;
  played_before: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type PlayerApplicationDatabase = {
  public: {
    Tables: {
      launch_player_applications: {
        Row: PlayerApplicationRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_launch_player_application: {
        Args: {
          target_season_id: string;
          target_requested_team_id: string;
          target_player_type: string;
          target_gender: string;
          target_played_before: boolean;
        };
        Returns: string;
      };
      change_launch_player_application_requested_team: {
        Args: {target_application_id: string; target_requested_team_id: string};
        Returns: string;
      };
      cancel_launch_player_application: {
        Args: {target_application_id: string};
        Returns: string;
      };
      review_launch_player_application: {
        Args: {target_application_id: string; target_status: string};
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export class SupabasePlayerApplicationRepository implements PlayerApplicationRepository {
  private readonly applicationClient: SupabaseClient<PlayerApplicationDatabase>;

  constructor(supabase: SupabaseClient<Database>) {
    this.applicationClient = supabase as unknown as SupabaseClient<PlayerApplicationDatabase>;
  }

  async listApplications(seasonId?: string): Promise<PlayerApplication[]> {
    let query = this.applicationClient
      .from('launch_player_applications')
      .select('*')
      .order('created_at', {ascending: false});
    if (seasonId) query = query.eq('season_id', seasonId);
    const {data, error} = await query;
    if (error) throw error;
    return data.map(toPlayerApplication);
  }

  async getApplication(applicationId: string): Promise<PlayerApplication | undefined> {
    const {data, error} = await this.applicationClient
      .from('launch_player_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();
    if (error) throw error;
    return data ? toPlayerApplication(data) : undefined;
  }

  async submitApplication(input: SubmitPlayerApplicationInput): Promise<PlayerApplication> {
    const {data, error} = await this.applicationClient.rpc('submit_launch_player_application', {
      target_season_id: input.seasonId,
      target_requested_team_id: input.requestedTeamId,
      target_player_type: input.playerType,
      target_gender: input.gender,
      target_played_before: input.playedBefore,
    });
    if (error) throw error;
    return this.requireApplication(data);
  }

  async changeRequestedTeam(
    applicationId: string,
    requestedTeamId: string,
  ): Promise<PlayerApplication> {
    const {data, error} = await this.applicationClient.rpc(
      'change_launch_player_application_requested_team',
      {target_application_id: applicationId, target_requested_team_id: requestedTeamId},
    );
    if (error) throw error;
    return this.requireApplication(data);
  }

  async cancelApplication(applicationId: string): Promise<PlayerApplication> {
    const {data, error} = await this.applicationClient.rpc('cancel_launch_player_application', {
      target_application_id: applicationId,
    });
    if (error) throw error;
    return this.requireApplication(data);
  }

  async reviewApplication(
    applicationId: string,
    status: ReviewPlayerApplicationStatus,
  ): Promise<PlayerApplication> {
    const {data, error} = await this.applicationClient.rpc('review_launch_player_application', {
      target_application_id: applicationId,
      target_status: status,
    });
    if (error) throw error;
    return this.requireApplication(data);
  }

  private async requireApplication(applicationId: string): Promise<PlayerApplication> {
    const application = await this.getApplication(applicationId);
    if (!application) throw new Error('Player application was not returned after the operation.');
    return application;
  }
}

export function toPlayerApplication(row: PlayerApplicationRow): PlayerApplication {
  return {
    id: row.id,
    profileId: row.profile_id,
    seasonId: row.season_id,
    requestedTeamId: row.requested_team_id,
    playerType: row.player_type as PlayerApplication['playerType'],
    gender: row.gender as PlayerApplication['gender'],
    playedBefore: row.played_before,
    status: row.status as PlayerApplication['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}
