import type {Team} from '@/models/Team';

export type TeamInput = Omit<Team, 'id' | 'active' | 'createdAt' | 'updatedAt'>;

export type TeamStatusFilter = 'all' | 'active' | 'archived';

export type TeamSortOption =
  | 'alphabetical'
  | 'recently-updated'
  | 'city'
  | 'course'
  | 'status';

export type TeamViewMode = 'table' | 'cards';

export type TeamQuery = {
  search: string;
  sort: TeamSortOption;
  status: TeamStatusFilter;
};

export type TeamFieldErrors = Partial<Record<keyof TeamInput, string>>;

export type TeamServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: TeamFieldErrors};
