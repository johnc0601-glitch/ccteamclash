import type {MatchStatus} from '@/domain/schedule/Match';

export type ScheduleEventBucket = 'upcoming' | 'recent' | 'past';

const MATCH_DISPLAY_WINDOW_DAYS = 14;

export function resolvePublicScheduleBucket(
  lifecycle: MatchStatus,
  dateTime: Date,
  referenceDate: Date,
): ScheduleEventBucket {
  const today = startOfLocalDay(referenceDate);
  const eventDay = startOfLocalDay(dateTime);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - MATCH_DISPLAY_WINDOW_DAYS);

  // A completed match is never upcoming, even if its stored date was entered
  // incorrectly in the future. Its public placement is recent/past only.
  if (lifecycle === 'Completed') {
    return eventDay.getTime() >= cutoff.getTime() ? 'recent' : 'past';
  }

  if (eventDay.getTime() >= today.getTime()) return 'upcoming';
  return eventDay.getTime() >= cutoff.getTime() ? 'recent' : 'past';
}

export function isHomepageScheduleEventVisible(lifecycle: MatchStatus): boolean {
  return lifecycle !== 'Cancelled';
}

export function isUpcomingScheduleEvent(lifecycle: MatchStatus): boolean {
  return lifecycle !== 'Cancelled' && lifecycle !== 'Completed';
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
