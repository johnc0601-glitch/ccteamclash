import type {AttendanceMatch} from '@/domain/match-roster/MatchAttendance';

const ATTENDANCE_OPEN_STATUSES = new Set(['Scheduled', 'Postponed', 'Rain Delay']);

export function getMatchRosterLockAt(matchDate: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(matchDate);
  if (!match) return undefined;

  const [, yearText, monthText, dayText] = match;
  const desired = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: 15,
  };
  let timestamp = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = easternParts(new Date(timestamp));
    const desiredUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour);
    const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour);
    timestamp += desiredUtc - actualUtc;
  }

  return new Date(timestamp);
}

export function isMatchAttendanceOpen(match: AttendanceMatch, now = new Date()): boolean {
  if (!match.date || !ATTENDANCE_OPEN_STATUSES.has(match.status)) return false;
  const lockAt = getMatchRosterLockAt(match.date);
  return Boolean(lockAt && now.getTime() < lockAt.getTime());
}

export function isMatchRosterLocked(match: AttendanceMatch, now = new Date()): boolean {
  if (!match.date) return false;
  const lockAt = getMatchRosterLockAt(match.date);
  return Boolean(lockAt && now.getTime() >= lockAt.getTime());
}

function easternParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
  };
}
