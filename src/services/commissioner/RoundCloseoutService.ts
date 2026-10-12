import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {easternDate} from '@/services/weather/MatchWeather';

export const CLOSEOUT_CHECKS = [
  {key: 'whiteboards', title: 'Confirm whiteboards and final point totals', detail: 'Compare the posted singles and doubles scoreboards against the source photos.', href: '/office/results'},
  {key: 'adjustments', title: 'Review bonuses and penalty points', detail: 'Confirm women\'s matchup bonuses, available points, and administrative penalties.', href: '/office/results'},
  {key: 'no_shows', title: 'Review no-shows and roster corrections', detail: 'Check absent players, forfeits, opponent pairings, and any CI exclusions.', href: '/office/players'},
  {key: 'standings', title: 'Check standings and tiebreakers', detail: 'Review wins, head-to-head, and available points against published results.', href: '/office/standings'},
  {key: 'pulse', title: 'Publish or refresh Clash Pulse', detail: 'Review verified upsets, CI movers, and league facts for the completed round.', href: '/office/clash-pulse'},
  {key: 'recap', title: 'Publish the round recap', detail: 'Confirm that stories, photos, and the public recap are ready.', href: '/office/media'},
  {key: 'closed', title: 'Close out the round', detail: 'Final commissioner sign-off after every other check is complete.', href: '/office'},
] as const;

export type CloseoutKey = (typeof CLOSEOUT_CHECKS)[number]['key'];
export type CloseoutChecks = Record<CloseoutKey, boolean>;

export type RoundCloseout = {
  id: string;
  number: number;
  date: string;
  firstMatchDate: string;
  lastMatchDate: string;
  matchCount: number;
  resultsPublished: number;
  ciPublished: number;
  checks: CloseoutChecks;
  started: boolean;
  ended: boolean;
  done: number;
  total: number;
};

export function roundIsVerified(round: RoundCloseout): boolean {
  return round.matchCount > 0 &&
    round.resultsPublished === round.matchCount &&
    round.ciPublished === round.matchCount;
}

export function canCloseRound(round: RoundCloseout): boolean {
  return round.ended && roundIsVerified(round) &&
    CLOSEOUT_CHECKS.every((task) => task.key === 'closed' || round.checks[task.key]);
}

type DbRow = Record<string, any>;

function throwIfError(error: any, label: string) {
  if (error) throw new Error(`Could not load ${label} for round checklist.`);
}

export async function getRoundCloseouts(): Promise<RoundCloseout[]> {
  const db = await createClient() as any;
  const today = easternDate();
  const {data: season, error: seasonError} = await db
    .from('launch_seasons').select('id')
    .eq('active', true).eq('published', true).maybeSingle();
  throwIfError(seasonError, 'active season');
  if (!season) return [];

  const [roundResult, scheduleResult] = await Promise.all([
    db.from('launch_rounds').select('id,number,date,schedule_id')
      .eq('season_id', season.id).eq('published', true).order('number'),
    db.from('launch_schedules').select('id')
      .eq('season_id', season.id).eq('published', true),
  ]);
  throwIfError(roundResult.error, 'rounds');
  throwIfError(scheduleResult.error, 'published schedules');
  const allowedSchedules = new Set((scheduleResult.data || []).map((row: DbRow) => row.id));
  const rounds = (roundResult.data || []).filter((round: DbRow) => allowedSchedules.has(round.schedule_id));
  if (!rounds.length) return [];
  const roundIds = rounds.map((round: DbRow) => round.id);

  const [matchResult, checkResult] = await Promise.all([
    db.from('launch_schedule_matches').select('id,round_id,date,status').in('round_id', roundIds),
    db.from('launch_round_closeout_checks').select('round_id,check_key,checked').in('round_id', roundIds),
  ]);
  throwIfError(matchResult.error, 'round matches');
  throwIfError(checkResult.error, 'review checks');
  const matches = (matchResult.data || []).filter((match: DbRow) => match.status !== 'Cancelled');
  const matchIds = matches.map((match: DbRow) => match.id);
  const [result, ci] = matchIds.length ? await Promise.all([
    db.from('launch_match_results').select('match_id,status').in('match_id', matchIds),
    db.from('clash_match_publications').select('match_id').in('match_id', matchIds),
  ]) : [{data: [], error: null}, {data: [], error: null}];
  throwIfError(result.error, 'published match results');
  throwIfError(ci.error, 'CI publications');
  const published = new Set((result.data || []).filter((row: DbRow) => row.status === 'Published').map((row: DbRow) => row.match_id));
  const ciPublished = new Set((ci.data || []).map((row: DbRow) => row.match_id));
  const verifiedChecks = (checkResult.data || []) as DbRow[];

  return rounds.map((round: DbRow): RoundCloseout => {
    const roundMatches = matches.filter((match: DbRow) => match.round_id === round.id);
    const dates = roundMatches.map((match: DbRow) => String(match.date || round.date)).sort();
    const firstMatchDate = dates[0] || String(round.date);
    const lastMatchDate = dates.at(-1) || String(round.date);
    const checks = Object.fromEntries(CLOSEOUT_CHECKS.map((task) =>
      [task.key, verifiedChecks.some((row) => row.round_id === round.id && row.check_key === task.key && row.checked === true)]
    )) as CloseoutChecks;
    const matchCount = roundMatches.length;
    const resultsPublished = roundMatches.filter((match: DbRow) => published.has(match.id)).length;
    const ciPublishedCount = roundMatches.filter((match: DbRow) => ciPublished.has(match.id)).length;
    const completeAuto = Number(matchCount > 0 && resultsPublished === matchCount) +
      Number(matchCount > 0 && ciPublishedCount === matchCount);
    return {
      id: round.id, number: round.number, date: String(round.date),
      firstMatchDate, lastMatchDate, matchCount, resultsPublished,
      ciPublished: ciPublishedCount, checks,
      started: firstMatchDate <= today, ended: lastMatchDate < today,
      done: completeAuto + CLOSEOUT_CHECKS.filter((item) => checks[item.key]).length,
      total: CLOSEOUT_CHECKS.length + 2,
    };
  }).sort((a: RoundCloseout, b: RoundCloseout) => a.number - b.number);
}
