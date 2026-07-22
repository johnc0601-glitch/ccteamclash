import {list, put} from '@vercel/blob';
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

const COURSE_STORE_PATH = 'content/courses.json';
const COURSE_STORE_TIMEOUT_MS = 2500;

type CoursePayload = {
  courses: Course[];
};

class CourseListRepository implements CourseRepository {
  private courses: Course[];

  constructor(courses: Course[]) {
    this.courses = courses.map(cloneCourse);
  }

  async getAll(): Promise<Course[]> {
    return this.courses.map(cloneCourse);
  }

  async getById(id: string): Promise<Course | undefined> {
    const course = this.courses.find((candidate) => candidate.id === id);
    return course ? cloneCourse(course) : undefined;
  }

  async create(course: Course): Promise<Course> {
    this.courses.push(cloneCourse(course));
    return cloneCourse(course);
  }

  async update(course: Course): Promise<Course | undefined> {
    const index = this.courses.findIndex((candidate) => candidate.id === course.id);
    if (index === -1) return undefined;

    this.courses[index] = cloneCourse(course);
    return cloneCourse(this.courses[index]);
  }

  async setActive(id: string, active: boolean): Promise<Course | undefined> {
    const course = this.courses.find((candidate) => candidate.id === id);
    if (!course) return undefined;

    course.active = active;
    course.updatedAt = new Date().toISOString();
    return cloneCourse(course);
  }
}

export async function getStoredCourses(query: Partial<CourseQuery> = {}): Promise<Course[]> {
  const repository = new CourseListRepository(await loadCourses());
  const service = new CourseService(repository);
  return service.getAll(query);
}

export async function createStoredCourse(input: CourseInput): Promise<CourseServiceResult<Course>> {
  return mutateCourses((service) => service.create(input));
}

export async function updateStoredCourse(id: string, input: CourseInput): Promise<CourseServiceResult<Course>> {
  return mutateCourses((service) => service.update(id, input));
}

export async function archiveStoredCourse(id: string): Promise<CourseServiceResult<Course>> {
  return mutateCourses((service) => service.archive(id));
}

export async function restoreStoredCourse(id: string): Promise<CourseServiceResult<Course>> {
  return mutateCourses((service) => service.restore(id));
}

export async function importStoredCourses(inputs: CourseImportInput[]): Promise<CourseImportResult> {
  const repository = new CourseListRepository(await loadCourses());
  const service = new CourseService(repository);
  const result = await service.importCourses(inputs);
  await saveCourses(await repository.getAll());
  return result;
}

async function mutateCourses(
  action: (service: CourseService) => Promise<CourseServiceResult<Course>>,
): Promise<CourseServiceResult<Course>> {
  const repository = new CourseListRepository(await loadCourses());
  const service = new CourseService(repository);
  const result = await action(service);

  if (result.ok) {
    await saveCourses(await repository.getAll());
  }

  return result;
}

async function loadCourses(): Promise<Course[]> {
  if (!isBlobConnected()) {
    return getSeedCourses();
  }

  try {
    const result = await withTimeout(list({
      prefix: COURSE_STORE_PATH,
      limit: 1,
    }));
    const courseBlob = result.blobs.find((blob) => blob.pathname === COURSE_STORE_PATH);

    if (!courseBlob) {
      return getSeedCourses();
    }

    const response = await fetch(courseBlob.url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(COURSE_STORE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return getSeedCourses();
    }

    const payload = await response.json() as Partial<CoursePayload>;
    return normalizeCourses(payload.courses);
  } catch {
    return getSeedCourses();
  }
}

async function saveCourses(courses: Course[]): Promise<Course[]> {
  if (!isBlobConnected()) {
    throw new Error('Course storage is not connected yet.');
  }

  const normalizedCourses = normalizeCourses(courses);
  await put(COURSE_STORE_PATH, JSON.stringify({courses: normalizedCourses}, null, 2), {
    access: 'public',
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: 'application/json',
  });

  return normalizedCourses;
}

async function getSeedCourses(): Promise<Course[]> {
  const repository = new MockCourseRepository();
  return normalizeCourses(await repository.getAll());
}

function normalizeCourses(courses: unknown): Course[] {
  if (!Array.isArray(courses)) return [];

  return courses
    .map(normalizeCourse)
    .filter((course): course is Course => Boolean(course));
}

function normalizeCourse(value: unknown): Course | null {
  if (!value || typeof value !== 'object') return null;

  const course = value as Partial<Course>;
  const id = cleanText(course.id);
  const name = cleanText(course.name);
  const city = cleanText(course.city);
  const state = cleanText(course.state).toUpperCase();
  const mapUrl = cleanText(course.mapUrl);

  if (!id || !name || !city || !state || !mapUrl) return null;

  return {
    id,
    name,
    city,
    state,
    address: cleanText(course.address),
    mapUrl,
    udiscUrl: cleanText(course.udiscUrl),
    photoUrl: cleanText(course.photoUrl),
    description: cleanText(course.description),
    homeTeamId: cleanText(course.homeTeamId) || undefined,
    active: course.active !== false,
    createdAt: cleanText(course.createdAt) || new Date().toISOString(),
    updatedAt: cleanText(course.updatedAt) || new Date().toISOString(),
  };
}

function cloneCourse(course: Course): Course {
  return {...course};
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isBlobConnected(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Course storage timed out.')), COURSE_STORE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
