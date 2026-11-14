import type {MatchStatus} from '@/domain/schedule/Match';

export function resultsFirst(input: {date: string | null; status: MatchStatus; published: boolean}, now = new Date()): boolean {
  if (input.published) return true;
  if (!input.date || input.status === 'Cancelled' || input.status === 'Postponed' || input.status === 'Rain Delay') return false;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (name: string) => parts.find(part => part.type === name)?.value ?? '';
  const date = `${value('year')}-${value('month')}-${value('day')}`;
  return date > input.date || (date === input.date && Number(value('hour')) >= 18);
}
