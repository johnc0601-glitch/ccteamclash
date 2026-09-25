export const CAPTAIN_ROSTER_ANCHOR = 'captain-roster';

export function getCaptainRosterHref(
  matchHref: string,
  params: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams({manage: 'roster'});
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return `${matchHref}?${query.toString()}#${CAPTAIN_ROSTER_ANCHOR}`;
}
