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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      historical_player_matchups: {
        Row: {
          deduplication_key: string
          event_label: string
          event_month: string
          event_order: number
          imported_at: string
          match_format: string
          opponent_one_player_id: string
          opponent_one_player_name: string
          opponent_team_id: string
          opponent_team_name: string
          opponent_two_player_id: string | null
          opponent_two_player_name: string | null
          outcome: string
          partner_player_id: string | null
          partner_player_name: string | null
          player_id: string
          player_name: string
          player_team_id: string
          player_team_name: string
          raw_result: string | null
          raw_score: string | null
          season_id: string
          season_name: string
          source_row: number
          source_sheet: string
          source_workbook: string
        }
        Insert: {
          deduplication_key: string
          event_label: string
          event_month: string
          event_order: number
          imported_at?: string
          match_format: string
          opponent_one_player_id: string
          opponent_one_player_name: string
          opponent_team_id: string
          opponent_team_name: string
          opponent_two_player_id?: string | null
          opponent_two_player_name?: string | null
          outcome: string
          partner_player_id?: string | null
          partner_player_name?: string | null
          player_id: string
          player_name: string
          player_team_id: string
          player_team_name: string
          raw_result?: string | null
          raw_score?: string | null
          season_id: string
          season_name: string
          source_row: number
          source_sheet: string
          source_workbook: string
        }
        Update: {
          deduplication_key?: string
          event_label?: string
          event_month?: string
          event_order?: number
          imported_at?: string
          match_format?: string
          opponent_one_player_id?: string
          opponent_one_player_name?: string
          opponent_team_id?: string
          opponent_team_name?: string
          opponent_two_player_id?: string | null
          opponent_two_player_name?: string | null
          outcome?: string
          partner_player_id?: string | null
          partner_player_name?: string | null
          player_id?: string
          player_name?: string
          player_team_id?: string
          player_team_name?: string
          raw_result?: string | null
          raw_score?: string | null
          season_id?: string
          season_name?: string
          source_row?: number
          source_sheet?: string
          source_workbook?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_player_matchups_opponent_one_player_id_fkey"
            columns: ["opponent_one_player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_player_matchups_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_player_matchups_opponent_two_player_id_fkey"
            columns: ["opponent_two_player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_player_matchups_partner_player_id_fkey"
            columns: ["partner_player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_player_matchups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_player_matchups_player_team_id_fkey"
            columns: ["player_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_player_matchups_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "launch_seasons"
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
      launch_match_attendance: {
        Row: {
          created_at: string
          id: string
          match_id: string
          player_id: string
          status: string
          team_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          player_id: string
          status: string
          team_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string
          status?: string
          team_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_match_attendance_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "launch_schedule_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_match_attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_match_attendance_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_match_attendance_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "launch_profiles"
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
      launch_match_roster_snapshot_players: {
        Row: {
          created_at: string
          id: string
          match_id: string
          player_id: string
          player_name_snapshot: string
          team_id: string
          team_name_snapshot: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          player_id: string
          player_name_snapshot: string
          team_id: string
          team_name_snapshot: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string
          player_name_snapshot?: string
          team_id?: string
          team_name_snapshot?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_match_roster_snapshot_players_match_id_team_id_fkey"
            columns: ["match_id", "team_id"]
            isOneToOne: false
            referencedRelation: "launch_match_roster_snapshots"
            referencedColumns: ["match_id", "team_id"]
          },
          {
            foreignKeyName: "launch_match_roster_snapshot_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_match_roster_snapshot_players_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "launch_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_match_roster_snapshots: {
        Row: {
          created_at: string
          id: string
          match_id: string
          needs_commissioner_review: boolean
          team_id: string
          team_name_snapshot: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          needs_commissioner_review?: boolean
          team_id: string
          team_name_snapshot: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          needs_commissioner_review?: boolean
          team_id?: string
          team_name_snapshot?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_match_roster_snapshots_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "launch_schedule_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_match_roster_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_match_roster_snapshots_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "launch_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_match_rosters: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          id: string
          match_id: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          match_id: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          match_id?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_match_rosters_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "launch_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_match_rosters_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "launch_schedule_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_match_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
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
      launch_playoff_brackets: {
        Row: {
          champion_team_id: string | null
          created_at: string
          id: string
          published_at: string | null
          regular_season_locked_at: string
          season_id: string
          status: string
          updated_at: string
        }
        Insert: {
          champion_team_id?: string | null
          created_at?: string
          id: string
          published_at?: string | null
          regular_season_locked_at: string
          season_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          champion_team_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          regular_season_locked_at?: string
          season_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_playoff_brackets_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_playoff_brackets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: true
            referencedRelation: "launch_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_playoff_games: {
        Row: {
          away_seed: number | null
          bracket_id: string
          created_at: string
          home_seed: number | null
          id: string
          match_id: string
          position: number
          stage: string
          updated_at: string
        }
        Insert: {
          away_seed?: number | null
          bracket_id: string
          created_at?: string
          home_seed?: number | null
          id: string
          match_id: string
          position: number
          stage: string
          updated_at?: string
        }
        Update: {
          away_seed?: number | null
          bracket_id?: string
          created_at?: string
          home_seed?: number | null
          id?: string
          match_id?: string
          position?: number
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_playoff_games_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "launch_playoff_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_playoff_games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "launch_schedule_matches"
            referencedColumns: ["id"]
          },
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
      launch_result_contest_players: {
        Row: {
          contest_id: string
          created_at: string
          player_id: string
          player_name: string
          side: string
          slot: number
          team_id: string
          team_name: string
          updated_at: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          player_id: string
          player_name: string
          side: string
          slot: number
          team_id: string
          team_name: string
          updated_at?: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          player_id?: string
          player_name?: string
          side?: string
          slot?: number
          team_id?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_result_contest_players_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "launch_result_contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_result_contest_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "launch_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_result_contest_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "launch_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_result_contests: {
        Row: {
          away_outcome: string
          away_score: number | null
          created_at: string
          format: string
          home_outcome: string
          home_score: number | null
          id: string
          match_id: string
          position: number
          updated_at: string
        }
        Insert: {
          away_outcome: string
          away_score?: number | null
          created_at?: string
          format: string
          home_outcome: string
          home_score?: number | null
          id: string
          match_id: string
          position: number
          updated_at?: string
        }
        Update: {
          away_outcome?: string
          away_score?: number | null
          created_at?: string
          format?: string
          home_outcome?: string
          home_score?: number | null
          id?: string
          match_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_result_contests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "launch_match_results"
            referencedColumns: ["match_id"]
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
          junior_roster_cap: number | null
          league_id: string
          mens_roster_cap: number
          name: string
          published: boolean
          registration_open: boolean
          roster_rules_locked_at: string | null
          start_date: string
          updated_at: string
          womens_roster_cap: number | null
          year: number
        }
        Insert: {
          active?: boolean
          archived?: boolean
          created_at?: string
          description?: string
          end_date: string
          id: string
          junior_roster_cap?: number | null
          league_id: string
          mens_roster_cap?: number
          name: string
          published?: boolean
          registration_open?: boolean
          roster_rules_locked_at?: string | null
          start_date: string
          updated_at?: string
          womens_roster_cap?: number | null
          year: number
        }
        Update: {
          active?: boolean
          archived?: boolean
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          junior_roster_cap?: number | null
          league_id?: string
          mens_roster_cap?: number
          name?: string
          published?: boolean
          registration_open?: boolean
          roster_rules_locked_at?: string | null
          start_date?: string
          updated_at?: string
          womens_roster_cap?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commissioner_add_launch_match_roster_snapshot_player: {
        Args: {
          target_match_id: string
          target_player_id: string
          target_team_id: string
        }
        Returns: undefined
      }
      commissioner_remove_launch_match_roster_snapshot_player: {
        Args: {
          target_match_id: string
          target_player_id: string
          target_team_id: string
        }
        Returns: undefined
      }
      create_launch_match_roster_snapshot: {
        Args: { target_match_id: string }
        Returns: undefined
      }
      get_launch_season_roster_rules_states: {
        Args: { target_season_ids: string[] }
        Returns: {
          lock_at: string
          locked: boolean
          locked_at: string
          season_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
