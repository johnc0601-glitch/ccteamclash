import {notFound} from 'next/navigation';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchHero} from '@/components/matches/MatchHero';
import {MatchRosterBoard} from '@/components/matches/MatchRosterBoard';
import {MatchScoreboard} from '@/components/matches/MatchScoreboard';
import {MatchStateBanner} from '@/components/matches/MatchStateBanner';
import {PersonalAttendanceCard} from '@/components/matches/PersonalAttendanceCard';
import {CaptainRosterPanel} from '@/components/matches/CaptainRosterPanel';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';
import {resolveMatchday} from '@/services/matches/MatchdayService';
import styles from './Matchday.module.css';

export const dynamic = 'force-dynamic';

type MatchdayPageProps = {
  params: Promise<{id: string}>;
  searchParams: Promise<{
    manage?: string | string[];
    attendanceNotice?: string | string[];
    attendanceError?: string | string[];
    captainNotice?: string | string[];
    captainError?: string | string[];
  }>;
};

export default async function MatchdayPage({params, searchParams}: MatchdayPageProps) {
  const {id: matchId} = await params;
  const query = await searchParams;
  const [scheduleService, resultsService, supabase] = await Promise.all([
    createServerScheduleService(),
    createServerResultsService(),
    createClient(),
  ]);
  const launchRepository = new SupabaseLaunchRepository(supabase);
  const matchRosterService = new MatchRosterService(new SupabaseMatchRosterRepository(supabase));
  const userPromise = supabase.auth.getUser();
  const [event, match, publishedResult, teams, players, courses, userResult] = await Promise.all([
    scheduleService.getPublishedEventById(matchId),
    scheduleService.getMatch(matchId),
    resultsService.getPublishedResult(matchId),
    launchRepository.getTeams(),
    launchRepository.getPlayers(),
    scheduleService.getCourses(),
    userPromise,
  ]);

  if (!event || !match) notFound();
  const matchday = resolveMatchday(
    event,
    match,
    teams,
    players,
    courses,
    Boolean(publishedResult),
  );
  if (!matchday) notFound();
  const personalAttendance = userResult.data.user
    ? await matchRosterService.getPersonalAttendance(userResult.data.user.id, matchId)
    : undefined;
  const managedRosters = userResult.data.user && readParam(query.manage) === 'roster'
    ? await matchRosterService.getManagedTeamRosters(userResult.data.user.id, matchId)
    : [];

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <MatchHero matchday={matchday} />
        <div className={`shell ${styles.content}`}>
          <MatchStateBanner lifecycle={matchday.lifecycle} />
          {publishedResult ? <MatchScoreboard matchday={matchday} result={publishedResult} /> : null}
          {personalAttendance ? (
            <PersonalAttendanceCard
              attendance={personalAttendance}
              notice={readParam(query.attendanceNotice)}
              error={readParam(query.attendanceError)}
            />
          ) : null}
          {managedRosters.length ? (
            <CaptainRosterPanel
              rosters={managedRosters}
              teamNames={{
                [matchday.awayTeam.id]: matchday.awayTeam.name,
                [matchday.homeTeam.id]: matchday.homeTeam.name,
              }}
              notice={readParam(query.captainNotice)}
              error={readParam(query.captainError)}
            />
          ) : null}
          <MatchRosterBoard matchday={matchday} />
          {!publishedResult ? <MatchScoreboard matchday={matchday} result={undefined} /> : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
