export const SEASON_ROSTER_CATEGORIES = ['Men', 'Women', 'Junior'] as const;

export type SeasonRosterCategory = typeof SEASON_ROSTER_CATEGORIES[number];
export type SeasonRosterMembershipStatus = 'Active' | 'Dropped';

export type SeasonTeam = {
  id: string;
  seasonId: string;
  teamId: string;
  addedBy: string;
  createdAt: string;
};

export type SeasonRosterMembership = {
  id: string;
  seasonId: string;
  teamId: string;
  playerId: string;
  rosterCategory: SeasonRosterCategory;
  status: SeasonRosterMembershipStatus;
  addedBy: string;
  addedAt: string;
  droppedBy: string | null;
  droppedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SeasonRosterCaps = Record<SeasonRosterCategory, number | null>;
export type SeasonRosterCounts = Record<SeasonRosterCategory, number>;
export type SeasonRosterCapacity = Record<SeasonRosterCategory, number | null>;

export type AddSeasonRosterMembershipInput = {
  seasonId: string;
  teamId: string;
  playerId: string;
  rosterCategory: SeasonRosterCategory;
};

export type DropSeasonRosterMembershipInput = {
  seasonId: string;
  playerId: string;
};

export type SeasonRosterServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string};

export function isSeasonRosterCategory(value: unknown): value is SeasonRosterCategory {
  return typeof value === 'string'
    && SEASON_ROSTER_CATEGORIES.includes(value as SeasonRosterCategory);
}
