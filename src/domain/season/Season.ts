export type Season = {
  id: string;
  name: string;
  year: number;
  description: string;
  startDate: string;
  endDate: string;
  registrationOpen: boolean;
  active: boolean;
  published: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SeasonInput = Pick<
  Season,
  'name' | 'year' | 'description' | 'startDate' | 'endDate' | 'registrationOpen' | 'published'
>;

export type SeasonStatusFilter = 'all' | 'active' | 'published' | 'draft' | 'archived';

export type SeasonViewMode = 'table' | 'cards';

export type SeasonQuery = {
  search: string;
  status: SeasonStatusFilter;
};

export type SeasonFieldErrors = Partial<Record<keyof SeasonInput, string>>;

export type SeasonServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: SeasonFieldErrors};
