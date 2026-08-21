import 'server-only';

import type {
  Course,
  CourseImportInput,
  CourseImportResult,
  CourseInput,
  CourseQuery,
  CourseServiceResult,
} from '@/domain/course/Course';
import type {CourseRepository} from '@/domain/course/CourseRepository';
import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {CourseService} from '@/domain/course/CourseService';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';

type LaunchCourseRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  map_url: string;
  udisc_url: string;
  photo_url: string;
  description: string;
  home_team_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

class SupabaseCourseRepository implements CourseRepository {
  async getAll(): Promise<Course[]> {
    if (!hasSupabaseConfig()) return getSeedCourses();
    const supabase = await createClient();
    const {data, error} = await (supabase as any).from('launch_courses').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map(toCourse);
  }

  async getById(id: string): Promise<Course | undefined> {
    if (!hasSupabaseConfig()) return (await getSeedCourses()).find((course) => course.id === id);
    const supabase = await createClient();
    const {data, error} = await (supabase as any).from('launch_courses').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toCourse(data) : undefined;
  }

  async create(course: Course): Promise<Course> {
    const supabase = await requireSupabase();
    const {data, error} = await (supabase as any).from('launch_courses').insert(fromCourse(course)).select('*').single();
    if (error) throw error;
    return toCourse(data);
  }

  async update(course: Course): Promise<Course | undefined> {
    const supabase = await requireSupabase();
    const {data, error} = await (supabase as any)
      .from('launch_courses')
      .update(fromCourse(course))
      .eq('id', course.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? toCourse(data) : undefined;
  }

  async setActive(id: string, active: boolean): Promise<Course | undefined> {
    const supabase = await requireSupabase();
    const {data, error} = await (supabase as any)
      .from('launch_courses')
      .update({active, updated_at: new Date().toISOString()})
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? toCourse(data) : undefined;
  }
}

export async function getStoredCourses(query: Partial<CourseQuery> = {}): Promise<Course[]> {
  return new CourseService(new SupabaseCourseRepository()).getAll(query);
}

export async function createStoredCourse(input: CourseInput): Promise<CourseServiceResult<Course>> {
  return runCourseMutation((service) => service.create(input));
}

export async function updateStoredCourse(id: string, input: CourseInput): Promise<CourseServiceResult<Course>> {
  return runCourseMutation((service) => service.update(id, input));
}

export async function archiveStoredCourse(id: string): Promise<CourseServiceResult<Course>> {
  return runCourseMutation((service) => service.archive(id));
}

export async function restoreStoredCourse(id: string): Promise<CourseServiceResult<Course>> {
  return runCourseMutation((service) => service.restore(id));
}

export async function importStoredCourses(inputs: CourseImportInput[]): Promise<CourseImportResult> {
  if (!hasSupabaseConfig()) {
    return {
      created: [],
      updated: [],
      skipped: inputs.map((_, index) => ({row: index + 1, message: 'Course storage is not connected yet.'})),
    };
  }
  const service = new CourseService(new SupabaseCourseRepository());
  return service.importCourses(inputs);
}

async function runCourseMutation(
  action: (service: CourseService) => Promise<CourseServiceResult<Course>>,
): Promise<CourseServiceResult<Course>> {
  if (!hasSupabaseConfig()) return {ok: false, message: 'Course storage is not connected yet.'};
  try {
    return await action(new CourseService(new SupabaseCourseRepository()));
  } catch (error) {
    return {ok: false, message: error instanceof Error ? error.message : 'Course could not be saved.'};
  }
}

async function requireSupabase() {
  if (!hasSupabaseConfig()) throw new Error('Course storage is not connected yet.');
  return createClient();
}

function toCourse(row: LaunchCourseRow): Course {
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

function fromCourse(course: Course) {
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

async function getSeedCourses(): Promise<Course[]> {
  const repository = new MockCourseRepository();
  return repository.getAll();
}
