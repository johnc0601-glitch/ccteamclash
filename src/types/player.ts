import type {Player} from '@/models/Player';

export type PlayerInput = Omit<Player, 'id' | 'active' | 'createdAt' | 'updatedAt'>;

export type PlayerStatusFilter = 'all' | 'active' | 'archived';

export type PlayerQuery = {
  search: string;
  teamId: string;
  status: PlayerStatusFilter;
};

export type PlayerFieldErrors = Partial<Record<keyof PlayerInput, string>>;

export type PlayerServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: PlayerFieldErrors};
