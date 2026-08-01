import type {SupabaseClient} from '@supabase/supabase-js';
import type {
  AttendanceActor,
  AttendanceMatch,
  MatchAttendance,
  MatchAttendanceStatus,
} from '@/domain/match-roster/MatchAttendance';
import type {MatchRosterRepository} from '@/domain/match-roster/MatchRosterRepository';
import type {Database} from '@/lib/supabase/database';

type AttendanceRow = {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  status: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

type AttendanceDatabase = {
  public: {
    Tables: {
      launch_match_attendance: {
        Row: AttendanceRow;
        Insert: Pick<AttendanceRow, 'match_id' | 'team_id' | 'player_id' | 'status' | 'updated_by'>;
        Update: Pick<AttendanceRow, 'status' | 'updated_by'>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export class SupabaseMatchRosterRepository implements MatchRosterRepository {
  private readonly attendanceClient: SupabaseClient<AttendanceDatabase>;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.attendanceClient = supabase as unknown as SupabaseClient<AttendanceDatabase>;
  }

  async getAttendanceActor(userId: string): Promise<AttendanceActor | undefined> {
    const {data: profile, error: profileError} = await this.supabase
      .from('launch_profiles')
      .select('id,status,role,player_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return undefined;

    if (!profile.player_id) {
      return {
        profileId: profile.id,
        profileStatus: profile.status as AttendanceActor['profileStatus'],
        profileRole: profile.role as AttendanceActor['profileRole'],
        playerId: null,
        teamId: null,
        playerName: null,
        playerActive: false,
      };
    }

    const {data: player, error: playerError} = await this.supabase
      .from('launch_players')
      .select('id,name,current_team_id,active')
      .eq('id', profile.player_id)
      .maybeSingle();
    if (playerError) throw playerError;

    return {
      profileId: profile.id,
      profileStatus: profile.status as AttendanceActor['profileStatus'],
      profileRole: profile.role as AttendanceActor['profileRole'],
      playerId: player?.id ?? profile.player_id,
      teamId: player?.current_team_id ?? null,
      playerName: player?.name ?? null,
      playerActive: player?.active ?? false,
    };
  }

  async getAttendanceMatch(matchId: string): Promise<AttendanceMatch | undefined> {
    const {data, error} = await this.supabase
      .from('launch_schedule_matches')
      .select('id,home_team_id,away_team_id,date,status')
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw error;
    return data ? {
      id: data.id,
      homeTeamId: data.home_team_id,
      awayTeamId: data.away_team_id,
      date: data.date,
      status: data.status as AttendanceMatch['status'],
    } : undefined;
  }

  async getAttendance(matchId: string, playerId: string): Promise<MatchAttendance | undefined> {
    const {data, error} = await this.attendanceClient
      .from('launch_match_attendance')
      .select('*')
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .maybeSingle();
    if (error) throw error;
    return data ? toAttendance(data) : undefined;
  }

  async saveAttendance(input: {
    matchId: string;
    teamId: string;
    playerId: string;
    status: MatchAttendanceStatus;
    updatedBy: string;
  }): Promise<MatchAttendance> {
    const existing = await this.getAttendance(input.matchId, input.playerId);
    const query = existing
      ? this.attendanceClient
        .from('launch_match_attendance')
        .update({status: input.status, updated_by: input.updatedBy})
        .eq('match_id', input.matchId)
        .eq('player_id', input.playerId)
      : this.attendanceClient
        .from('launch_match_attendance')
        .insert({
          match_id: input.matchId,
          team_id: input.teamId,
          player_id: input.playerId,
          status: input.status,
          updated_by: input.updatedBy,
        });
    const {data, error} = await query.select().single();
    if (error) throw error;
    return toAttendance(data);
  }
}

function toAttendance(row: AttendanceRow): MatchAttendance {
  return {
    id: row.id,
    matchId: row.match_id,
    teamId: row.team_id,
    playerId: row.player_id,
    status: row.status as MatchAttendanceStatus,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
