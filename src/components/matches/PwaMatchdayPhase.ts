import type {Match} from '@/domain/schedule/Match';

export type PwaMatchdayPhase =
  | 'upcoming'
  | 'today'
  | 'awaiting'
  | 'final'
  | 'postponed'
  | 'cancelled'
  | 'rain';

export function resolvePwaMatchdayPhase(
  match: Pick<Match, 'status' | 'date'>,
  hasResult: boolean,
  referenceDate = new Date(),
): PwaMatchdayPhase {
  if (hasResult || match.status === 'Completed') return 'final';
  if (match.status === 'Postponed') return 'postponed';
  if (match.status === 'Cancelled') return 'cancelled';
  if (match.status === 'Rain Delay') return 'rain';
  if (!match.date) return 'upcoming';

  const easternToday = dateInEastern(referenceDate);
  if (match.date === easternToday) return 'today';
  if (match.date < easternToday) return 'awaiting';
  return 'upcoming';
}

export function getPwaMatchdayPhaseCopy(phase: PwaMatchdayPhase) {
  switch (phase) {
    case 'today':
      return {label: 'Matchday · Today', detail: 'Roster, scoring, feed, and photos in one place'};
    case 'awaiting':
      return {label: 'Awaiting results', detail: 'Matchday is complete; official results have not been published yet'};
    case 'final':
      return {label: 'Final', detail: 'Official Team Clash result'};
    case 'postponed':
      return {label: 'Postponed', detail: 'This match has been postponed'};
    case 'cancelled':
      return {label: 'Cancelled', detail: 'This match has been cancelled'};
    case 'rain':
      return {label: 'Rain delay', detail: 'Match status is currently a rain delay'};
    default:
      return {label: 'Upcoming Matchday', detail: 'Get ready: availability, prediction, roster, and course'};
  }
}

export function dateInEastern(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}


export function formatPwaPredictionPercent(probability: number): number {
  if (!Number.isFinite(probability)) return 0;
  return Math.max(0, Math.min(100, Math.round(probability * 100)));
}
