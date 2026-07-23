import type {
  Course,
  CourseFieldErrors,
  CourseImportInput,
  CourseImportResult,
  CourseInput,
  CourseQuery,
  CourseServiceResult,
} from '@/domain/course/Course';
import type {CourseRepository} from '@/domain/course/CourseRepository';
import {createSlug} from '@/shared/utils/slug';

const DEFAULT_QUERY: CourseQuery = {search: '', status: 'all'};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export class CourseService {
  private readonly repository: CourseRepository;

  constructor(repository: CourseRepository) {
    this.repository = repository;
  }

  async getAll(query: Partial<CourseQuery> = {}): Promise<Course[]> {
    const resolvedQuery = {...DEFAULT_QUERY, ...query};
    const search = normalize(resolvedQuery.search);
    const courses = await this.repository.getAll();

    return courses
      .filter((course) => {
        if (resolvedQuery.status === 'active' && !course.active) return false;
        if (resolvedQuery.status === 'archived' && course.active) return false;
        return !search || [course.name, course.city, course.state, course.address]
          .some((value) => normalize(value).includes(search));
      })
      .sort((left, right) => left.name.localeCompare(right.name, undefined, {sensitivity: 'base'}));
  }

  async getById(id: string): Promise<Course | undefined> {
    return this.repository.getById(id);
  }

  async create(input: CourseInput): Promise<CourseServiceResult<Course>> {
    const validated = await this.validate(input);
    if (this.hasErrors(validated.fieldErrors)) return this.validationResult(validated.fieldErrors);

    const timestamp = new Date().toISOString();
    const course: Course = {
      ...validated.input,
      id: this.createId(validated.input.name),
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return {ok: true, data: await this.repository.create(course)};
  }

  async update(id: string, input: CourseInput): Promise<CourseServiceResult<Course>> {
    const existing = await this.repository.getById(id);
    if (!existing) return this.notFoundResult();

    const validated = await this.validate(input, id);
    if (this.hasErrors(validated.fieldErrors)) return this.validationResult(validated.fieldErrors);

    const updated = await this.repository.update({
      ...existing,
      ...validated.input,
      updatedAt: new Date().toISOString(),
    });
    return updated ? {ok: true, data: updated} : this.notFoundResult();
  }

  async archive(id: string): Promise<CourseServiceResult<Course>> {
    return this.changeStatus(id, false);
  }

  async restore(id: string): Promise<CourseServiceResult<Course>> {
    return this.changeStatus(id, true);
  }

  async importCourses(inputs: CourseImportInput[]): Promise<CourseImportResult> {
    const result: CourseImportResult = {created: [], updated: [], skipped: []};

    for (const [index, input] of inputs.entries()) {
      const row = index + 1;
      const existing = await this.findExistingCourse(input);
      const validated = await this.validate(input, existing?.id);

      if (this.hasErrors(validated.fieldErrors)) {
        result.skipped.push({
          row,
          message: 'Review the highlighted course fields.',
          fieldErrors: validated.fieldErrors,
        });
        continue;
      }

      const timestamp = new Date().toISOString();
      const active = input.active ?? existing?.active ?? true;

      if (existing) {
        const updated = await this.repository.update({
          ...existing,
          ...validated.input,
          active,
          updatedAt: timestamp,
        });
        if (updated) result.updated.push(updated);
        continue;
      }

      const created = await this.repository.create({
        ...validated.input,
        id: this.createId(validated.input.name),
        active,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      result.created.push(created);
    }

    return result;
  }

  private async changeStatus(id: string, active: boolean): Promise<CourseServiceResult<Course>> {
    const existing = await this.repository.getById(id);
    if (!existing) return this.notFoundResult();
    if (existing.active === active) {
      return {ok: false, message: active ? 'This course is already active.' : 'This course is already archived.'};
    }

    const updated = await this.repository.setActive(id, active);
    return updated ? {ok: true, data: updated} : this.notFoundResult();
  }

  private async validate(input: CourseInput, currentId?: string): Promise<{
    input: CourseInput;
    fieldErrors: CourseFieldErrors;
  }> {
    const normalizedInput: CourseInput = {
      name: input.name.trim(),
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      address: input.address.trim(),
      mapUrl: input.mapUrl.trim(),
      udiscUrl: input.udiscUrl.trim(),
      photoUrl: input.photoUrl.trim(),
      description: input.description.trim(),
      homeTeamId: input.homeTeamId?.trim() || undefined,
    };
    const fieldErrors: CourseFieldErrors = {};

    if (!normalizedInput.name) fieldErrors.name = 'Course name is required.';
    if (!normalizedInput.city) fieldErrors.city = 'City is required.';
    if (!/^[A-Z]{2}$/.test(normalizedInput.state)) fieldErrors.state = 'Use a two-letter state code.';
    if (!normalizedInput.mapUrl) {
      fieldErrors.mapUrl = 'Google Maps link is required.';
    } else if (!isWebUrl(normalizedInput.mapUrl)) {
      fieldErrors.mapUrl = 'Enter a valid web link.';
    }
    if (normalizedInput.udiscUrl && !isWebUrl(normalizedInput.udiscUrl)) {
      fieldErrors.udiscUrl = 'Enter a valid web link.';
    }
    if (normalizedInput.photoUrl && !isWebUrl(normalizedInput.photoUrl)) {
      fieldErrors.photoUrl = 'Enter a valid web link.';
    }

    const courses = await this.repository.getAll();
    const duplicate = courses.some((course) =>
      course.id !== currentId
      && normalize(course.name) === normalize(normalizedInput.name)
      && normalize(course.city) === normalize(normalizedInput.city));
    if (duplicate) fieldErrors.name = 'This course is already in the directory.';

    return {input: normalizedInput, fieldErrors};
  }

  private createId(name: string): string {
    const slug = createSlug(name);
    const uniquePart = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
    return `${slug || 'course'}-${uniquePart}`;
  }

  private hasErrors(errors: CourseFieldErrors): boolean {
    return Object.keys(errors).length > 0;
  }

  private validationResult<T>(fieldErrors: CourseFieldErrors): CourseServiceResult<T> {
    return {ok: false, message: 'Review the highlighted course fields.', fieldErrors};
  }

  private notFoundResult<T>(): CourseServiceResult<T> {
    return {ok: false, message: 'Course not found.'};
  }

  private async findExistingCourse(input: CourseImportInput): Promise<Course | undefined> {
    const courses = await this.repository.getAll();
    return courses.find((course) =>
      normalize(course.name) === normalize(input.name)
      && normalize(course.city) === normalize(input.city));
  }
}
