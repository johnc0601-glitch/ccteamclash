import {notFound} from 'next/navigation';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchHero} from '@/components/matches/MatchHero';
import {MatchRosterBoard} from '@/components/matches/MatchRosterBoard';
import {MatchScoreboard} from '@/components/matches/MatchScoreboard';
import {MatchStateBanner} from '@/components/matches/MatchStateBanner';
import {MatchPermissionNotice} from '@/components/matches/MatchPermissionNotice';
import {PersonalAttendanceCard} from '@/components/matches/PersonalAttendanceCard';
import {CaptainRosterPanel} from '@/components/matches/CaptainRosterPanel';
import {CommissionerSnapshotPanel} from '@/components/matches/CommissionerSnapshotPanel';
import {OfficialRosterExportPanel} from '@/components/matches/OfficialRosterExportPanel';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {createServerSeasonRosterService} from '@/core/createServerSeasonRosterService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {LaunchProfile} from '@/domain/launch/LaunchData';
import {resolveLaunchProfileState, type LaunchProfileState} from '@/domain/launch/LaunchProfileState';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import type {OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import {parseMatchRosterSnapshotStartAt, snapshotErrorClass} from '@/domain/match-roster/MatchRosterSnapshotAutomation';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';
import {
  resolveAttendanceUnavailableMessage,
  resolveMatchday,
  type PublicMatchday,
} from '@/services/matches/MatchdayService';
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
  const [scheduleService, resultsService, seasonRosterService, supabase] = await Promise.all([
    createServerScheduleService(),
    createServerResultsService(),
    createServerSeasonRosterService(),
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

  if (!event || !match) notFound();
  const seasonMemberships = await seasonRosterService.listMemberships(match.seasonId);
  const matchday = resolveMatchday(
    event,
    match,
    teams,
    players,
    seasonMemberships,
    courses,
    Boolean(publishedResult),
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
  const manageRosterRequested = readParam(query.manage) === 'roster';
  const managedRosters = !locked && userResult.data.user && manageRosterRequested
    ? await matchRosterService.getManagedTeamRosters(userResult.data.user.id, matchId)
    : [];
  const profile = userResult.data.user
    ? await launchRepository.getProfileByUserId(userResult.data.user.id)
    : undefined;
  const profileState = resolveLaunchProfileState(profile);
  const linkedPlayer = profile?.playerId
    ? players.find((player) => player.id === profile.playerId)
    : undefined;
  const linkedMembership = profile?.playerId
    ? seasonMemberships.find((membership) => membership.playerId === profile.playerId)
    : undefined;
  const attendanceUnavailableMessage = !locked && !personalAttendance
    ? resolveAttendanceUnavailableMessage({
      signedIn: Boolean(userResult.data.user),
      state: profileState,
      profile,
      player: linkedPlayer,
      membership: linkedMembership,
      homeTeamId: matchday.homeTeam.id,
      awayTeamId: matchday.awayTeam.id,
    })
    : undefined;
  const rosterUnavailableMessage = !locked && manageRosterRequested && !managedRosters.length
    ? getRosterUnavailableMessage(Boolean(userResult.data.user), profileState, profile, matchday)
    : undefined;
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
          {locked ? (
            <MatchPermissionNotice
              title="Live roster editing is closed"
              message="The official match snapshot is now authoritative. Attendance and live roster changes are no longer available."
            />
          ) : null}
          {personalAttendance ? (
            <PersonalAttendanceCard
              attendance={personalAttendance}
              notice={readParam(query.attendanceNotice)}
              error={readParam(query.attendanceError)}
            />
          ) : attendanceUnavailableMessage ? (
            <MatchPermissionNotice title="Attendance unavailable" message={attendanceUnavailableMessage} />
          ) : null}
          {managedRosters.length ? (
            <CaptainRosterPanel
              rosters={managedRosters}
              teamNames={{
                [matchday.awayTeam.id]: matchday.awayTeam.name,
                [matchday.homeTeam.id]: matchday.homeTeam.name,
              }}
              guidance={profileState === 'approved_commissioner'
                ? 'You can manage both participating teams as commissioner.'
                : 'You can manage your assigned participating team.'}
              notice={readParam(query.captainNotice)}
              error={readParam(query.captainError)}
            />
          ) : rosterUnavailableMessage ? (
            <MatchPermissionNotice title="Team roster management unavailable" message={rosterUnavailableMessage} />
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

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getRosterUnavailableMessage(
  signedIn: boolean,
  state: LaunchProfileState,
  profile: LaunchProfile | undefined,
  matchday: PublicMatchday,
): string {
  if (!signedIn) return 'Sign in with an approved captain or commissioner profile to manage a match roster.';
  if (state === 'missing') return 'No league profile is connected to your account. Complete account setup before requesting roster access.';
  if (state === 'pending_captain') return 'Your captain profile is pending approval.';
  if (state === 'pending_commissioner') return 'Your commissioner profile is pending approval.';
  if (state === 'pending_player') return 'Team roster management is available only to approved captains and commissioners.';
  if (state === 'rejected') return 'Your profile is not approved for team roster management.';
  if (state === 'suspended') return 'Your profile is suspended, so team roster management is unavailable.';
  if (state === 'approved_player') return 'Team roster management is available only to approved captains and commissioners.';
  if (state === 'approved_captain') {
    if (!profile?.captainTeamId) return 'Your captain profile does not have an assigned team.';
    if (profile.captainTeamId !== matchday.homeTeam.id && profile.captainTeamId !== matchday.awayTeam.id) {
      return 'Your assigned team is not participating in this match.';
    }
  }
  return 'Roster management context is unavailable for this match. Refresh the page or contact a league administrator.';
}
