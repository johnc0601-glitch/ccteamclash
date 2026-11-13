import {Suspense} from 'react';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {resolveMatchday} from '@/services/matches/MatchdayService';
import {getWhiteboardHref} from '@/services/matches/LiveScoringLink';
import type {FinalMatchdaySnapshot} from '@/services/matches/FinalMatchdaySnapshot';
import {loadSavedMatchPrediction} from '@/services/teamStrength/SavedMatchPrediction';
import {canViewMatchPrediction} from '@/services/settings/MatchPredictionVisibility';
import {MatchdaySection} from './MatchdaySection';
import {MatchPredictionCard} from './MatchPredictionCard';
import {MatchRosterBoard} from './MatchRosterBoard';
import {MatchPreview} from './MatchPreview';
import {MatchTeamStats} from './MatchTeamStats';
import {MatchCourseInfo} from './MatchCourseInfo';
import {MatchFeed} from './MatchFeed';

/** Supplemental reads only: never create historic roster or prediction snapshots. */
export async function FinalMatchdayExtras({snapshot}: {snapshot: FinalMatchdaySnapshot}) {
  const sourceHref = getWhiteboardHref({id: snapshot.matchId, scheduledDate: snapshot.date, homeTeamId: snapshot.homeTeam.id, awayTeamId: snapshot.awayTeam.id});
  return <>
    {sourceHref ? <a href={sourceHref} target="_blank" rel="noreferrer">View scoring on TCWhiteboard</a> : null}
    <Suspense fallback={null}><FinalContext snapshot={snapshot} /></Suspense>
    <MatchdaySection title="Match feed & photos"><Suspense fallback={null}><MatchFeed matchId={snapshot.matchId} matchDate={snapshot.date} /></Suspense></MatchdaySection>
  </>;
}

async function FinalContext({snapshot}: {snapshot: FinalMatchdaySnapshot}) {
  try { return await loadFinalContext(snapshot); }
  catch { return <p>Additional match information is temporarily unavailable.</p>; }
}

async function loadFinalContext(snapshot: FinalMatchdaySnapshot) {
  const client = await createClient();
  const schedule = await createServerScheduleService();
  const repository = new SupabaseLaunchRepository(client);
  const rosterRepository = new SupabaseMatchRosterRepository(client);
  const [event, match, away, home, rosters, claims] = await Promise.all([
    schedule.getPublishedEventById(snapshot.matchId), schedule.getMatch(snapshot.matchId),
    repository.getTeam(snapshot.awayTeam.id), repository.getTeam(snapshot.homeTeam.id),
    rosterRepository.getOfficialMatchRosters(snapshot.matchId), client.auth.getClaims(),
  ]);
  if (!event || !match) return null;
  const course = match.courseId ? await new SupabaseCourseRepository(client).getById(match.courseId) : undefined;
  const matchday = resolveMatchday(event, match, [away, home].filter((team): team is NonNullable<typeof team> => Boolean(team)), [], course ? [course] : [], true, new Map());
  if (!matchday) return null;
  const userId = claims.data?.claims?.sub;
  const actor = typeof userId === 'string' ? await rosterRepository.getAttendanceActor(userId) : undefined;
  const prediction = canViewMatchPrediction('CaptainsCommissioner', actor)
    ? await loadSavedMatchPrediction(process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : client, snapshot.matchId, snapshot.date, snapshot.homeTeam.id, snapshot.awayTeam.id) : undefined;
  const complete = rosters.length === 2 && rosters.some(row => row.teamId === snapshot.homeTeam.id) && rosters.some(row => row.teamId === snapshot.awayTeam.id);
  return <>
    <MatchdaySection title="Official roster"><MatchRosterBoard matchday={matchday} official={complete ? {status: 'complete', rosters} : {status: 'unavailable', rosters: []}} /></MatchdaySection>
    {canViewMatchPrediction('CaptainsCommissioner', actor) ? <MatchdaySection title="Saved prematch estimates">
      {prediction ? <MatchPredictionCard actor={actor} prediction={prediction} awayTeamName={snapshot.awayTeam.name} homeTeamName={snapshot.homeTeam.name} awayLogo={snapshot.awayTeam.logo} homeLogo={snapshot.homeTeam.logo} /> : <p>No prematch estimate was saved for this match.</p>}
    </MatchdaySection> : null}
    <MatchdaySection title="Match preview"><MatchPreview matchId={snapshot.matchId} matchday={matchday} /></MatchdaySection>
    <MatchdaySection title="Team information"><MatchTeamStats awayTeam={{id: snapshot.awayTeam.id, name: snapshot.awayTeam.name}} homeTeam={{id: snapshot.homeTeam.id, name: snapshot.homeTeam.name}} seasonId={match.seasonId} /></MatchdaySection>
    <MatchdaySection title="Course & recorded conditions"><MatchCourseInfo course={course} />{snapshot.weather ? <p>Recorded: {snapshot.weather.temperature}° · {snapshot.weather.condition} · Wind {snapshot.weather.wind}</p> : <p>No conditions were recorded.</p>}</MatchdaySection>
  </>;
}
