import type {SupabaseClient} from '@supabase/supabase-js';
import type {
  AttendanceActor,
  MatchAttendanceStatus,
  TeamAttendanceMember,
} from '@/domain/match-roster/MatchAttendance';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import type {Database} from '@/lib/supabase/database';

export class SeasonAwareMatchRosterRepository extends SupabaseMatchRosterRepository {
  constructor(private readonly seasonSupabase: SupabaseClient<Database>) {
    super(seasonSupabase);
  }

  override async getAttendanceActor(userId: string, matchId?: string): Promise<AttendanceActor | undefined> {
    const actor = await super.getAttendanceActor(userId);
    if (!actor?.playerId) return actor;

    const seasonId = matchId
      ? await this.getMatchSeasonId(matchId)
      : await this.getActiveSeasonId();
    if (!seasonId) return {...actor, teamId: null};

    const launchSupabase = this.seasonSupabase as any;
    const {data: membership, error: membershipError} = await launchSupabase
      .from('launch_season_roster_memberships')
      .select('team_id')
      .eq('season_id', seasonId)
      .eq('player_id', actor.playerId)
      .eq('status', 'Active')
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;

    return {...actor, teamId: membership?.team_id ?? null};
  }

  override async getTeamAttendance(matchId: string, teamId: string): Promise<TeamAttendanceMember[]> {
    const seasonId = await this.getMatchSeasonId(matchId);
    if (!seasonId) return [];

    const launchSupabase = this.seasonSupabase as any;
    const [
      {data: memberships, error: membershipError},
      {data: loanRows, error: loanError},
    ] = await Promise.all([
      launchSupabase
        .from('launch_season_roster_memberships')
        .select('player_id')
        .eq('season_id', seasonId)
        .eq('team_id', teamId)
        .eq('status', 'Active'),
      launchSupabase
        .from('launch_match_roster_loans')
        .select('player_id,original_team_id')
        .eq('match_id', matchId)
        .eq('borrowing_team_id', teamId)
        .is('removed_at', null),
    ]);
    if (membershipError) throw membershipError;
    if (loanError) throw loanError;

    const permanentPlayerIds = (memberships ?? []).map((membership: {player_id: string}) => membership.player_id);
    const borrowedRows = (loanRows ?? []) as Array<{player_id: string; original_team_id: string}>;
    const playerIds = [...new Set([
      ...permanentPlayerIds,
      ...borrowedRows.map((loan) => loan.player_id),
    ])];
    if (!playerIds.length) return [];

    const originalTeamIds = [...new Set(borrowedRows.map((loan) => loan.original_team_id))];
    const originalTeamsPromise = originalTeamIds.length
      ? launchSupabase.from('launch_teams').select('id,name').in('id', originalTeamIds)
      : Promise.resolve({data: [], error: null});

    const [
      {data: players, error: playerError},
      {data: attendanceRows, error: attendanceError},
      {data: originalTeams, error: originalTeamError},
    ] = await Promise.all([
      this.seasonSupabase
        .from('launch_players')
        .select('id,name')
        .in('id', playerIds)
        .eq('active', true)
        .order('name'),
      launchSupabase
        .from('launch_match_attendance')
        .select('player_id,status')
        .eq('match_id', matchId)
        .eq('team_id', teamId),
      originalTeamsPromise,
    ]);
    if (playerError) throw playerError;
    if (attendanceError) throw attendanceError;
    if (originalTeamError) throw originalTeamError;

    const statuses = new Map<string, MatchAttendanceStatus>(
      (attendanceRows ?? []).map((row: {player_id: string; status: string}) => [
        row.player_id,
        row.status as MatchAttendanceStatus,
      ]),
    );
    const originalTeamNames = new Map<string, string>(
      (originalTeams ?? []).map((team: {id: string; name: string}) => [team.id, team.name]),
    );
    const borrowedByPlayer = new Map(
      borrowedRows.map((loan) => [loan.player_id, loan.original_team_id]),
    );

    return (players ?? []).map((player) => {
      const originalTeamId = borrowedByPlayer.get(player.id);
      return {
        playerId: player.id,
        playerName: player.name,
        teamId,
        status: statuses.get(player.id) ?? 'Unconfirmed',
        ...(originalTeamId ? {
          borrowed: true,
          originalTeamId,
          originalTeamName: originalTeamNames.get(originalTeamId),
        } : {}),
      };
    });
  }

  private async getMatchSeasonId(matchId: string): Promise<string | undefined> {
    const {data: match, error} = await this.seasonSupabase
      .from('launch_schedule_matches')
      .select('season_id')
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw error;
    return match?.season_id ?? undefined;
  }

  private async getActiveSeasonId(): Promise<string | undefined> {
    const {data: activeSeason, error} = await this.seasonSupabase
      .from('launch_seasons')
      .select('id')
      .eq('active', true)
      .order('year', {ascending: false})
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return activeSeason?.id ?? undefined;
  }
}
