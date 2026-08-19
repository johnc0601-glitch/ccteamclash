import {notFound} from 'next/navigation';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchHero} from '@/components/matches/MatchHero';
import {MatchRosterBoard} from '@/components/matches/MatchRosterBoard';
import {MatchScoreboard} from '@/components/matches/MatchScoreboard';
import {MatchStateBanner} from '@/components/matches/MatchStateBanner';
import {PersonalAttendanceCard} from '@/components/matches/PersonalAttendanceCard';
import {CaptainRosterPanel} from '@/components/matches/CaptainRosterPanel';
import {CommissionerSnapshotPanel} from '@/components/matches/CommissionerSnapshotPanel';
import {OfficialRosterExportPanel} from '@/components/matches/OfficialRosterExportPanel';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import type {OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import {parseMatchRosterSnapshotStartAt, snapshotErrorClass} from '@/domain/match-roster/MatchRosterSnapshotAutomation';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {createAdminClient} from '@/lib/supabase/admin';
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
    commissionerNotice?: string | string[];
    commissionerError?: string | string[];
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
  const matchRosterRepository = new SupabaseMatchRosterRepository(supabase);
  const matchRosterService = new MatchRosterService(matchRosterRepository);
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

  if (!event || !match || !match.homeTeamId || !match.awayTeamId) notFound();
  const rosterPlayerIdsByTeam = await getSeasonRosterPlayerIdsByTeam(
    supabase,
    match.seasonId,
    [match.homeTeamId, match.awayTeamId],
  );
  const matchday = resolveMatchday(
    event,
    match,
    teams,
    players,
    courses,
    Boolean(publishedResult),
    rosterPlayerIdsByTeam,
  );
  if (!matchday) notFound();
  const locked = isMatchRosterLocked(match);
  let officialSnapshot: OfficialSnapshotState | undefined;
  if (locked) {
    try {
      const adminRepository = new SupabaseMatchRosterRepository(createAdminClient());
      officialSnapshot = await new MatchRosterService(
        matchRosterRepository,
        undefined,
        adminRepository,
      ).ensureLockedSnapshot(
        matchId,
        parseMatchRosterSnapshotStartAt(process.env.MATCH_ROSTER_SNAPSHOT_START_AT),
      );
    } catch (error) {
      console.error('Official match roster snapshot is unavailable.', {
        operation: 'lazy-create',
        matchId,
        errorClass: snapshotErrorClass(error),
      });
      officialSnapshot = {status: 'unavailable', rosters: []};
    }
  }
  const personalAttendance = !locked && userResult.data.user
    ? await matchRosterService.getPersonalAttendance(userResult.data.user.id, matchId)
    : undefined;
  const managedRosters = !locked && userResult.data.user && readParam(query.manage) === 'roster'
    ? await matchRosterService.getManagedTeamRosters(userResult.data.user.id, matchId)
    : [];
  const canCorrectSnapshot = locked
    && officialSnapshot?.status === 'complete'
    && userResult.data.user
    ? await matchRosterService.canManageOfficialSnapshot(userResult.data.user.id, matchId)
    : false;
  const rosterExport = locked && officialSnapshot?.status === 'complete' && userResult.data.user
    ? await matchRosterService.getOfficialRosterExport(userResult.data.user.id, matchId)
    : undefined;

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
          {canCorrectSnapshot && officialSnapshot?.status === 'complete' ? (
            <CommissionerSnapshotPanel
              rosters={officialSnapshot.rosters}
              activePlayers={players.filter((player) => player.active)}
              notice={readParam(query.commissionerNotice)}
              error={readParam(query.commissionerError)}
            />
          ) : null}
          {rosterExport?.ok ? <OfficialRosterExportPanel exportData={rosterExport.data} /> : null}
          <MatchRosterBoard matchday={matchday} official={officialSnapshot} />
          {!publishedResult ? <MatchScoreboard matchday={matchday} result={undefined} /> : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

async function getSeasonRosterPlayerIdsByTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seasonId: string,
  teamIds: string[],
): Promise<Map<string, Set<string>>> {
  const rosterPlayerIdsByTeam = new Map(teamIds.map((teamId) => [teamId, new Set<string>()]));
  const {data, error} = await supabase
    .from('launch_season_roster_memberships')
    .select('team_id, player_id')
    .eq('season_id', seasonId)
    .eq('status', 'Active')
    .in('team_id', teamIds);

  if (error) {
    console.error('Active season roster memberships are unavailable for matchday.', {
      seasonId,
      teamIds,
      error: error.message,
    });
    return rosterPlayerIdsByTeam;
  }

  for (const membership of data ?? []) {
    rosterPlayerIdsByTeam.get(membership.team_id)?.add(membership.player_id);
  }

  return rosterPlayerIdsByTeam;
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
