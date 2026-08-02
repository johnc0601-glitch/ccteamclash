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
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import {isMatchAtOrAfterSnapshotCutoff} from '@/domain/match-roster/MatchRosterSnapshotAutomation';
import type {
  MatchRosterSnapshotManifest,
  MatchRosterSnapshotPlayer,
  OfficialMatchRoster,
} from '@/domain/match-roster/MatchRosterSnapshot';
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
      launch_match_roster_snapshots: {
        Row: SnapshotManifestRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      launch_match_roster_snapshot_players: {
        Row: SnapshotPlayerRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_launch_match_roster_snapshot: {Args: {target_match_id: string}; Returns: undefined};
      commissioner_add_launch_match_roster_snapshot_player: {
        Args: {target_match_id: string; target_team_id: string; target_player_id: string};
        Returns: undefined;
      };
      commissioner_remove_launch_match_roster_snapshot_player: {
        Args: {target_match_id: string; target_team_id: string; target_player_id: string};
        Returns: undefined;
      };
    };
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

type SnapshotManifestRow = {
  id: string;
  match_id: string;
  team_id: string;
  needs_commissioner_review: boolean;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
};

type SnapshotPlayerRow = {
  id: string;
  match_id: string;
  team_id: string;
  team_name_snapshot: string;
  player_id: string;
  player_name_snapshot: string;
  created_at: string;
  updated_by: string | null;
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

  async getOfficialMatchRosters(matchId: string): Promise<OfficialMatchRoster[]> {
    const [{data: manifests, error: manifestError}, {data: players, error: playerError}] = await Promise.all([
      this.attendanceClient.from('launch_match_roster_snapshots').select('*').eq('match_id', matchId).order('team_id'),
      this.attendanceClient.from('launch_match_roster_snapshot_players').select('*').eq('match_id', matchId).order('player_name_snapshot'),
    ]);
    if (manifestError) throw manifestError;
    if (playerError) throw playerError;

    return manifests.map((row) => ({
      ...toSnapshotManifest(row),
      players: players.filter((player) => player.team_id === row.team_id).map(toSnapshotPlayer),
    }));
  }

  async hasCompleteSnapshot(matchId: string): Promise<boolean> {
    const [match, rosters] = await Promise.all([
      this.getAttendanceMatch(matchId),
      this.getOfficialMatchRosters(matchId),
    ]);
    if (!match?.homeTeamId || !match.awayTeamId || match.homeTeamId === match.awayTeamId) return false;
    const actual = new Set(rosters.map((roster) => roster.teamId));
    return actual.has(match.homeTeamId) && actual.has(match.awayTeamId) && actual.size === 2;
  }

  async getSnapshotCandidateMatches(snapshotStartAt: Date, now: Date): Promise<AttendanceMatch[]> {
    const {data: schedules, error: scheduleError} = await this.supabase
      .from('launch_schedules').select('id').eq('published', true);
    if (scheduleError) throw scheduleError;
    if (!schedules.length) return [];
    const {data: rounds, error: roundError} = await this.supabase
      .from('launch_rounds').select('id').in('schedule_id', schedules.map((schedule) => schedule.id)).eq('published', true);
    if (roundError) throw roundError;
    if (!rounds.length) return [];
    const {data: matches, error: matchError} = await this.supabase
      .from('launch_schedule_matches')
      .select('id,home_team_id,away_team_id,date,status')
      .in('round_id', rounds.map((round) => round.id))
      .neq('status', 'Cancelled');
    if (matchError) throw matchError;
    return filterSnapshotCandidateMatches(matches.map((row) => ({
      id: row.id,
      homeTeamId: row.home_team_id,
      awayTeamId: row.away_team_id,
      date: row.date,
      status: row.status as AttendanceMatch['status'],
    })), snapshotStartAt, now);
  }

  async createLockedSnapshot(matchId: string): Promise<void> {
    const {error} = await this.attendanceClient.rpc('create_launch_match_roster_snapshot', {target_match_id: matchId});
    if (error) throw error;
  }

  async addSnapshotPlayer(matchId: string, teamId: string, playerId: string): Promise<void> {
    const {error} = await this.attendanceClient.rpc('commissioner_add_launch_match_roster_snapshot_player', {
      target_match_id: matchId,
      target_team_id: teamId,
      target_player_id: playerId,
    });
    if (error) throw error;
  }

  async removeSnapshotPlayer(matchId: string, teamId: string, playerId: string): Promise<void> {
    const {error} = await this.attendanceClient.rpc('commissioner_remove_launch_match_roster_snapshot_player', {
      target_match_id: matchId,
      target_team_id: teamId,
      target_player_id: playerId,
    });
    if (error) throw error;
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

export function filterSnapshotCandidateMatches(
  matches: AttendanceMatch[],
  snapshotStartAt: Date,
  now: Date,
): AttendanceMatch[] {
  return matches.filter((match) => (
    match.status !== 'Cancelled'
    && isMatchRosterLocked(match, now)
    && isMatchAtOrAfterSnapshotCutoff(match, snapshotStartAt)
  ));
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

function toSnapshotManifest(row: SnapshotManifestRow): MatchRosterSnapshotManifest {
  return {
    id: row.id,
    matchId: row.match_id,
    teamId: row.team_id,
    needsCommissionerReview: row.needs_commissioner_review,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

function toSnapshotPlayer(row: SnapshotPlayerRow): MatchRosterSnapshotPlayer {
  return {
    id: row.id,
    matchId: row.match_id,
    teamId: row.team_id,
    teamNameSnapshot: row.team_name_snapshot,
    playerId: row.player_id,
    playerNameSnapshot: row.player_name_snapshot,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}
