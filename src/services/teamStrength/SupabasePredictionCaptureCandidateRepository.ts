import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import type {MatchStatus} from '@/domain/schedule/Match';
import type {Database} from '@/lib/supabase/database';
import {currentPredictionCaptureSource} from './PredictionCaptureSchedule';
import type {
  PredictionCaptureCandidate,
  PredictionCaptureCandidateRepository,
} from './PredictionCaptureRunner';

type MatchRow = {
  id: string;
  season_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  course_id: string | null;
  date: string | null;
  status: string;
};

type MembershipRow = {team_id: string; player_id: string};
type AttendanceRow = {team_id: string; player_id: string; status: string};

/**
 * Service-role loader for the small set of published matches whose Team
 * Strength capture window is open right now. It deliberately derives player
 * pools from season memberships or immutable official rosters rather than from
 * `launch_players.current_team_id`.
 */
export class SupabasePredictionCaptureCandidateRepository
implements PredictionCaptureCandidateRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getCaptureCandidates(now: Date): Promise<PredictionCaptureCandidate[]> {
    const matches = await this.getPublishedMatches();
    const due = matches.filter((match) => (
      match.date
      && match.home_team_id
      && match.away_team_id
      && match.course_id
      && currentPredictionCaptureSource(match.date, now)
    ));

    const candidates = await Promise.all(due.map((match) => this.buildCandidate(match, now)));
    return candidates.filter((candidate): candidate is PredictionCaptureCandidate => Boolean(candidate));
  }

  private async getPublishedMatches(): Promise<MatchRow[]> {
    const {data: schedules, error: scheduleError} = await this.supabase
      .from('launch_schedules')
      .select('id')
      .eq('published', true);
    if (scheduleError) throw scheduleError;
    if (!schedules.length) return [];

    const {data: rounds, error: roundError} = await this.supabase
      .from('launch_rounds')
      .select('id')
      .in('schedule_id', schedules.map((schedule) => schedule.id))
      .eq('published', true);
    if (roundError) throw roundError;
    if (!rounds.length) return [];

    const raw = this.supabase as any;
    const {data, error} = await raw
      .from('launch_schedule_matches')
      .select('id,season_id,home_team_id,away_team_id,course_id,date,status')
      .in('round_id', rounds.map((round) => round.id))
      .in('status', ['Scheduled', 'Postponed', 'Rain Delay']);
    if (error) throw error;
    return (data ?? []) as MatchRow[];
  }

  private async buildCandidate(
    match: MatchRow,
    now: Date,
  ): Promise<PredictionCaptureCandidate | undefined> {
    if (!match.date || !match.home_team_id || !match.away_team_id || !match.course_id) {
      return undefined;
    }

    const source = currentPredictionCaptureSource(match.date, now);
    if (!source) return undefined;

    const matchVenue = await this.getMatchVenue(match.course_id, match.home_team_id);

    if (source === 'matchLineup') {
      const rosterRepository = new SupabaseMatchRosterRepository(this.supabase);
      const officialRosters = await rosterRepository.getOfficialMatchRosters(match.id);
      const homeRoster = officialRosters.find((roster) => roster.teamId === match.home_team_id);
      const awayRoster = officialRosters.find((roster) => roster.teamId === match.away_team_id);
      if (!homeRoster || !awayRoster) return undefined;

      const homeIds = homeRoster.players.map((player) => player.playerId);
      const awayIds = awayRoster.players.map((player) => player.playerId);
      const players = await this.getPlayersByIds([...new Set([...homeIds, ...awayIds])]);
      const playersById = new Map(players.map((player) => [player.id, player]));

      return {
        matchId: match.id,
        matchDate: match.date,
        matchStatus: match.status as MatchStatus,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        matchVenue,
        homePlayers: homeIds.map((id) => playersById.get(id)).filter(isPlayer),
        awayPlayers: awayIds.map((id) => playersById.get(id)).filter(isPlayer),
        officialRosters,
      };
    }

    const memberships = await this.getActiveMemberships(
      match.season_id,
      [match.home_team_id, match.away_team_id],
    );
    const homeIds = memberships
      .filter((membership) => membership.team_id === match.home_team_id)
      .map((membership) => membership.player_id);
    const awayIds = memberships
      .filter((membership) => membership.team_id === match.away_team_id)
      .map((membership) => membership.player_id);
    if (!homeIds.length || !awayIds.length) return undefined;

    const players = await this.getPlayersByIds([...new Set([...homeIds, ...awayIds])]);
    const playersById = new Map(players.map((player) => [player.id, player]));
    const homePlayers = homeIds.map((id) => playersById.get(id)).filter(isPlayer);
    const awayPlayers = awayIds.map((id) => playersById.get(id)).filter(isPlayer);

    const candidate: PredictionCaptureCandidate = {
      matchId: match.id,
      matchDate: match.date,
      matchStatus: match.status as MatchStatus,
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      matchVenue,
      homePlayers,
      awayPlayers,
    };

    if (source === 'confirmedAvailableRoster') {
      const attendance = await this.getAttendance(match.id, [match.home_team_id, match.away_team_id]);
      candidate.homeAttendance = buildAttendance(homePlayers, match.home_team_id, attendance);
      candidate.awayAttendance = buildAttendance(awayPlayers, match.away_team_id, attendance);
    }

    return candidate;
  }

  private async getMatchVenue(
    courseId: string,
    homeTeamId: string,
  ): Promise<'Home' | 'Neutral'> {
    const {data, error} = await this.supabase
      .from('launch_courses')
      .select('home_team_id')
      .eq('id', courseId)
      .maybeSingle();
    if (error) throw error;
    return data?.home_team_id === homeTeamId ? 'Home' : 'Neutral';
  }

  private async getActiveMemberships(
    seasonId: string,
    teamIds: string[],
  ): Promise<MembershipRow[]> {
    const raw = this.supabase as any;
    const {data, error} = await raw
      .from('launch_season_roster_memberships')
      .select('team_id,player_id')
      .eq('season_id', seasonId)
      .eq('status', 'Active')
      .in('team_id', teamIds);
    if (error) throw error;
    return (data ?? []) as MembershipRow[];
  }

  private async getAttendance(
    matchId: string,
    teamIds: string[],
  ): Promise<AttendanceRow[]> {
    const raw = this.supabase as any;
    const {data, error} = await raw
      .from('launch_match_attendance')
      .select('team_id,player_id,status')
      .eq('match_id', matchId)
      .in('team_id', teamIds);
    if (error) throw error;
    return (data ?? []) as AttendanceRow[];
  }

  private async getPlayersByIds(playerIds: string[]): Promise<LaunchPlayer[]> {
    if (!playerIds.length) return [];
    const {data, error} = await this.supabase
      .from('launch_players')
      .select('*')
      .in('id', playerIds)
      .order('name');
    if (error) throw error;

    return (data ?? []).map((row) => {
      const rating = row as typeof row & {
        clash_index?: number | null;
        clash_index_provisional?: boolean | null;
      };
      return {
        id: row.id,
        name: row.name,
        gender: row.gender as LaunchPlayer['gender'],
        pdgaNumber: row.pdga_number,
        pdgaRating: row.pdga_rating,
        clashIndex: rating.clash_index ?? null,
        clashIndexProvisional: rating.clash_index_provisional ?? false,
        currentTeamId: row.current_team_id,
        homeArea: row.home_area,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }
}

function buildAttendance(
  players: readonly LaunchPlayer[],
  teamId: string,
  rows: readonly AttendanceRow[],
): TeamAttendanceMember[] {
  const statuses = new Map(
    rows
      .filter((row) => row.team_id === teamId)
      .map((row) => [row.player_id, row.status as TeamAttendanceMember['status']]),
  );

  return players.map((player) => ({
    playerId: player.id,
    playerName: player.name,
    teamId,
    status: statuses.get(player.id) ?? 'Unconfirmed',
  }));
}

function isPlayer(player: LaunchPlayer | undefined): player is LaunchPlayer {
  return Boolean(player);
}
