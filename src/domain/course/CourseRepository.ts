import type {Course} from '@/domain/course/Course';

export interface CourseRepository {
  getAll(): Promise<Course[]>;
  getById(id: string): Promise<Course | undefined>;
  create(course: Course): Promise<Course>;
  update(course: Course): Promise<Course | undefined>;
  setActive(id: string, active: boolean): Promise<Course | undefined>;
}

const COURSE_MOCK_DATA = [
  {
    id: 'castle-hayne',
    name: 'Castle Hayne Disc Golf Course',
    city: 'Wilmington',
    state: 'NC',
    address: '',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Castle+Hayne+Disc+Golf+Course+Wilmington+NC',
    udiscUrl: '',
    photoUrl: '',
    description: 'A core league course for CC Team Clash play.',
    homeTeamId: 'chain-hawks',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'northwest-district',
    name: 'Northwest District Park',
    city: 'Leland',
    state: 'NC',
    address: '',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Northwest+District+Park+Leland+NC',
    udiscUrl: '',
    photoUrl: '',
    description: 'A league travel stop with course details maintained on UDisc.',
    homeTeamId: 'dark-knights',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'arrowhead-park',
    name: 'Arrowhead Park',
    city: 'Wilmington',
    state: 'NC',
    address: '',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Arrowhead+Park+Wilmington+NC',
    udiscUrl: '',
    photoUrl: '',
    description: 'A Wilmington-area course used for league competition.',
    homeTeamId: 'ninjas',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'joe-eakes',
    name: 'Joe Eakes Park',
    city: 'Carolina Beach',
    state: 'NC',
    address: '',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Joe+Eakes+Park+Carolina+Beach+NC',
    udiscUrl: '',
    photoUrl: '',
    description: 'A coastal league course with full course information available on UDisc.',
    homeTeamId: 'bogey-men',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'harbour-village',
    name: 'Harbour Village',
    city: 'Hampstead',
    state: 'NC',
    address: '',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Harbour+Village+Hampstead+NC',
    udiscUrl: '',
    photoUrl: '',
    description: 'A Hampstead course included in the league course directory.',
    homeTeamId: 'beast-mode',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'coastal-disc-golf-complex',
    name: 'Coastal Disc Golf Complex',
    city: 'Wilmington',
    state: 'NC',
    address: '',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Coastal+Disc+Golf+Complex+Wilmington+NC',
    udiscUrl: '',
    photoUrl: '',
    description: 'A local disc golf complex listed for league travel and directions.',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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

  async create(course: Course): Promise<Course> {
    const storedCourse = cloneCourse(course);
    this.courses.push(storedCourse);
    return cloneCourse(storedCourse);
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
