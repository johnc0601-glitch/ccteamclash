import 'server-only';

import type {
  Course,
  CourseImportInput,
  CourseImportResult,
  CourseInput,
  CourseQuery,
  CourseServiceResult,
} from '@/domain/course/Course';
import {CourseService} from '@/domain/course/CourseService';
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';

export async function getStoredCourses(query: Partial<CourseQuery> = {}): Promise<Course[]> {
  return (await createCourseService()).getAll(query);
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
  return (await createCourseService()).importCourses(inputs);
}

async function runCourseMutation(
  action: (service: CourseService) => Promise<CourseServiceResult<Course>>,
): Promise<CourseServiceResult<Course>> {
  if (!hasSupabaseConfig()) return {ok: false, message: 'Course storage is not connected yet.'};
  try {
    return await action(await createCourseService());
  } catch (error) {
    return {ok: false, message: error instanceof Error ? error.message : 'Course could not be saved.'};
  }
}

async function createCourseService(): Promise<CourseService> {
  if (!hasSupabaseConfig()) throw new Error('Course storage is not connected yet.');
  const supabase = await createClient();
  return new CourseService(new SupabaseCourseRepository(supabase));
}
