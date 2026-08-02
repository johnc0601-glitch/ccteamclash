import type {SupabaseClient} from '@supabase/supabase-js';
import type {
  AttendanceActor,
  AttendanceMatch,
  MatchAttendance,
  MatchAttendanceStatus,
  MatchRoster,
  TeamAttendanceMember,
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
      launch_match_rosters: {
        Row: RosterRow;
        Insert: Pick<RosterRow, 'match_id' | 'team_id' | 'status' | 'confirmed_by' | 'confirmed_at'>;
        Update: Pick<RosterRow, 'status' | 'confirmed_by' | 'confirmed_at'>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type RosterRow = {
  id: string;
  match_id: string;
  team_id: string;
  status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  updated_at: string;
};

export class SupabaseMatchRosterRepository implements MatchRosterRepository {
  private readonly attendanceClient: SupabaseClient<AttendanceDatabase>;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.attendanceClient = supabase as unknown as SupabaseClient<AttendanceDatabase>;
  }

  async getAttendanceActor(userId: string): Promise<AttendanceActor | undefined> {
    const {data: profile, error: profileError} = await this.supabase
      .from('launch_profiles')
      .select('id,status,role,player_id,captain_team_id')
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
        captainTeamId: profile.captain_team_id,
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
      captainTeamId: profile.captain_team_id,
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

  async getTeamAttendance(matchId: string, teamId: string): Promise<TeamAttendanceMember[]> {
    const [{data: players, error: playerError}, {data: attendanceRows, error: attendanceError}] = await Promise.all([
      this.supabase
        .from('launch_players')
        .select('id,name,current_team_id')
        .eq('current_team_id', teamId)
        .eq('active', true)
        .order('name'),
      this.attendanceClient
        .from('launch_match_attendance')
        .select('*')
        .eq('match_id', matchId)
        .eq('team_id', teamId),
    ]);
    if (playerError) throw playerError;
    if (attendanceError) throw attendanceError;

    const statuses = new Map(attendanceRows.map((row) => [row.player_id, row.status as MatchAttendanceStatus]));
    return players.map((player) => ({
      playerId: player.id,
      playerName: player.name,
      teamId,
      status: statuses.get(player.id) ?? 'Unconfirmed',
    }));
  }

  async getMatchRoster(matchId: string, teamId: string): Promise<MatchRoster | undefined> {
    const {data, error} = await this.attendanceClient
      .from('launch_match_rosters')
      .select('*')
      .eq('match_id', matchId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (error) throw error;
    return data ? toMatchRoster(data) : undefined;
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

  async saveMatchRoster(input: {
    matchId: string;
    teamId: string;
    confirmedBy: string;
    confirmedAt: string;
  }): Promise<MatchRoster> {
    const existing = await this.getMatchRoster(input.matchId, input.teamId);
    const values = {
      status: 'Confirmed',
      confirmed_by: input.confirmedBy,
      confirmed_at: input.confirmedAt,
    };
    const query = existing
      ? this.attendanceClient
        .from('launch_match_rosters')
        .update(values)
        .eq('match_id', input.matchId)
        .eq('team_id', input.teamId)
      : this.attendanceClient
        .from('launch_match_rosters')
        .insert({...values, match_id: input.matchId, team_id: input.teamId});
    const {data, error} = await query.select().single();
    if (error) throw error;
    return toMatchRoster(data);
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

function toMatchRoster(row: RosterRow): MatchRoster {
  return {
    id: row.id,
    matchId: row.match_id,
    teamId: row.team_id,
    status: row.status as MatchRoster['status'],
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    updatedAt: row.updated_at,
  };
}
