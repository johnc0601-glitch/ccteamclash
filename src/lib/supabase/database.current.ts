import type {Database as LegacyDatabase} from './database';

type LegacyPublic = LegacyDatabase['public'];

type LaunchPlayerApplicationsTable = {
  Row: {
    created_at: string;
    gender: string;
    id: string;
    played_before: boolean;
    player_type: string;
    profile_id: string;
    requested_team_id: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    season_id: string;
    status: string;
    updated_at: string;
  };
  Insert: {
    created_at?: string;
    gender: string;
    id?: string;
    played_before: boolean;
    player_type: string;
    profile_id: string;
    requested_team_id: string;
    reviewed_at?: string | null;
    reviewed_by?: string | null;
    season_id: string;
    status?: string;
    updated_at?: string;
  };
  Update: {
    created_at?: string;
    gender?: string;
    id?: string;
    played_before?: boolean;
    player_type?: string;
    profile_id?: string;
    requested_team_id?: string;
    reviewed_at?: string | null;
    reviewed_by?: string | null;
    season_id?: string;
    status?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'launch_player_applications_profile_id_fkey';
      columns: ['profile_id'];
      isOneToOne: false;
      referencedRelation: 'launch_profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'launch_player_applications_reviewed_by_fkey';
      columns: ['reviewed_by'];
      isOneToOne: false;
      referencedRelation: 'launch_profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'launch_player_applications_season_id_fkey';
      columns: ['season_id'];
      isOneToOne: false;
      referencedRelation: 'launch_seasons';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'launch_player_applications_season_id_requested_team_id_fkey';
      columns: ['season_id', 'requested_team_id'];
      isOneToOne: false;
      referencedRelation: 'launch_season_teams';
      referencedColumns: ['season_id', 'team_id'];
    },
  ];
};

type LaunchSeasonTeamsTable = {
  Row: {
    added_by: string;
    created_at: string;
    id: string;
    season_id: string;
    team_id: string;
  };
  Insert: {
    added_by: string;
    created_at?: string;
    id?: string;
    season_id: string;
    team_id: string;
  };
  Update: {
    added_by?: string;
    created_at?: string;
    id?: string;
    season_id?: string;
    team_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'launch_season_teams_added_by_fkey';
      columns: ['added_by'];
      isOneToOne: false;
      referencedRelation: 'launch_profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'launch_season_teams_season_id_fkey';
      columns: ['season_id'];
      isOneToOne: false;
      referencedRelation: 'launch_seasons';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'launch_season_teams_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'launch_teams';
      referencedColumns: ['id'];
    },
  ];
};

type LaunchSeasonRosterMembershipsTable = {
  Row: {
    added_at: string;
    added_by: string;
    created_at: string;
    dropped_at: string | null;
    dropped_by: string | null;
    id: string;
    player_id: string;
    roster_category: string;
    season_id: string;
    status: string;
    team_id: string;
    updated_at: string;
  };
  Insert: {
    added_at?: string;
    added_by: string;
    created_at?: string;
    dropped_at?: string | null;
    dropped_by?: string | null;
    id?: string;
    player_id: string;
    roster_category: string;
    season_id: string;
    status?: string;
    team_id: string;
    updated_at?: string;
  };
  Update: {
    added_at?: string;
    added_by?: string;
    created_at?: string;
    dropped_at?: string | null;
    dropped_by?: string | null;
    id?: string;
    player_id?: string;
    roster_category?: string;
    season_id?: string;
    status?: string;
    team_id?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'launch_season_roster_memberships_added_by_fkey';
      columns: ['added_by'];
      isOneToOne: false;
      referencedRelation: 'launch_profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'launch_season_roster_memberships_dropped_by_fkey';
      columns: ['dropped_by'];
      isOneToOne: false;
      referencedRelation: 'launch_profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'launch_season_roster_memberships_player_id_fkey';
      columns: ['player_id'];
      isOneToOne: false;
      referencedRelation: 'launch_players';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'launch_season_roster_memberships_season_id_team_id_fkey';
      columns: ['season_id', 'team_id'];
      isOneToOne: false;
      referencedRelation: 'launch_season_teams';
      referencedColumns: ['season_id', 'team_id'];
    },
  ];
};

type CurrentFunctions = {
  add_launch_season_roster_member: {
    Args: {
      target_player_id: string;
      target_roster_category: string;
      target_season_id: string;
      target_team_id: string;
    };
    Returns: string;
  };
  cancel_launch_player_application: {
    Args: {target_application_id: string};
    Returns: string;
  };
  captain_review_launch_player_application: {
    Args: {target_application_id: string};
    Returns: string;
  };
  change_launch_player_application_requested_team: {
    Args: {target_application_id: string; target_requested_team_id: string};
    Returns: string;
  };
  commissioner_delete_launch_account: {
    Args: {target_profile_id: string};
    Returns: string;
  };
  review_launch_player_application: {
    Args: {target_application_id: string; target_status: string};
    Returns: string;
  };
  submit_launch_player_application: {
    Args: {
      target_gender: string;
      target_played_before: boolean;
      target_player_type: string;
      target_requested_team_id: string;
      target_season_id: string;
    };
    Returns: string;
  };
};

export type Database = Omit<LegacyDatabase, 'public'> & {
  public: Omit<LegacyPublic, 'Tables' | 'Functions'> & {
    Tables: LegacyPublic['Tables'] & {
      launch_player_applications: LaunchPlayerApplicationsTable;
      launch_season_roster_memberships: LaunchSeasonRosterMembershipsTable;
      launch_season_teams: LaunchSeasonTeamsTable;
    };
    Functions: CurrentFunctions;
  };
};
