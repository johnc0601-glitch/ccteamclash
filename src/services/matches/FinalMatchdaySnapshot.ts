import type {SupabaseClient} from '@supabase/supabase-js';

export type FinalMatchTeam = {
  id: string;
  name: string;
  shortName: string | null;
  logo: string;
  primaryColor: string | null;
  secondaryColor: string | null;
};

export type FinalMatchCourse = {
  id: string;
  name: string;
  mapUrl: string | null;
};

export type FinalMatchPlayer = {
  id: string;
  name: string;
};

export type FinalMatchContest = {
  id: string;
  format: 'Singles' | 'Doubles';
  position: number;
  awayOutcome: 'W' | 'L' | 'T';
  homeOutcome: 'W' | 'L' | 'T';
  awayPlayers: FinalMatchPlayer[];
  homePlayers: FinalMatchPlayer[];
  unplayed?: boolean;
};

export type FinalMatchWeather = {
  temperature: number;
  condition: 'sun' | 'cloudy' | 'rain' | 'storm';
  wind: number | null;
  windDirection: string | null;
};

export type FinalMatchdaySnapshot = {
  matchId: string;
  roundNumber: number | null;
  date: string;
  time: string | null;
  course: FinalMatchCourse;
  awayTeam: FinalMatchTeam;
  homeTeam: FinalMatchTeam;
  awayScore: number;
  homeScore: number;
  contests: FinalMatchContest[];
  homeAdjustmentLabel?: string;
  awayAdjustmentLabel?: string;
  weather: FinalMatchWeather | null;
  publishedAt: string | null;
};

type SnapshotRow = {
  match_id: string;
  payload: unknown;
  weather: unknown;
  published_at: string | null;
};

export async function getFinalMatchdaySnapshot(
  supabase: SupabaseClient,
  routeKey: string,
): Promise<FinalMatchdaySnapshot | undefined> {
  const key = routeKey.trim();
  if (!key || key.length > 240) return undefined;

  const {data, error} = await (supabase as any)
    .from('launch_match_final_snapshots')
    .select('match_id,payload,weather,published_at')
    .contains('route_keys', [key])
    .eq('locked', true)
    .maybeSingle();

  if (error) {
    // During a rolling deploy the code may arrive before the additive migration.
    // Fall back to the normal Matchday loader rather than breaking the route.
    console.error('Final Matchday snapshot lookup failed.', {routeKey: key, error: error.message});
    return undefined;
  }
  return data ? parseSnapshot(data as SnapshotRow) : undefined;
}

export async function saveFinalMatchdayWeather(
  supabase: SupabaseClient,
  matchId: string,
  weather: FinalMatchWeather,
): Promise<void> {
  const {error} = await (supabase as any)
    .from('launch_match_final_snapshots')
    .update({weather})
    .eq('match_id', matchId)
    .eq('locked', true);
  if (error) throw error;
}

function parseSnapshot(row: SnapshotRow): FinalMatchdaySnapshot | undefined {
  if (!row.payload || typeof row.payload !== 'object') return undefined;
  const payload = row.payload as Record<string, unknown>;
  const awayTeam = parseTeam(payload.awayTeam);
  const homeTeam = parseTeam(payload.homeTeam);
  const course = parseCourse(payload.course);
  const awayScore = readMatchScore(payload.awayScore);
  const homeScore = readMatchScore(payload.homeScore);
  const date = readString(payload.date);
  if (!awayTeam || !homeTeam || !course || awayScore === null || homeScore === null || !date) return undefined;

  return {
    matchId: row.match_id,
    roundNumber: readInteger(payload.roundNumber),
    date,
    time: readString(payload.time),
    course,
    awayTeam,
    homeTeam,
    awayScore,
    homeScore,
    contests: parseContests(payload.contests),
    homeAdjustmentLabel: readString(payload.homeAdjustmentLabel) ?? undefined,
    awayAdjustmentLabel: readString(payload.awayAdjustmentLabel) ?? undefined,
    weather: parseWeather(row.weather),
    publishedAt: row.published_at,
  };
}

function parseTeam(value: unknown): FinalMatchTeam | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const team = value as Record<string, unknown>;
  const id = readString(team.id);
  const name = readString(team.name);
  if (!id || !name) return undefined;
  return {
    id,
    name,
    shortName: readString(team.shortName),
    logo: readString(team.logo) ?? '',
    primaryColor: readString(team.primaryColor),
    secondaryColor: readString(team.secondaryColor),
  };
}

function parseCourse(value: unknown): FinalMatchCourse | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const course = value as Record<string, unknown>;
  const id = readString(course.id);
  const name = readString(course.name);
  if (!id || !name) return undefined;
  return {id, name, mapUrl: readString(course.mapUrl)};
}

function parseContests(value: unknown): FinalMatchContest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): FinalMatchContest[] => {
    if (!item || typeof item !== 'object') return [];
    const contest = item as Record<string, unknown>;
    const id = readString(contest.id);
    const format = contest.format === 'Singles' || contest.format === 'Doubles' ? contest.format : null;
    const position = readInteger(contest.position);
    const awayOutcome = readOutcome(contest.awayOutcome);
    const homeOutcome = readOutcome(contest.homeOutcome);
    if (!id || !format || position === null || !awayOutcome || !homeOutcome) return [];
    return [{
      id,
      format,
      position,
      awayOutcome,
      homeOutcome,
      awayPlayers: parsePlayers(contest.awayPlayers),
      homePlayers: parsePlayers(contest.homePlayers),
      unplayed: contest.unplayed === true,
    }];
  });
}

function parsePlayers(value: unknown): FinalMatchPlayer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): FinalMatchPlayer[] => {
    if (!item || typeof item !== 'object') return [];
    const player = item as Record<string, unknown>;
    const id = readString(player.id);
    const name = readString(player.name);
    return id && name ? [{id, name}] : [];
  });
}

function parseWeather(value: unknown): FinalMatchWeather | null {
  if (!value || typeof value !== 'object') return null;
  const weather = value as Record<string, unknown>;
  const temperature = readInteger(weather.temperature);
  const condition = ['sun', 'cloudy', 'rain', 'storm'].includes(String(weather.condition))
    ? weather.condition as FinalMatchWeather['condition']
    : null;
  if (temperature === null || !condition) return null;
  return {
    temperature,
    condition,
    wind: readInteger(weather.wind),
    windDirection: readString(weather.windDirection),
  };
}

function readOutcome(value: unknown): 'W' | 'L' | 'T' | null {
  return value === 'W' || value === 'L' || value === 'T' ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readMatchScore(value: unknown): number | null {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && Number.isInteger(value * 2)
    ? value
    : null;
}

function readInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}
