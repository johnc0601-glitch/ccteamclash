import type {SupabaseClient} from '@supabase/supabase-js';
import type {Course} from '@/domain/course/Course';
import type {CourseRepository} from '@/domain/course/CourseRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['launch_courses']['Row'];

export class SupabaseCourseRepository implements CourseRepository {
  constructor(private readonly supabase: Client) {}

  async getAll(): Promise<Course[]> {
    const {data, error} = await this.supabase.from('launch_courses').select('*');
    if (error) throw error;
    return data.map(toCourse);
  }

  async getById(id: string): Promise<Course | undefined> {
    const {data, error} = await this.supabase.from('launch_courses').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toCourse(data) : undefined;
  }

  async create(course: Course): Promise<Course> {
    const {data, error} = await this.supabase.from('launch_courses').insert(fromCourse(course)).select().single();
    if (error) throw error;
    return toCourse(data);
  }

  async update(course: Course): Promise<Course | undefined> {
    const {data, error} = await this.supabase.from('launch_courses').update(fromCourse(course)).eq('id', course.id).select().maybeSingle();
    if (error) throw error;
    return data ? toCourse(data) : undefined;
  }

  async setActive(id: string, active: boolean): Promise<Course | undefined> {
    const {data, error} = await this.supabase.from('launch_courses')
      .update({active, updated_at: new Date().toISOString()}).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data ? toCourse(data) : undefined;
  }
}

function toCourse(row: Row): Course {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    address: row.address,
    mapUrl: row.map_url,
    udiscUrl: row.udisc_url,
    photoUrl: row.photo_url,
    description: row.description,
    homeTeamId: row.home_team_id ?? undefined,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromCourse(course: Course): Row {
  return {
    id: course.id,
    name: course.name,
    city: course.city,
    state: course.state,
    address: course.address,
    map_url: course.mapUrl,
    udisc_url: course.udiscUrl,
    photo_url: course.photoUrl,
    description: course.description,
    home_team_id: course.homeTeamId ?? null,
    active: course.active,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
  };
}
