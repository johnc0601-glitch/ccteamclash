// Matchday link and intro display window: 9:00 AM inclusive until 6:00 PM
// exclusive on the scheduled calendar day in the league's Eastern time zone.
// Uses wall-clock parts rather than device timezone or UTC offsets so DST works.
export const MATCHDAY_WINDOW_START_HOUR = 9;
export const MATCHDAY_WINDOW_END_HOUR = 18;
const ZONE = 'America/New_York';

export function isWithinMatchdayWindow(matchDate: string | null | undefined, now = new Date()): boolean {
  if (!matchDate || !/^\d{4}-\d{2}-\d{2}$/.test(matchDate) || !Number.isFinite(now.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  const today = `${value('year')}-${value('month')}-${value('day')}`;
  const hour = Number(value('hour'));
  return today === matchDate && hour >= MATCHDAY_WINDOW_START_HOUR && hour < MATCHDAY_WINDOW_END_HOUR;
}
