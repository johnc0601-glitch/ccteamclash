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
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {AttendanceActor} from '@/domain/match-roster/MatchAttendance';
import type {OfficialRosterExport} from '@/domain/match-roster/MatchRosterExport';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import type {OfficialMatchRoster, OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import {parseMatchRosterSnapshotStartAt, snapshotErrorClass} from '@/domain/match-roster/MatchRosterSnapshotAutomation';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import type {Match} from '@/domain/schedule/Match';
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

type LockedControls = {
  canCorrectSnapshot: boolean;
  rosterExport?: {ok: true; data: OfficialRosterExport};
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
  const courseRepository = new SupabaseCourseRepository(supabase);
  const matchRosterRepository = new SeasonAwareMatchRosterRepository(supabase);
  const matchRosterService = new MatchRosterService(matchRosterRepository);
  const userPromise = supabase.auth.getUser();
  const [event, match, publishedResult, userResult] = await Promise.all([
    scheduleService.getPublishedEventById(matchId),
    scheduleService.getMatch(matchId),
    resultsService.getPublishedResult(matchId),
    userPromise,
  ]);

  if (!event || !match || !match.homeTeamId || !match.awayTeamId || !match.courseId) notFound();

  const teamIds = [match.homeTeamId, match.awayTeamId];
  const [rosterPlayerIdsByTeam, teamResults, course] = await Promise.all([
    getSeasonRosterPlayerIdsByTeam(supabase, match.seasonId, teamIds),
    Promise.all(teamIds.map((teamId) => launchRepository.getTeam(teamId))),
    courseRepository.getById(match.courseId),
  ]);
  const rosterUnavailable = rosterPlayerIdsByTeam === null;
  const effectiveRosterIds = rosterPlayerIdsByTeam ?? new Map([
    [match.homeTeamId, new Set<string>()],
    [match.awayTeamId, new Set<string>()],
  ]);
  const matchPlayerIds = [...new Set([...effectiveRosterIds.values()].flatMap((ids) => [...ids]))];
  const players = await getPlayersByIds(supabase, matchPlayerIds);
  const teams = teamResults.filter((team): team is NonNullable<typeof team> => Boolean(team));
  const courses = course ? [course] : [];

  const matchday = resolveMatchday(
    event,
    match,
    teams,
    players,
    courses,
    Boolean(publishedResult),
    effectiveRosterIds,
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

  let lockedControls: LockedControls = {canCorrectSnapshot: false};
  let commissionerPlayers: LaunchPlayer[] = [];
  if (locked && officialSnapshot?.status === 'complete' && userResult.data.user) {
    const actor = await new SupabaseMatchRosterRepository(supabase)
      .getAttendanceActor(userResult.data.user.id);
    lockedControls = resolveLockedControls(actor, match, officialSnapshot.rosters);
    if (lockedControls.canCorrectSnapshot) {
      commissionerPlayers = (await launchRepository.getPlayers()).filter((player) => player.active);
    }
  }

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
          {lockedControls.canCorrectSnapshot && officialSnapshot?.status === 'complete' ? (
            <CommissionerSnapshotPanel
              rosters={officialSnapshot.rosters}
              activePlayers={commissionerPlayers}
              notice={readParam(query.commissionerNotice)}
              error={readParam(query.commissionerError)}
            />
          ) : null}
          {lockedControls.rosterExport?.ok ? (
            <OfficialRosterExportPanel exportData={lockedControls.rosterExport.data} />
          ) : null}
          <MatchRosterBoard matchday={matchday} official={officialSnapshot} rosterUnavailable={rosterUnavailable} />
          {!publishedResult ? <MatchScoreboard matchday={matchday} result={undefined} /> : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

function resolveLockedControls(
  actor: AttendanceActor | undefined,
  match: Match,
  rosters: OfficialMatchRoster[],
): LockedControls {
  const approved = actor?.profileStatus === 'Approved';
  const teamIds = [match.homeTeamId, match.awayTeamId].filter((teamId): teamId is string => Boolean(teamId));
  const canCorrectSnapshot = Boolean(
    approved
    && actor?.profileRole === 'Commissioner'
    && match.status !== 'Cancelled'
    && teamIds.length === 2,
  );
  const canExport = Boolean(
    approved
    && match.date
    && teamIds.length === 2
    && (
      actor?.profileRole === 'Commissioner'
      || (actor?.profileRole === 'Captain' && actor.captainTeamId && teamIds.includes(actor.captainTeamId))
    ),
  );
  if (!canExport || !match.date || !match.homeTeamId || !match.awayTeamId) return {canCorrectSnapshot};

  const home = rosters.find((roster) => roster.teamId === match.homeTeamId);
  const away = rosters.find((roster) => roster.teamId === match.awayTeamId);
  if (!home || !away) return {canCorrectSnapshot};

  return {
    canCorrectSnapshot,
    rosterExport: {
      ok: true,
      data: {
        matchId: match.id,
        matchDate: match.date,
        homeTeam: toExportTeam(home),
        awayTeam: toExportTeam(away),
        generatedAt: new Date().toISOString(),
      },
    },
  };
}

function toExportTeam(roster: OfficialMatchRoster) {
  return {
    name: roster.teamNameSnapshot,
    playerNames: roster.players
      .map((player) => player.playerNameSnapshot)
      .sort((left, right) => left.localeCompare(right, 'en', {sensitivity: 'base'})),
  };
}

async function getPlayersByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  playerIds: string[],
): Promise<LaunchPlayer[]> {
  if (!playerIds.length) return [];
  const {data, error} = await supabase
    .from('launch_players')
    .select('*')
    .in('id', playerIds)
    .order('name');
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    gender: row.gender as LaunchPlayer['gender'],
    pdgaNumber: row.pdga_number,
    pdgaRating: row.pdga_rating,
    currentTeamId: row.current_team_id,
    homeArea: row.home_area,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function getSeasonRosterPlayerIdsByTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seasonId: string,
  teamIds: string[],
): Promise<Map<string, Set<string>> | null> {
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
    return null;
  }

  for (const membership of data ?? []) {
    rosterPlayerIdsByTeam.get(membership.team_id)?.add(membership.player_id);
  }

  return rosterPlayerIdsByTeam;
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
