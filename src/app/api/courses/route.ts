import type {CourseImportInput, CourseInput, CourseQuery} from '@/domain/course/Course';
import {
  archiveStoredCourse,
  createStoredCourse,
  getStoredCourses,
  importStoredCourses,
  restoreStoredCourse,
  updateStoredCourse,
} from '@/services/courses/CourseStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CourseActionPayload =
  | {action: 'create'; input: CourseInput}
  | {action: 'update'; id: string; input: CourseInput}
  | {action: 'archive'; id: string}
  | {action: 'restore'; id: string}
  | {action: 'import'; inputs: CourseImportInput[]};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query: Partial<CourseQuery> = {
    search: url.searchParams.get('search') ?? '',
    status: (url.searchParams.get('status') as CourseQuery['status'] | null) ?? 'all',
  };
  const courses = await getStoredCourses(query);
  return Response.json({courses});
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Partial<CourseActionPayload>;

    if (payload.action === 'create' && payload.input) {
      return courseResponse(await createStoredCourse(payload.input));
    }
    if (payload.action === 'update' && payload.id && payload.input) {
      return courseResponse(await updateStoredCourse(payload.id, payload.input));
    }
    if (payload.action === 'archive' && payload.id) {
      return courseResponse(await archiveStoredCourse(payload.id));
    }
    if (payload.action === 'restore' && payload.id) {
      return courseResponse(await restoreStoredCourse(payload.id));
    }
    if (payload.action === 'import' && Array.isArray(payload.inputs)) {
      const result = await importStoredCourses(payload.inputs);
      const courses = await getStoredCourses();
      return Response.json({result, courses});
    }

    return Response.json({error: 'Unsupported course action.'}, {status: 400});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Courses could not be saved.';
    return Response.json({error: message}, {status: 400});
  }
}

async function courseResponse(result: Awaited<ReturnType<typeof createStoredCourse>>) {
  if (!result.ok) {
    return Response.json(result, {status: 400});
  }

  const courses = await getStoredCourses();
  return Response.json({...result, courses});
}
