export const STATS_SORT_KEYS = [
  'clashIndex',
  'matchesPlayed',
  'wins',
  'winPercentage',
  'points',
  'singles',
  'doubles',
  'ciGain',
  'singlesCiGain',
  'doublesCiGain',
] as const;

export type StatsSortKey = typeof STATS_SORT_KEYS[number];
export type StatsDirection = 'asc' | 'desc';
export type StatsLimit = 25 | 'all';
export type StatsDivision = 'Open' | 'Women';

export type StatsViewState = {
  division: StatsDivision;
  team: string;
  search: string;
  sortKey: StatsSortKey;
  direction: StatsDirection;
  limit: StatsLimit;
};

type RawStatsView = {
  division?: string | string[];
  team?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  direction?: string | string[];
  limit?: string | string[];
};

export const DEFAULT_STATS_VIEW: StatsViewState = {
  division: 'Open',
  team: 'all',
  search: '',
  sortKey: 'clashIndex',
  direction: 'desc',
  limit: 25,
};

export function parseStatsViewState(query: RawStatsView): StatsViewState {
  const division = first(query.division)?.toLowerCase() === 'women' ? 'Women' : 'Open';
  const team = first(query.team)?.trim() || 'all';
  const search = first(query.q)?.trim() || '';
  const requestedSort = first(query.sort);
  const sortKey = STATS_SORT_KEYS.find((key) => key === requestedSort) ?? 'clashIndex';
  const direction = first(query.direction) === 'asc' ? 'asc' : 'desc';
  const limit = first(query.limit) === 'all' ? 'all' : 25;
  return {division, team, search, sortKey, direction, limit};
}

export function toStatsViewSearchParams(
  seasonId: string,
  view: StatsViewState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (seasonId !== 'overall') params.set('season', seasonId);
  if (view.division === 'Women') params.set('division', 'women');
  if (view.team !== 'all') params.set('team', view.team);
  if (view.search) params.set('q', view.search);
  if (view.sortKey !== 'clashIndex') params.set('sort', view.sortKey);
  if (view.direction !== 'desc') params.set('direction', view.direction);
  if (view.limit !== 25) params.set('limit', view.limit);
  return params;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
