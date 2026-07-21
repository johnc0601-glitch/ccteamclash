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

export type CourseInput = Pick<Course, 'name' | 'city' | 'state' | 'address' | 'mapUrl' | 'udiscUrl' | 'homeTeamId'>;

export type CourseImportInput = CourseInput & {
  active?: boolean;
};

export type CourseImportResult = {
  created: Course[];
  updated: Course[];
  skipped: Array<{
    row: number;
    message: string;
    fieldErrors?: CourseFieldErrors;
  }>;
};

export type CourseStatusFilter = 'all' | 'active' | 'archived';

export type CourseQuery = {
  search: string;
  status: CourseStatusFilter;
};

export type CourseFieldErrors = Partial<Record<keyof CourseInput, string>>;

export type CourseServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: CourseFieldErrors};
