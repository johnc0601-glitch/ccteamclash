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

/** Old "Too High" votes meant the favorite's projected margin was too high.
 * Preserve that interpretation: high = underdog covers, low = favorite covers.
 * The signed home line only determines which team is the favorite.
 */
export function getSpreadCoverOptions(homeLine: number, homeName: string, awayName: string): {
  favorite: {teamName: string; choice: SpreadVoteChoice; label: string; explanation: string};
  underdog: {teamName: string; choice: SpreadVoteChoice; label: string; explanation: string};
} {
  if (!Number.isFinite(homeLine) || homeLine === 0 || roundHomeSpreadLine(homeLine) !== homeLine) {
    throw new Error('A nonzero half-point spread is required.');
  }
  const favorite = homeLine > 0 ? homeName : awayName;
  const underdog = homeLine > 0 ? awayName : homeName;
  const points = Math.abs(homeLine).toFixed(1);
  return {
    favorite: {
      teamName: favorite,
      choice: 'low',
      label: favorite + ' covers',
      explanation: 'Win by more than ' + points + ' points',
    },
    underdog: {
      teamName: underdog,
      choice: 'high',
      label: underdog + ' covers',
      explanation: 'Win, tie, or lose by fewer than ' + points + ' points',
    },
  };
}

/** For a ~30-person recreational ballot, require six net picks per half point.
 * Clamp movement to 1.5 points from the opening line and never reverse the favorite.
 * This is deliberately slower than a real sports-betting market.
 */
export function moveClashLine(openingHomeLine: number, favoritePicks: number, underdogPicks: number): number {
  if (roundHomeSpreadLine(openingHomeLine) !== openingHomeLine || openingHomeLine === 0
    || !Number.isInteger(favoritePicks) || favoritePicks < 0
    || !Number.isInteger(underdogPicks) || underdogPicks < 0) {
    throw new Error('Invalid opening line or pick counts.');
  }
  const netSteps = Math.max(-3, Math.min(3, Math.trunc((favoritePicks - underdogPicks) / 6)));
  const magnitude = Math.max(0.5, Math.min(36, Math.abs(openingHomeLine) + netSteps * 0.5));
  return Math.sign(openingHomeLine) * magnitude;
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
