export type Schedule = {
  id: string;
  seasonId: string;
  name: string;
  description: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleInput = Pick<Schedule, 'seasonId' | 'name' | 'description'>;

export type SchedulePublicationFilter = 'all' | 'published' | 'draft';

export type ScheduleQuery = {
  search: string;
  seasonId: string;
  publication: SchedulePublicationFilter;
};

export type ScheduleViewMode = 'table' | 'cards';

export type ScheduleFieldErrors = Partial<Record<string, string>>;

export type ScheduleServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: ScheduleFieldErrors};
