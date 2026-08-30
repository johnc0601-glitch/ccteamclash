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
    const {data: memberships, error: membershipError} = await launchSupabase
      .from('launch_season_roster_memberships')
      .select('player_id')
      .eq('season_id', seasonId)
      .eq('team_id', teamId)
      .eq('status', 'Active');
    if (membershipError) throw membershipError;

    const playerIds = (memberships ?? []).map((membership: {player_id: string}) => membership.player_id);
    if (!playerIds.length) return [];

    const [{data: players, error: playerError}, {data: attendanceRows, error: attendanceError}] = await Promise.all([
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
    ]);
    if (playerError) throw playerError;
    if (attendanceError) throw attendanceError;

    const statuses = new Map<string, MatchAttendanceStatus>(
      (attendanceRows ?? []).map((row: {player_id: string; status: string}) => [
        row.player_id,
        row.status as MatchAttendanceStatus,
      ]),
    );

    return (players ?? []).map((player) => ({
      playerId: player.id,
      playerName: player.name,
      teamId,
      status: statuses.get(player.id) ?? 'Unconfirmed',
    }));
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
