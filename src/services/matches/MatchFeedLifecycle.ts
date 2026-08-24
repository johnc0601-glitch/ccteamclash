const MATCH_FEED_OPEN_DAYS = 30;
const LEAGUE_TIME_ZONE = 'America/New_York';

export function isMatchFeedOpen(matchDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!matchDate) return true;
  const closeDate = addCalendarDays(matchDate, MATCH_FEED_OPEN_DAYS);
  if (!closeDate) return true;
  return easternCalendarDate(now) <= closeDate;
}

export function matchFeedClosedMessage(): string {
  return 'Match history preserved';
}

function addCalendarDays(dateText: string, days: number): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function easternCalendarDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LEAGUE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
