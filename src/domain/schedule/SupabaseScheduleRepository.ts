import type {SupabaseClient} from '@supabase/supabase-js';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';
import type {ScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type Tables = Database['public']['Tables'];
type ScheduleRow = Tables['launch_schedules']['Row'];
type RoundRow = Tables['launch_rounds']['Row'];
type MatchRow = Tables['launch_schedule_matches']['Row'];

export class SupabaseScheduleRepository implements ScheduleRepository {
  constructor(private readonly supabase: Client) {}

  async getSchedules(): Promise<Schedule[]> {
    const {data, error} = await this.supabase.from('launch_schedules').select('*');
    if (error) throw error;
    return data.map(toSchedule);
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    const {data, error} = await this.supabase.from('launch_schedules').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toSchedule(data) : undefined;
  }

  async getRounds(scheduleId?: string): Promise<Round[]> {
    let query = this.supabase.from('launch_rounds').select('*');
    if (scheduleId) query = query.eq('schedule_id', scheduleId);
    const {data, error} = await query;
    if (error) throw error;
    return data.map(toRound);
  }

  async getRound(id: string): Promise<Round | undefined> {
    const {data, error} = await this.supabase.from('launch_rounds').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toRound(data) : undefined;
  }

  async getMatches(roundId?: string): Promise<Match[]> {
    let query = this.supabase.from('launch_schedule_matches').select('*');
    if (roundId) query = query.eq('round_id', roundId);
    const {data, error} = await query;
    if (error) throw error;
    return data.map(toMatch);
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const {data, error} = await this.supabase.from('launch_schedule_matches').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toMatch(data) : undefined;
  }

  async createSchedule(schedule: Schedule): Promise<Schedule> {
    const {data, error} = await this.supabase.from('launch_schedules').insert(fromSchedule(schedule)).select().single();
    if (error) throw error;
    return toSchedule(data);
  }

  async updateSchedule(schedule: Schedule): Promise<Schedule | undefined> {
    const {data, error} = await this.supabase.from('launch_schedules').update(fromSchedule(schedule)).eq('id', schedule.id).select().maybeSingle();
    if (error) throw error;
    return data ? toSchedule(data) : undefined;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const {data, error} = await this.supabase.from('launch_schedules').delete().eq('id', id).select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async createRound(round: Round): Promise<Round> {
    const {data, error} = await this.supabase.from('launch_rounds').insert(fromRound(round)).select().single();
    if (error) throw error;
    return toRound(data);
  }

  async updateRound(round: Round): Promise<Round | undefined> {
    const {data, error} = await this.supabase.from('launch_rounds').update(fromRound(round)).eq('id', round.id).select().maybeSingle();
    if (error) throw error;
    return data ? toRound(data) : undefined;
  }

  async deleteRound(id: string): Promise<boolean> {
    const {data, error} = await this.supabase.from('launch_rounds').delete().eq('id', id).select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async createMatch(match: Match): Promise<Match> {
    const {data, error} = await this.supabase.from('launch_schedule_matches').insert(fromMatch(match)).select().single();
    if (error) throw error;
    return toMatch(data);
  }

  async updateMatch(match: Match): Promise<Match | undefined> {
    const {data, error} = await this.supabase.from('launch_schedule_matches').update(fromMatch(match)).eq('id', match.id).select().maybeSingle();
    if (error) throw error;
    return data ? toMatch(data) : undefined;
  }

  async deleteMatch(id: string): Promise<boolean> {
    const {data, error} = await this.supabase.from('launch_schedule_matches').delete().eq('id', id).select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async hasRecordedResults(matchIds: string[]): Promise<boolean> {
    if (!matchIds.length) return false;
    const {data, error} = await this.supabase.from('launch_match_results')
      .select('match_id')
      .in('match_id', matchIds)
      .limit(1);
    if (error) throw error;
    return data.length > 0;
  }
}

function toSchedule(row: ScheduleRow): Schedule {
  return {id: row.id, seasonId: row.season_id, name: row.name, description: row.description, published: row.published, createdAt: row.created_at, updatedAt: row.updated_at};
}

function fromSchedule(value: Schedule): ScheduleRow {
  return {id: value.id, season_id: value.seasonId, name: value.name, description: value.description, published: value.published, created_at: value.createdAt, updated_at: value.updatedAt};
}

function toRound(row: RoundRow): Round {
  return {id: row.id, scheduleId: row.schedule_id, seasonId: row.season_id, number: row.number, name: row.name, date: row.date, published: row.published, createdAt: row.created_at, updatedAt: row.updated_at};
}

function fromRound(value: Round): RoundRow {
  return {id: value.id, schedule_id: value.scheduleId, season_id: value.seasonId, number: value.number, name: value.name, date: value.date, published: value.published, created_at: value.createdAt, updated_at: value.updatedAt};
}

function toMatch(row: MatchRow): Match {
  return {
    id: row.id,
    roundId: row.round_id,
    seasonId: row.season_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    courseId: row.course_id,
    date: row.date,
    time: row.time?.slice(0, 5) ?? null,
    status: row.status as Match['status'],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromMatch(value: Match): MatchRow {
  return {
    id: value.id,
    round_id: value.roundId,
    season_id: value.seasonId,
    home_team_id: value.homeTeamId,
    away_team_id: value.awayTeamId,
    course_id: value.courseId,
    date: value.date,
    time: value.time,
    status: value.status,
    notes: value.notes,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  };
}
