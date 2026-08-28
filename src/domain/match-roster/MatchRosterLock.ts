import type {AttendanceMatch} from '@/domain/match-roster/MatchAttendance';

const ATTENDANCE_OPEN_STATUSES = new Set(['Scheduled', 'Postponed', 'Rain Delay']);

export function getMatchAttendanceOpenAt(matchDate: string): Date | undefined {
  const friday = getMatchWeekFriday(matchDate);
  if (!friday) return undefined;
  return easternDateTime(friday.year, friday.month, friday.day, 0);
}

export function getPlayerAttendanceLockAt(matchDate: string): Date | undefined {
  const friday = getMatchWeekFriday(matchDate);
  if (!friday) return undefined;
  return easternDateTime(friday.year, friday.month, friday.day, 12);
}

export function getMatchRosterLockAt(matchDate: string): Date | undefined {
  const friday = getMatchWeekFriday(matchDate);
  if (!friday) return undefined;
  return easternDateTime(friday.year, friday.month, friday.day, 15);
}

export function isPlayerAttendanceOpen(match: AttendanceMatch, now = new Date()): boolean {
  if (!match.date || !ATTENDANCE_OPEN_STATUSES.has(match.status)) return false;
  const lockAt = getPlayerAttendanceLockAt(match.date);
  return Boolean(lockAt && now.getTime() < lockAt.getTime());
}

export function isMatchAttendanceOpen(match: AttendanceMatch, now = new Date()): boolean {
  if (!match.date || !ATTENDANCE_OPEN_STATUSES.has(match.status)) return false;
  const openAt = getMatchAttendanceOpenAt(match.date);
  const lockAt = getMatchRosterLockAt(match.date);
  return Boolean(
    openAt
    && lockAt
    && now.getTime() >= openAt.getTime()
    && now.getTime() < lockAt.getTime()
  );
}

export function isMatchRosterLocked(match: AttendanceMatch, now = new Date()): boolean {
  if (!match.date) return false;
  const lockAt = getMatchRosterLockAt(match.date);
  return Boolean(lockAt && now.getTime() >= lockAt.getTime());
}

function getMatchWeekFriday(matchDate: string) {
  const parsed = parseMatchDate(matchDate);
  if (!parsed) return undefined;

  const matchDateUtc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const daysSinceFriday = (matchDateUtc.getUTCDay() - 5 + 7) % 7;
  const fridayUtc = new Date(matchDateUtc.getTime() - daysSinceFriday * 24 * 60 * 60 * 1000);

  return {
    year: fridayUtc.getUTCFullYear(),
    month: fridayUtc.getUTCMonth() + 1,
    day: fridayUtc.getUTCDate(),
  };
}

function parseMatchDate(matchDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(matchDate);
  if (!match) return undefined;
  const [, yearText, monthText, dayText] = match;
  return {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
  };
}

function easternDateTime(year: number, month: number, day: number, hour: number): Date {
  const desiredUtc = Date.UTC(year, month - 1, day, hour);
  let timestamp = desiredUtc;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = easternParts(new Date(timestamp));
    const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour);
    timestamp += desiredUtc - actualUtc;
  }

  return new Date(timestamp);
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
