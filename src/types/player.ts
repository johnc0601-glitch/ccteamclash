import type {Player} from '@/models/Player';

export type PlayerInput = Omit<Player, 'id' | 'active' | 'createdAt' | 'updatedAt'>;

export type PlayerStatusFilter = 'all' | 'active' | 'archived';

export type PlayerSortOption =
  | 'alphabetical'
  | 'recently-updated'
  | 'team'
  | 'rating'
  | 'status';

export type PlayerViewMode = 'table' | 'cards';

export type PlayerQuery = {
  search: string;
  teamId: string;
  status: PlayerStatusFilter;
  sort: PlayerSortOption;
};

export type PlayerFieldErrors = Partial<Record<keyof PlayerInput, string>>;

export type PlayerServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: PlayerFieldErrors};
