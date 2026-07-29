export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];

type ProfileRow = {
  id: string;
  user_id: string;
  display_name: string;
  role: 'Player' | 'Captain' | 'Commissioner';
  status: 'Pending' | 'Approved' | 'Suspended' | 'Rejected';
  player_id: string | null;
  captain_team_id: string | null;
  created_at: string;
  updated_at: string;
};

type PlayerClaimRow = {
  id: string;
  profile_id: string;
  requested_player_id: string | null;
  submitted_name: string;
  submitted_pdga_number: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type PlayerRow = {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Unknown';
  pdga_number: string;
  pdga_rating: number | null;
  current_team_id: string | null;
  home_area: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type TeamRow = {
  id: string;
  name: string;
  short_name: string;
  logo: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  season_label: string;
  home_team_id: string;
  away_team_id: string;
  course_name: string;
  directions_url: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Final' | 'Cancelled';
  created_at: string;
  updated_at: string;
};

type EventRosterRow = {
  id: string;
  event_id: string;
  team_id: string;
  submitted_by_profile_id: string | null;
  status: 'Open' | 'Submitted' | 'Locked';
  submitted_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

type EventRosterPlayerRow = {
  id: string;
  event_roster_id: string;
  player_id: string;
  created_at: string;
  updated_at: string;
};

type EventPostRow = {
  id: string;
  event_id: string;
  type: 'Comment' | 'Photo';
  author_name: string;
  body: string;
  image_url: string | null;
  status: 'Visible' | 'Removed';
  created_at: string;
  removed_at: string | null;
  removed_by: string | null;
};

type TableDefinition<Row> = {
  Row: Row;
  Insert: Row;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      launch_profiles: TableDefinition<ProfileRow>;
      launch_player_claims: TableDefinition<PlayerClaimRow>;
      launch_players: TableDefinition<PlayerRow>;
      launch_teams: TableDefinition<TeamRow>;
      launch_events: TableDefinition<EventRow>;
      launch_event_rosters: TableDefinition<EventRosterRow>;
      launch_event_roster_players: TableDefinition<EventRosterPlayerRow>;
      launch_event_posts: TableDefinition<EventPostRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
