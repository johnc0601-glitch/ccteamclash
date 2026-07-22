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
    id: 'beast-on-honey-hill',
    name: 'Beast on Honey Hill',
    city: 'Whiteville',
    state: 'NC',
    address: '2210 Honey Hill Rd, Hallsboro, NC 28442',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=2210+Honey+Hill+Rd+Hallsboro+NC+28442',
    udiscUrl: '',
    photoUrl: '',
    description: 'League course details and current layout information are maintained on UDisc.',
    homeTeamId: 'beast-mode',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'castle-hayne-park',
    name: 'Castle Hayne Park',
    city: 'Castle Hayne',
    state: 'NC',
    address: '4700 Old Ave, Castle Hayne, NC 28429',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=4700+Old+Ave+Castle+Hayne+NC+28429',
    udiscUrl: '',
    photoUrl: '',
    description: 'League course details and current layout information are maintained on UDisc.',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cougar-country',
    name: 'Cougar Country',
    city: 'Boiling Spring Lakes',
    state: 'NC',
    address: '1 Leeds Rd, Boiling Spring Lakes, NC 28461',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=1+Leeds+Rd+Boiling+Spring+Lakes+NC+28461',
    udiscUrl: '',
    photoUrl: '',
    description: 'League course details and current layout information are maintained on UDisc.',
    homeTeamId: 'cougar-country',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'joe-eakes',
    name: 'Joe Eakes Park',
    city: 'Kure Beach',
    state: 'NC',
    address: 'K Avenue & S 7th Ave, Kure Beach, NC 28449',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=K+Avenue+%26+S+7th+Ave+Kure+Beach+NC+28449',
    udiscUrl: '',
    photoUrl: '',
    description: 'League course details and current layout information are maintained on UDisc.',
    homeTeamId: 'kb',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'northeast-creek-park',
    name: 'Northeast Creek Park',
    city: 'Jacksonville',
    state: 'NC',
    address: '910 Corbin St, Jacksonville, NC 28546',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=910+Corbin+St+Jacksonville+NC+28546',
    udiscUrl: '',
    photoUrl: '',
    description: 'League course details and current layout information are maintained on UDisc.',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'splinter-city',
    name: 'Splinter City',
    city: 'Myrtle Beach',
    state: 'SC',
    address: '3383 Splinter City Rd, Myrtle Beach, SC 29577',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=3383+Splinter+City+Rd+Myrtle+Beach+SC+29577',
    udiscUrl: '',
    photoUrl: '',
    description: 'League course details and current layout information are maintained on UDisc.',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'wild-turkey',
    name: 'Wild Turkey',
    city: 'Hampstead',
    state: 'NC',
    address: '20000 US-17, Hampstead, NC 28443',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=20000+US-17+Hampstead+NC+28443',
    udiscUrl: '',
    photoUrl: '',
    description: 'League course details and current layout information are maintained on UDisc.',
    homeTeamId: 'wild-turkey',
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
