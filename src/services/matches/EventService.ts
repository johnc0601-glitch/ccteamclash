import {matches} from '@/lib-data';
import type {Match} from '@/shared/types';
import {createSlug} from '@/shared/utils';

const MATCH_DISPLAY_WINDOW_DAYS = 14;
const DEFAULT_MATCH_YEAR = 2026;

export type EventBucket = 'upcoming' | 'recent' | 'past';

export type PublicEvent = Match & {
  id: string;
  href: string;
  dateTime: Date;
  bucket: EventBucket;
  status: 'Scheduled' | 'Recent' | 'Past';
};

export type TeamEvent = PublicEvent & {
  opponent: string;
  isHome: boolean;
};

export function getPublicEvents(referenceDate = new Date()): PublicEvent[] {
  return matches
    .map((match) => toPublicEvent(match, referenceDate))
    .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime());
}

export function getHomePageEvents(referenceDate = new Date()): PublicEvent[] {
  const events = getPublicEvents(referenceDate);
  const upcoming = events.filter((event) => event.bucket === 'upcoming');
  if (upcoming.length) {
    const nextDate = dateKey(upcoming[0].dateTime);
    return upcoming.filter((event) => dateKey(event.dateTime) === nextDate);
  }

  return events
    .filter((event) => event.bucket === 'recent')
    .sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime());
}

export function getScheduleGroups(referenceDate = new Date()): Record<EventBucket, PublicEvent[]> {
  const groups: Record<EventBucket, PublicEvent[]> = {
    upcoming: [],
    recent: [],
    past: [],
  };

  for (const event of getPublicEvents(referenceDate)) {
    groups[event.bucket].push(event);
  }

  groups.recent.sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime());
  groups.past.sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime());
  return groups;
}

export function getEventById(id: string, referenceDate = new Date()): PublicEvent | undefined {
  return getPublicEvents(referenceDate).find((event) => event.id === id);
}

export function getTeamEvents(teamName: string, referenceDate = new Date()): TeamEvent[] {
  const normalizedTeamName = normalize(teamName);
  return getPublicEvents(referenceDate)
    .filter((event) => normalize(event.home) === normalizedTeamName || normalize(event.away) === normalizedTeamName)
    .map((event) => ({
      ...event,
      opponent: normalize(event.home) === normalizedTeamName ? event.away : event.home,
      isHome: normalize(event.home) === normalizedTeamName,
    }));
}

export function getTeamNextEvent(teamName: string, referenceDate = new Date()): TeamEvent | undefined {
  return getTeamEvents(teamName, referenceDate).find((event) => event.bucket === 'upcoming');
}

export function createMatchId(match: Pick<Match, 'date' | 'home' | 'away'>): string {
  return createSlug(`${match.date}-${match.home}-vs-${match.away}`);
}

function toPublicEvent(match: Match, referenceDate: Date): PublicEvent {
  const dateTime = parseMatchDateTime(match);
  const bucket = getBucket(dateTime, referenceDate);

  return {
    ...match,
    id: createMatchId(match),
    href: `/matches/${createMatchId(match)}`,
    dateTime,
    bucket,
    status: bucket === 'upcoming' ? 'Scheduled' : bucket === 'recent' ? 'Recent' : 'Past',
  };
}

function parseMatchDateTime(match: Match): Date {
  const raw = `${match.date}, ${DEFAULT_MATCH_YEAR} ${match.time}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return new Date(`${DEFAULT_MATCH_YEAR}-01-01T00:00:00`);
}

function getBucket(dateTime: Date, referenceDate: Date): EventBucket {
  const today = startOfDay(referenceDate);
  const eventDay = startOfDay(dateTime);
  if (eventDay.getTime() >= today.getTime()) return 'upcoming';

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - MATCH_DISPLAY_WINDOW_DAYS);
  return eventDay.getTime() >= cutoff.getTime() ? 'recent' : 'past';
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
