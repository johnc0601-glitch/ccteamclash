import type {SupabaseClient} from '@supabase/supabase-js';
import type {
  AddSeasonRosterMembershipInput,
  DropSeasonRosterMembershipInput,
  SeasonRosterCaps,
  SeasonRosterMembership,
  SeasonTeam,
} from '@/domain/season-roster/SeasonRosterMembership';
import type {SeasonRosterRepository} from '@/domain/season-roster/SeasonRosterRepository';
import type {Database} from '@/lib/supabase/database';

type SeasonTeamRow = {
  id: string;
  season_id: string;
  team_id: string;
  added_by: string;
  created_at: string;
};

type MembershipRow = {
  id: string;
  season_id: string;
  team_id: string;
  player_id: string;
  roster_category: string;
  status: string;
  added_by: string;
  added_at: string;
  dropped_by: string | null;
  dropped_at: string | null;
  created_at: string;
  updated_at: string;
};

type SeasonRosterDatabase = {
  public: {
    Tables: {
      launch_season_teams: {
        Row: SeasonTeamRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      launch_season_roster_memberships: {
        Row: MembershipRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_launch_season_roster_member: {
        Args: {
          target_season_id: string;
          target_team_id: string;
          target_player_id: string;
          target_roster_category: string;
        };
        Returns: string;
      };
      drop_launch_season_roster_member: {
        Args: {target_season_id: string; target_player_id: string};
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export class SupabaseSeasonRosterRepository implements SeasonRosterRepository {
  private readonly rosterClient: SupabaseClient<SeasonRosterDatabase>;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.rosterClient = supabase as unknown as SupabaseClient<SeasonRosterDatabase>;
  }

  async listSeasonTeams(seasonId: string): Promise<SeasonTeam[]> {
    const {data, error} = await this.rosterClient
      .from('launch_season_teams')
      .select('*')
      .eq('season_id', seasonId)
      .order('team_id');
    if (error) throw error;
    return data.map(toSeasonTeam);
  }

  async listMemberships(seasonId: string): Promise<SeasonRosterMembership[]> {
    const {data, error} = await this.rosterClient
      .from('launch_season_roster_memberships')
      .select('*')
      .eq('season_id', seasonId)
      .order('team_id')
      .order('roster_category')
      .order('player_id');
    if (error) throw error;
    return data.map(toMembership);
  }

  async getRosterCaps(seasonId: string): Promise<SeasonRosterCaps | undefined> {
    const {data, error} = await this.supabase
      .from('launch_seasons')
      .select('mens_roster_cap,womens_roster_cap,junior_roster_cap')
      .eq('id', seasonId)
      .maybeSingle();
    if (error) throw error;
    return data ? {
      Men: data.mens_roster_cap,
      Women: data.womens_roster_cap,
      Junior: data.junior_roster_cap,
    } : undefined;
  }

  async addMembership(input: AddSeasonRosterMembershipInput): Promise<SeasonRosterMembership> {
    const {data: membershipId, error} = await this.rosterClient.rpc(
      'add_launch_season_roster_member',
      {
        target_season_id: input.seasonId,
        target_team_id: input.teamId,
        target_player_id: input.playerId,
        target_roster_category: input.rosterCategory,
      },
    );
    if (error) throw error;
    return this.getMembershipById(membershipId);
  }

  async dropMembership(input: DropSeasonRosterMembershipInput): Promise<SeasonRosterMembership> {
    const {data: membershipId, error} = await this.rosterClient.rpc(
      'drop_launch_season_roster_member',
      {target_season_id: input.seasonId, target_player_id: input.playerId},
    );
    if (error) throw error;
    return this.getMembershipById(membershipId);
  }

  private async getMembershipById(id: string): Promise<SeasonRosterMembership> {
    const {data, error} = await this.rosterClient
      .from('launch_season_roster_memberships')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return toMembership(data);
  }
}

export function toSeasonTeam(row: SeasonTeamRow): SeasonTeam {
  return {
    id: row.id,
    seasonId: row.season_id,
    teamId: row.team_id,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export function toMembership(row: MembershipRow): SeasonRosterMembership {
  return {
    id: row.id,
    seasonId: row.season_id,
    teamId: row.team_id,
    playerId: row.player_id,
    rosterCategory: row.roster_category as SeasonRosterMembership['rosterCategory'],
    status: row.status as SeasonRosterMembership['status'],
    addedBy: row.added_by,
    addedAt: row.added_at,
    droppedBy: row.dropped_by,
    droppedAt: row.dropped_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
