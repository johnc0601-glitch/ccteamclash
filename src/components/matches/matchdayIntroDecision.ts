import type {MatchdayLifecycle} from '@/services/matches/MatchdayService';

export const MATCHDAY_INTRO_TIME_ZONE = 'America/New_York';

export type MatchdayIntroQueryOverride = 'play' | 'skip' | null;

type MatchdayIntroDecisionInput = {
  matchDate: string | null;
  lifecycle: MatchdayLifecycle;
  now: Date;
  queryOverride?: MatchdayIntroQueryOverride;
};

const PLAYABLE_LIFECYCLES = new Set<MatchdayLifecycle>([
  'Scheduled',
  'Rain Delay',
  'Completed',
]);

export function decideMatchdayIntroPlayback({
  matchDate,
  lifecycle,
  now,
  queryOverride = null,
}: MatchdayIntroDecisionInput): boolean {
  if (queryOverride === 'skip') return false;
  if (queryOverride === 'play') return true;
  if (!matchDate || !PLAYABLE_LIFECYCLES.has(lifecycle)) return false;
  return matchDate === dateKeyInTimeZone(now, MATCHDAY_INTRO_TIME_ZONE);
}

export function parseMatchdayIntroQuery(value: string | string[] | undefined): MatchdayIntroQueryOverride {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === '1' || normalized === 'play') return 'play';
  if (normalized === '0' || normalized === 'skip') return 'skip';
  return null;
}

export function dateKeyInTimeZone(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(value);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
}
