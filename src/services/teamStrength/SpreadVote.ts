/** Commissioner-only pilot: the eligibility check is intentionally not the captain prediction check. */
export type SpreadVoteChoice = 'high' | 'low';
export type SpreadVoteActor = {profileRole?: string | null; profileStatus?: string | null} | undefined;

export function isApprovedCommissioner(actor: SpreadVoteActor): boolean {
  return actor?.profileRole === 'Commissioner' && actor.profileStatus === 'Approved';
}

export function roundHomeSpreadLine(margin: number | null | undefined): number | null {
  if (typeof margin !== 'number' || !Number.isFinite(margin) || Math.abs(margin) > 36) return null;
  const points = Math.round(Math.abs(margin) * 2) / 2;
  return points < 0.5 ? 0 : Math.sign(margin) * points;
}

export function spreadLineLabel(homeLine: number, homeName: string, awayName: string): string {
  if (homeLine === 0) return 'Pick ’em — no meaningful point spread';
  const favorite = homeLine > 0 ? homeName : awayName;
  return favorite + ' favored by ' + Math.abs(homeLine).toFixed(1) + ' points';
}

/** Local ET clock; the ballot closes at the listed match start, not at midnight UTC. */
export function isSpreadVoteOpen(match: {date: string | null; time: string | null; status: string}, now = new Date()): boolean {
  if (match.status !== 'Scheduled' || !match.date || !match.time
    || !/^\d{4}-\d{2}-\d{2}$/.test(match.date)
    || !/^([01]\d|2[0-3]):[0-5]\d/.test(match.time)) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const easternMinute = values.year + '-' + values.month + '-' + values.day + 'T' + values.hour + ':' + values.minute;
  return easternMinute < match.date + 'T' + match.time.slice(0, 5);
}
