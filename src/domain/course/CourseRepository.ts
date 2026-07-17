import type {Course} from '@/domain/course/Course';

export interface CourseRepository {
  getAll(): Promise<Course[]>;
  getById(id: string): Promise<Course | undefined>;
}

const COURSE_MOCK_DATA = [
  {
    id: 'castle-hayne',
    name: 'Castle Hayne Disc Golf Course',
    city: 'Wilmington',
    state: 'NC',
    homeTeamId: 'chain-hawks',
    active: true,
  },
  {
    id: 'northwest-district',
    name: 'Northwest District Park',
    city: 'Leland',
    state: 'NC',
    homeTeamId: 'dark-knights',
    active: true,
  },
  {
    id: 'arrowhead-park',
    name: 'Arrowhead Park',
    city: 'Wilmington',
    state: 'NC',
    homeTeamId: 'ninjas',
    active: true,
  },
  {
    id: 'joe-eakes',
    name: 'Joe Eakes Park',
    city: 'Carolina Beach',
    state: 'NC',
    homeTeamId: 'bogey-men',
    active: true,
  },
  {
    id: 'harbour-village',
    name: 'Harbour Village',
    city: 'Hampstead',
    state: 'NC',
    homeTeamId: 'beast-mode',
    active: true,
  },
  {
    id: 'coastal-disc-golf-complex',
    name: 'Coastal Disc Golf Complex',
    city: 'Wilmington',
    state: 'NC',
    active: true,
  },
] as const satisfies readonly Course[];

function cloneCourse(course: Course): Course {
  return {...course};
}

export class MockCourseRepository implements CourseRepository {
  private courses: Course[] = COURSE_MOCK_DATA.map(cloneCourse);

  async getAll(): Promise<Course[]> {
    return this.courses.map(cloneCourse);
  }

  async getById(id: string): Promise<Course | undefined> {
    const course = this.courses.find((candidate) => candidate.id === id);
    return course ? cloneCourse(course) : undefined;
  }
}
