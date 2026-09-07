import type {Course} from '@/domain/course/Course';

export interface CourseRepository {
  getAll(): Promise<Course[]>;
  getById(id: string): Promise<Course | undefined>;
  create(course: Course): Promise<Course>;
  update(course: Course): Promise<Course | undefined>;
  setActive(id: string, active: boolean): Promise<Course | undefined>;
}
