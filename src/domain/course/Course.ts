export type Course = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  mapUrl: string;
  udiscUrl: string;
  homeTeamId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CourseInput = Pick<Course, 'name' | 'city' | 'state' | 'address' | 'mapUrl' | 'udiscUrl'>;

export type CourseStatusFilter = 'all' | 'active' | 'archived';

export type CourseQuery = {
  search: string;
  status: CourseStatusFilter;
};

export type CourseFieldErrors = Partial<Record<keyof CourseInput, string>>;

export type CourseServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: CourseFieldErrors};
