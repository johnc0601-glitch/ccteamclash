export type Season = {
  id: string;
  leagueId: string;
  name: string;
  year: number;
  description: string;
  startDate: string;
  endDate: string;
  registrationOpen: boolean;
  mensRosterCap: number;
  womensRosterCap: number | null;
  juniorRosterCap: number | null;
  rosterRulesLockAt: string | null;
  rosterRulesLockedAt: string | null;
  rosterRulesLocked: boolean;
  active: boolean;
  published: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SeasonInput = Pick<
  Season,
  'name' | 'year' | 'description' | 'startDate' | 'endDate' | 'registrationOpen'
  | 'mensRosterCap' | 'womensRosterCap' | 'juniorRosterCap' | 'published'
>;

export type SeasonRosterRulesState = Pick<
  Season,
  'rosterRulesLockAt' | 'rosterRulesLockedAt' | 'rosterRulesLocked'
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
