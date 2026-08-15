import type {SupabaseClient} from '@supabase/supabase-js';
import type {
  MatchResult,
  OfficialResultRoster,
  ResultContest,
  ResultContestInput,
  ResultContestPlayer,
} from '@/domain/results/MatchResult';
import type {ResultsRepository} from '@/domain/results/ResultsRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['launch_match_results']['Row'];
type ContestRow = Database['public']['Tables']['launch_result_contests']['Row'];
type ContestPlayerRow = Database['public']['Tables']['launch_result_contest_players']['Row'];

export class SupabaseResultsRepository implements ResultsRepository {
  constructor(private readonly supabase: Client) {}

  async getAll(): Promise<MatchResult[]> {
    const {data, error} = await this.supabase
      .from('launch_match_results')
      .select('*')
      .order('updated_at', {ascending: false});
    if (error) throw error;
    return data.map(toResult);
  }

  async getByMatchId(matchId: string): Promise<MatchResult | undefined> {
    const {data, error} = await this.supabase
      .from('launch_match_results')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();
    if (error) throw error;
    return data ? toResult(data) : undefined;
  }

  async save(result: MatchResult): Promise<MatchResult> {
    const {data, error} = await this.supabase
      .from('launch_match_results')
      .upsert(fromResult(result))
      .select()
      .single();
    if (error) throw error;
    return toResult(data);
  }

  async getContests(matchId: string): Promise<ResultContest[]> {
    const {data: contests, error: contestError} = await this.supabase
      .from('launch_result_contests')
      .select('*')
      .eq('match_id', matchId)
      .order('format')
      .order('position');
    if (contestError) throw contestError;
    if (!contests.length) return [];
    const {data: players, error: playerError} = await this.supabase
      .from('launch_result_contest_players')
      .select('*')
      .in('contest_id', contests.map((contest) => contest.id))
      .order('side')
      .order('slot');
    if (playerError) throw playerError;
    return contests.map((contest) => toContest(
      contest,
      players.filter((player) => player.contest_id === contest.id),
    ));
  }

  async getOfficialRosters(matchId: string): Promise<OfficialResultRoster[]> {
    const {data: manifests, error: manifestError} = await this.supabase
      .from('launch_match_roster_snapshots')
      .select('team_id,team_name_snapshot')
      .eq('match_id', matchId)
      .order('team_id');
    if (manifestError) throw manifestError;
    if (!manifests.length) return [];
    const {data: players, error: playerError} = await this.supabase
      .from('launch_match_roster_snapshot_players')
      .select('team_id,team_name_snapshot,player_id,player_name_snapshot')
      .eq('match_id', matchId)
      .order('player_name_snapshot');
    if (playerError) throw playerError;
    return manifests.map((manifest) => ({
      teamId: manifest.team_id,
      teamName: manifest.team_name_snapshot,
      players: players
        .filter((player) => player.team_id === manifest.team_id)
        .map((player) => ({
          playerId: player.player_id,
          playerName: player.player_name_snapshot,
          teamId: player.team_id,
          teamName: player.team_name_snapshot,
        })),
    }));
  }

  async replaceContests(matchId: string, contests: ResultContestInput[]): Promise<ResultContest[]> {
    const {error: deleteError} = await this.supabase
      .from('launch_result_contests')
      .delete()
      .eq('match_id', matchId);
    if (deleteError) throw deleteError;
    if (!contests.length) return [];
    const now = new Date().toISOString();
    const {error: contestError} = await this.supabase
      .from('launch_result_contests')
      .insert(contests.map((contest) => ({
        id: contest.id,
        match_id: matchId,
        format: contest.format,
        position: contest.position,
        home_outcome: contest.homeOutcome,
        away_outcome: contest.awayOutcome,
        home_score: contest.homeScore,
        away_score: contest.awayScore,
        created_at: now,
        updated_at: now,
      })));
    if (contestError) throw contestError;
    const {error: playerError} = await this.supabase
      .from('launch_result_contest_players')
      .insert(contests.flatMap((contest) => contest.players.map((player) => ({
        contest_id: contest.id,
        player_id: player.playerId,
        team_id: player.teamId,
        side: player.side,
        slot: player.slot,
        player_name: player.playerId,
        team_name: player.teamId,
        created_at: now,
        updated_at: now,
      }))));
    if (playerError) throw playerError;
    return this.getContests(matchId);
  }
}

function toContest(row: ContestRow, players: ContestPlayerRow[]): ResultContest {
  return {
    id: row.id,
    matchId: row.match_id,
    format: row.format as ResultContest['format'],
    position: row.position,
    homeOutcome: row.home_outcome as ResultContest['homeOutcome'],
    awayOutcome: row.away_outcome as ResultContest['awayOutcome'],
    homeScore: row.home_score,
    awayScore: row.away_score,
    players: players.map(toContestPlayer),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toContestPlayer(row: ContestPlayerRow): ResultContestPlayer {
  return {
    playerId: row.player_id,
    playerName: row.player_name,
    teamId: row.team_id,
    teamName: row.team_name,
    side: row.side as ResultContestPlayer['side'],
    slot: row.slot as ResultContestPlayer['slot'],
  };
}

function toResult(row: Row): MatchResult {
  return {
    matchId: row.match_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status as MatchResult['status'],
    publishedAt: row.published_at,
    reopenedAt: row.reopened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromResult(result: MatchResult): Row {
  return {
    match_id: result.matchId,
    home_score: result.homeScore,
    away_score: result.awayScore,
    status: result.status,
    published_at: result.publishedAt,
    reopened_at: result.reopenedAt,
    created_at: result.createdAt,
    updated_at: result.updatedAt,
  };
}
