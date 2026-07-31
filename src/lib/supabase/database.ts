export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      captain_assignments: {
        Row: {
          created_at: string
          id: string
          season_id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          season_id: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          season_id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captain_assignments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "captain_assignments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captain_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "captain_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captain_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          created_at: string
          created_by: string | null
          errors: Json
          filename: string
          id: string
          season_id: string | null
          status: string
          summary: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          errors?: Json
          filename: string
          id?: string
          season_id?: string | null
          status?: string
          summary?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          errors?: Json
          filename?: string
          id?: string
          season_id?: string | null
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "import_runs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_courses: {
        Row: {
          active: boolean
          address: string
          city: string
          created_at: string
          description: string
          home_team_id: string | null
          id: string
          map_url: string
          name: string
          photo_url: string
          state: string
          udisc_url: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string
          city: string
          created_at?: string
          description?: string
          home_team_id?: string | null
          id: string
          map_url?: string
          name: string
          photo_url?: string
          state: string
          udisc_url?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          city?: string
          created_at?: string
          description?: string
          home_team_id?: string | null
          id?: string
          map_url?: string
          name?: string
          photo_url?: string
          state?: string
          udisc_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_courses_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_event_posts: {
        Row: {
          author_name: string
          body: string
          created_at: string
          event_id: string
          id: string
          image_url: string | null
          removed_at: string | null
          removed_by: string | null
          status: string
          type: string
        }
        Insert: {
          author_name?: string
          body?: string
          created_at?: string
          event_id: string
          id: string
          image_url?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          type: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_event_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "launch_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_event_posts_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "launch_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_event_roster_players: {
        Row: {
          created_at: string
          event_roster_id: string
          id: string
          player_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_roster_id: string
          id: string
          player_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_roster_id?: string
          id?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_event_roster_players_event_roster_id_fkey"
            columns: ["event_roster_id"]
            isOneToOne: false
            referencedRelation: "launch_event_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_event_roster_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_event_rosters: {
        Row: {
          created_at: string
          event_id: string
          id: string
          locked_at: string | null
          status: string
          submitted_at: string | null
          submitted_by_profile_id: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id: string
          locked_at?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_profile_id?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          locked_at?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_profile_id?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_event_rosters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "launch_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_event_rosters_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "launch_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_event_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_events: {
        Row: {
          away_team_id: string
          course_name: string
          created_at: string
          date: string
          directions_url: string
          home_team_id: string
          id: string
          season_label: string
          status: string
          time: string
          updated_at: string
        }
        Insert: {
          away_team_id: string
          course_name: string
          created_at?: string
          date: string
          directions_url?: string
          home_team_id: string
          id: string
          season_label: string
          status?: string
          time: string
          updated_at?: string
        }
        Update: {
          away_team_id?: string
          course_name?: string
          created_at?: string
          date?: string
          directions_url?: string
          home_team_id?: string
          id?: string
          season_label?: string
          status?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_events_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_events_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_match_results: {
        Row: {
          away_score: number | null
          created_at: string
          home_score: number | null
          match_id: string
          published_at: string | null
          reopened_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          created_at?: string
          home_score?: number | null
          match_id: string
          published_at?: string | null
          reopened_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          created_at?: string
          home_score?: number | null
          match_id?: string
          published_at?: string | null
          reopened_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "launch_schedule_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_player_claims: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          requested_player_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_name: string
          submitted_pdga_number: string
        }
        Insert: {
          created_at?: string
          id: string
          profile_id: string
          requested_player_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_name: string
          submitted_pdga_number?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          requested_player_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_name?: string
          submitted_pdga_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_player_claims_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "launch_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_player_claims_requested_player_id_fkey"
            columns: ["requested_player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_player_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "launch_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_players: {
        Row: {
          active: boolean
          created_at: string
          current_team_id: string | null
          gender: string
          home_area: string
          id: string
          name: string
          pdga_number: string
          pdga_rating: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_team_id?: string | null
          gender?: string
          home_area?: string
          id: string
          name: string
          pdga_number?: string
          pdga_rating?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_team_id?: string | null
          gender?: string
          home_area?: string
          id?: string
          name?: string
          pdga_number?: string
          pdga_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_players_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_leagues: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          short_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id: string
          name: string
          short_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          short_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      launch_playoff_brackets: {
        Row: { champion_team_id: string | null; created_at: string; id: string; published_at: string | null; regular_season_locked_at: string; season_id: string; status: string; updated_at: string }
        Insert: { champion_team_id?: string | null; created_at?: string; id: string; published_at?: string | null; regular_season_locked_at: string; season_id: string; status?: string; updated_at?: string }
        Update: { champion_team_id?: string | null; created_at?: string; id?: string; published_at?: string | null; regular_season_locked_at?: string; season_id?: string; status?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "launch_playoff_brackets_champion_team_id_fkey"; columns: ["champion_team_id"]; isOneToOne: false; referencedRelation: "launch_teams"; referencedColumns: ["id"] },
          { foreignKeyName: "launch_playoff_brackets_season_id_fkey"; columns: ["season_id"]; isOneToOne: true; referencedRelation: "launch_seasons"; referencedColumns: ["id"] },
        ]
      }
      launch_playoff_games: {
        Row: { away_seed: number | null; bracket_id: string; created_at: string; home_seed: number | null; id: string; match_id: string; position: number; stage: string; updated_at: string }
        Insert: { away_seed?: number | null; bracket_id: string; created_at?: string; home_seed?: number | null; id: string; match_id: string; position: number; stage: string; updated_at?: string }
        Update: { away_seed?: number | null; bracket_id?: string; created_at?: string; home_seed?: number | null; id?: string; match_id?: string; position?: number; stage?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "launch_playoff_games_bracket_id_fkey"; columns: ["bracket_id"]; isOneToOne: false; referencedRelation: "launch_playoff_brackets"; referencedColumns: ["id"] },
          { foreignKeyName: "launch_playoff_games_match_id_fkey"; columns: ["match_id"]; isOneToOne: true; referencedRelation: "launch_schedule_matches"; referencedColumns: ["id"] },
        ]
      }
      launch_profiles: {
        Row: {
          captain_team_id: string | null
          created_at: string
          display_name: string
          id: string
          player_id: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          captain_team_id?: string | null
          created_at?: string
          display_name?: string
          id: string
          player_id?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          captain_team_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          player_id?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_profiles_captain_team_id_fkey"
            columns: ["captain_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_rounds: {
        Row: {
          created_at: string
          date: string | null
          id: string
          name: string
          number: number
          published: boolean
          schedule_id: string
          season_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id: string
          name: string
          number: number
          published?: boolean
          schedule_id: string
          season_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          number?: number
          published?: boolean
          schedule_id?: string
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_rounds_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "launch_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_rounds_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "launch_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_schedule_matches: {
        Row: {
          away_team_id: string | null
          course_id: string | null
          created_at: string
          date: string | null
          home_team_id: string | null
          id: string
          notes: string
          round_id: string
          season_id: string
          status: string
          time: string | null
          updated_at: string
        }
        Insert: {
          away_team_id?: string | null
          course_id?: string | null
          created_at?: string
          date?: string | null
          home_team_id?: string | null
          id: string
          notes?: string
          round_id: string
          season_id: string
          status?: string
          time?: string | null
          updated_at?: string
        }
        Update: {
          away_team_id?: string | null
          course_id?: string | null
          created_at?: string
          date?: string | null
          home_team_id?: string | null
          id?: string
          notes?: string
          round_id?: string
          season_id?: string
          status?: string
          time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_schedule_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_schedule_matches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "launch_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_schedule_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_schedule_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "launch_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_schedule_matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "launch_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_schedules: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          published: boolean
          season_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id: string
          name: string
          published?: boolean
          season_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          published?: boolean
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_schedules_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "launch_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_seasons: {
        Row: {
          active: boolean
          archived: boolean
          created_at: string
          description: string
          end_date: string
          id: string
          league_id: string
          name: string
          published: boolean
          registration_open: boolean
          start_date: string
          updated_at: string
          year: number
        }
        Insert: {
          active?: boolean
          archived?: boolean
          created_at?: string
          description?: string
          end_date: string
          id: string
          league_id: string
          name: string
          published?: boolean
          registration_open?: boolean
          start_date: string
          updated_at?: string
          year: number
        }
        Update: {
          active?: boolean
          archived?: boolean
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          league_id?: string
          name?: string
          published?: boolean
          registration_open?: boolean
          start_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "launch_seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "launch_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_teams: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo: string
          name: string
          short_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id: string
          logo?: string
          name: string
          short_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo?: string
          name?: string
          short_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      launch_team_aliases: {
        Row: {
          alias: string
          created_at: string
          normalized_alias: string
          team_id: string
          updated_at: string
        }
        Insert: {
          alias: string
          created_at?: string
          normalized_alias: string
          team_id: string
          updated_at?: string
        }
        Update: {
          alias?: string
          created_at?: string
          normalized_alias?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_team_aliases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_misc_points: {
        Row: {
          away_points: number
          home_points: number
          match_id: string
          notes: string | null
        }
        Insert: {
          away_points?: number
          home_points?: number
          match_id: string
          notes?: string | null
        }
        Update: {
          away_points?: number
          home_points?: number
          match_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_misc_points_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_rows: {
        Row: {
          away_player_1_id: string | null
          away_player_2_id: string | null
          away_points: number
          created_at: string
          format: Database["public"]["Enums"]["match_format"]
          home_player_1_id: string | null
          home_player_2_id: string | null
          home_points: number
          id: string
          match_id: string
          result: Database["public"]["Enums"]["result_code"] | null
          row_number: number
        }
        Insert: {
          away_player_1_id?: string | null
          away_player_2_id?: string | null
          away_points?: number
          created_at?: string
          format: Database["public"]["Enums"]["match_format"]
          home_player_1_id?: string | null
          home_player_2_id?: string | null
          home_points?: number
          id?: string
          match_id: string
          result?: Database["public"]["Enums"]["result_code"] | null
          row_number: number
        }
        Update: {
          away_player_1_id?: string | null
          away_player_2_id?: string | null
          away_points?: number
          created_at?: string
          format?: Database["public"]["Enums"]["match_format"]
          home_player_1_id?: string | null
          home_player_2_id?: string | null
          home_points?: number
          id?: string
          match_id?: string
          result?: Database["public"]["Enums"]["result_code"] | null
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_rows_away_player_1_id_fkey"
            columns: ["away_player_1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rows_away_player_2_id_fkey"
            columns: ["away_player_2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rows_home_player_1_id_fkey"
            columns: ["home_player_1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rows_home_player_2_id_fkey"
            columns: ["home_player_2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rows_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          away_score: number
          away_team_id: string
          course: string | null
          created_at: string
          home_score: number
          home_team_id: string
          id: string
          notes: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          submitted_at: string | null
          submitted_by: string | null
          week_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          away_score?: number
          away_team_id: string
          course?: string | null
          created_at?: string
          home_score?: number
          home_team_id: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          week_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          away_score?: number
          away_team_id?: string
          course?: string | null
          created_at?: string
          home_score?: number
          home_team_id?: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_featured: boolean
          match_id: string | null
          season_id: string | null
          storage_path: string
          team_id: string | null
          week_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          match_id?: string | null
          season_id?: string | null
          storage_path: string
          team_id?: string | null
          week_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          match_id?: string | null
          season_id?: string | null
          storage_path?: string
          team_id?: string | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "photos_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "photos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          normalized_name: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          normalized_name?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          normalized_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          is_current: boolean
          name: string
          starts_on: string | null
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          name: string
          starts_on?: string | null
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_current?: boolean
          name?: string
          starts_on?: string | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          hero_image_url: string | null
          id: string
          match_id: string | null
          published_at: string | null
          season_id: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          week_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          hero_image_url?: string | null
          id?: string
          match_id?: string | null
          published_at?: string | null
          season_id?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          week_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          hero_image_url?: string | null
          id?: string
          match_id?: string | null
          published_at?: string | null
          season_id?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "stories_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          is_captain: boolean
          player_id: string
          season_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_captain?: boolean
          player_id: string
          season_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_captain?: boolean
          player_id?: string
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "team_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          short_name: string | null
          slug: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          short_name?: string | null
          slug: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          short_name?: string | null
          slug?: string
        }
        Relationships: []
      }
      weeks: {
        Row: {
          created_at: string
          id: string
          label: string | null
          publish_status: string
          season_id: string
          starts_on: string | null
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          publish_status?: string
          season_id: string
          starts_on?: string | null
          week_number: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          publish_status?: string
          season_id?: string
          starts_on?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weeks_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "season_standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "weeks_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      season_standings: {
        Row: {
          losses: number | null
          matches_played: number | null
          points_against: number | null
          points_for: number | null
          season_id: string | null
          team_id: string | null
          team_name: string | null
          ties: number | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "commissioner" | "captain"
      match_format: "singles" | "doubles"
      match_status:
        | "scheduled"
        | "lineups_open"
        | "scoring"
        | "submitted"
        | "approved"
        | "published"
        | "archived"
      result_code: "home_win" | "away_win" | "tie"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["commissioner", "captain"],
      match_format: ["singles", "doubles"],
      match_status: [
        "scheduled",
        "lineups_open",
        "scoring",
        "submitted",
        "approved",
        "published",
        "archived",
      ],
      result_code: ["home_win", "away_win", "tie"],
    },
  },
} as const
