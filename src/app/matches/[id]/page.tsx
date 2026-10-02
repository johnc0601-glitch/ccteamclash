import {Suspense, type CSSProperties} from 'react';
import {notFound} from 'next/navigation';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchHero} from '@/components/matches/MatchHero';
import {MatchRosterBoard} from '@/components/matches/MatchRosterBoard';
import {MatchScoreboard} from '@/components/matches/MatchScoreboard';
import {MatchFeed} from '@/components/matches/MatchFeed';
import {MatchPreview} from '@/components/matches/MatchPreview';
import {MatchdayInfoStrip, type MatchdayAttendanceTotals} from '@/components/matches/MatchdayInfoStrip';
import {MatchCourseInfo} from '@/components/matches/MatchCourseInfo';
import {MatchTeamStats} from '@/components/matches/MatchTeamStats';
import {PersonalAttendanceCard} from '@/components/matches/PersonalAttendanceCard';
import {CaptainRosterPanel} from '@/components/matches/CaptainRosterPanel';
import {CommissionerRosterUnlockPanel} from '@/components/matches/CommissionerRosterUnlockPanel';
import {OfficialRosterExportPanel} from '@/components/matches/OfficialRosterExportPanel';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {AttendanceActor, TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialRosterExport} from '@/domain/match-roster/MatchRosterExport';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {isMatchAttendanceOpen, isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import type {OfficialMatchRoster, OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import {parseMatchRosterSnapshotStartAt, snapshotErrorClass} from '@/domain/match-roster/MatchRosterSnapshotAutomation';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import type {Match} from '@/domain/schedule/Match';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';
import {resolveMatchday, type PublicMatchday} from '@/services/matches/MatchdayService';
import styles from './Matchday.module.css';

export const dynamic = 'force-dynamic';

const ROSTER_CORRECTION_STATUSES = new Set(['Scheduled', 'Postponed', 'Rain Delay']);

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
    feedNotice?: string | string[];
    feedError?: string | string[];
  }>;
};

type LockedControls = {
  canUnlockRoster: boolean;
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
  const [event, match, publishedResult, contests, claimsResult] = await Promise.all([
    scheduleService.getPublishedEventById(matchId),
    scheduleService.getMatch(matchId),
    resultsService.getPublishedResult(matchId),
    resultsService.getContests(matchId),
    supabase.auth.getClaims(),
  ]);
  const userId = typeof claimsResult.data?.claims?.sub === 'string' ? claimsResult.data.claims.sub : undefined;

  if (!event || !match || !match.homeTeamId || !match.awayTeamId || !match.courseId) notFound();

  const now = new Date();
  const locked = isMatchRosterLocked(match, now);
  const availabilityOpen = !locked && isMatchAttendanceOpen(match, now);
  const teamIds = [match.homeTeamId, match.awayTeamId];
  const [rosterPlayerIdsByTeam, teamResults, course] = await Promise.all([
    locked ? Promise.resolve(new Map(teamIds.map((teamId) => [teamId, new Set<string>()]))) : getSeasonRosterPlayerIdsByTeam(supabase, match.seasonId, teamIds, matchId),
    Promise.all(teamIds.map((teamId) => launchRepository.getTeam(teamId))),
    courseRepository.getById(match.courseId),
  ]);
  const rosterUnavailable = !locked && rosterPlayerIdsByTeam === null;
  const effectiveRosterIds = rosterPlayerIdsByTeam ?? new Map([[match.homeTeamId, new Set<string>()], [match.awayTeamId, new Set<string>()]]);
  const matchPlayerIds = locked ? [] : [...new Set([...effectiveRosterIds.values()].flatMap((ids) => [...ids]))];
  const players = locked ? [] : await getPlayersByIds(supabase, matchPlayerIds);
  const teams = teamResults.filter((team): team is NonNullable<typeof team> => Boolean(team));
  const courses = course ? [course] : [];

  const matchday = resolveMatchday(event, match, teams, players, courses, Boolean(publishedResult), effectiveRosterIds);
  if (!matchday) notFound();

  const awayColor = matchday.awayTeam.team?.primaryColor || '#0b4fb3';
  const homeColor = matchday.homeTeam.team?.primaryColor || '#a20b78';
  const pageBackground: CSSProperties & {'--match-away': string; '--match-home': string} = {
    '--match-away': awayColor,
    '--match-home': homeColor,
  };

  const availability = availabilityOpen && !rosterUnavailable ? await getPublicAvailability(supabase, matchId, matchday) : undefined;
  const availabilityUnavailable = availabilityOpen && availability === null;

  let officialSnapshot: OfficialSnapshotState | undefined;
  if (locked) {
    officialSnapshot = await matchRosterService.ensureLockedSnapshot(matchId);
    if (officialSnapshot.status !== 'complete' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminRepository = new SupabaseMatchRosterRepository(createAdminClient());
        officialSnapshot = await new MatchRosterService(matchRosterRepository, undefined, adminRepository).ensureLockedSnapshot(
          matchId,
          parseMatchRosterSnapshotStartAt(process.env.MATCH_ROSTER_SNAPSHOT_START_AT),
        );
      } catch (error) {
        console.error('Official match roster snapshot is unavailable.', {operation: 'lazy-create', matchId, errorClass: snapshotErrorClass(error)});
        officialSnapshot = {status: 'unavailable', rosters: []};
      }
    }
  }

  const attendanceRepository = new SupabaseMatchRosterRepository(supabase);
  const actor = userId ? await attendanceRepository.getAttendanceActor(userId) : undefined;
  const openUnlockTeamIds = locked ? await getOpenRosterUnlockTeamIds(supabase, matchId) : new Set<string>();

  const personalAttendance = !locked && userId ? await matchRosterService.getPersonalAttendance(userId, matchId) : undefined;
  let managedRosters = userId && readParam(query.manage) === 'roster'
    ? await matchRosterService.getManagedTeamRosters(userId, matchId)
    : [];
  if (locked) {
    const allowedTeamId = actor?.profileRole === 'Captain' && actor.captainTeamId && openUnlockTeamIds.has(actor.captainTeamId)
      ? actor.captainTeamId
      : undefined;
    managedRosters = allowedTeamId
      ? managedRosters.filter((roster) => roster.teamId === allowedTeamId).map((roster) => ({...roster, attendanceOpen: true}))
      : [];
  }

  const lockedControls = locked && officialSnapshot?.status === 'complete'
    ? resolveLockedControls(actor, match, officialSnapshot.rosters)
    : {canUnlockRoster: false};

  const round = await scheduleService.getRound(match.roundId);
  const attendanceTotals = availability
    ? summarizeAttendance(availability)
    : officialSnapshot?.status === 'complete'
      ? await getLockedAttendanceTotals(supabase, matchId, officialSnapshot.rosters)
      : undefined;

  return (
    <>
      <SiteHeader />
      <main className={styles.page} style={pageBackground}>
        <MatchHero matchday={matchday} roundLabel={round ? `Round ${round.number}` : undefined} />
        <div className={`shell ${styles.content}`}>
          <MatchdayInfoStrip matchday={matchday} attendance={attendanceTotals} />
          <Suspense fallback={null}>
            <MatchPreview matchId={matchId} matchday={matchday} />
          </Suspense>

          {publishedResult ? <MatchScoreboard matchday={matchday} result={publishedResult} contests={contests} /> : null}

          {personalAttendance ? (
            <PersonalAttendanceCard attendance={personalAttendance} notice={readParam(query.attendanceNotice)} error={readParam(query.attendanceError)} />
          ) : null}

          {managedRosters.length ? (
            <CaptainRosterPanel
              rosters={managedRosters}
              teamNames={{[matchday.awayTeam.id]: matchday.awayTeam.name, [matchday.homeTeam.id]: matchday.homeTeam.name}}
              notice={readParam(query.captainNotice)}
              error={readParam(query.captainError)}
            />
          ) : null}

          <MatchRosterBoard
            matchday={matchday}
            official={officialSnapshot}
            rosterUnavailable={rosterUnavailable}
            availability={availability ?? undefined}
            availabilityUnavailable={availabilityUnavailable}
          />

          <Suspense fallback={null}>
            <MatchTeamStats
              awayTeam={{id: matchday.awayTeam.id, name: matchday.awayTeam.name}}
              homeTeam={{id: matchday.homeTeam.id, name: matchday.homeTeam.name}}
              seasonId={match.seasonId}
            />
          </Suspense>

          {!publishedResult ? <MatchScoreboard matchday={matchday} result={publishedResult} contests={[]} /> : null}

          {lockedControls.canUnlockRoster && officialSnapshot?.status === 'complete' ? (
            <CommissionerRosterUnlockPanel
              matchId={matchId}
              teams={[{id: matchday.awayTeam.id, name: matchday.awayTeam.name}, {id: matchday.homeTeam.id, name: matchday.homeTeam.name}]}
              openTeamIds={openUnlockTeamIds}
            />
          ) : null}

          {lockedControls.rosterExport?.ok ? <OfficialRosterExportPanel exportData={lockedControls.rosterExport.data} /> : null}

          <MatchCourseInfo course={matchday.courseDetails} />

          <Suspense fallback={null}>
            <MatchFeed
              matchId={matchId}
              matchDate={match.date}
              notice={readParam(query.feedNotice)}
              error={readParam(query.feedError)}
            />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

function resolveLockedControls(actor: AttendanceActor | undefined, match: Match, rosters: OfficialMatchRoster[]): LockedControls {
  const approved = actor?.profileStatus === 'Approved';
  const teamIds = [match.homeTeamId, match.awayTeamId].filter((teamId): teamId is string => Boolean(teamId));
  const canUnlockRoster = Boolean(
    approved
    && actor?.profileRole === 'Commissioner'
    && ROSTER_CORRECTION_STATUSES.has(match.status)
    && teamIds.length === 2
  );
  const canExport = Boolean(approved && match.date && teamIds.length === 2 && (actor?.profileRole === 'Commissioner' || (actor?.profileRole === 'Captain' && actor.captainTeamId && teamIds.includes(actor.captainTeamId))));
  if (!canExport || !match.date || !match.homeTeamId || !match.awayTeamId) return {canUnlockRoster};
  const home = rosters.find((roster) => roster.teamId === match.homeTeamId);
  const away = rosters.find((roster) => roster.teamId === match.awayTeamId);
  if (!home || !away) return {canUnlockRoster};
  return {canUnlockRoster, rosterExport: {ok: true, data: {matchId: match.id, matchDate: match.date, homeTeam: toExportTeam(home), awayTeam: toExportTeam(away), generatedAt: new Date().toISOString()}}};
}

function toExportTeam(roster: OfficialMatchRoster) {
  return {name: roster.teamNameSnapshot, playerNames: roster.players.map((player) => player.playerNameSnapshot).sort((left, right) => left.localeCompare(right, 'en', {sensitivity: 'base'}))};
}

async function getOpenRosterUnlockTeamIds(supabase: Awaited<ReturnType<typeof createClient>>, matchId: string): Promise<Set<string>> {
  const {data, error} = await (supabase as any).from('launch_match_roster_unlocks').select('team_id').eq('match_id', matchId).is('relocked_at', null);
  if (error) return new Set();
  return new Set((data ?? []).map((row: {team_id: string}) => row.team_id));
}

async function getPublicAvailability(supabase: Awaited<ReturnType<typeof createClient>>, matchId: string, matchday: PublicMatchday): Promise<Map<string, TeamAttendanceMember[]> | null> {
  const teamIds = [matchday.awayTeam.id, matchday.homeTeam.id];
  const attendanceClient = supabase as any;
  const {data, error} = await attendanceClient.from('launch_match_attendance').select('team_id,player_id,status').eq('match_id', matchId).in('team_id', teamIds);
  if (error) {
    console.error('Public match availability is unavailable.', {matchId, error: error.message});
    return null;
  }
  const statuses = new Map<string, TeamAttendanceMember['status']>((data ?? []).map((row: {player_id: string; status: string}) => [row.player_id, row.status as TeamAttendanceMember['status']]));
  const availability = new Map<string, TeamAttendanceMember[]>();
  for (const team of [matchday.awayTeam, matchday.homeTeam]) {
    availability.set(team.id, team.roster.map((player) => ({playerId: player.id, playerName: player.name, teamId: team.id, status: statuses.get(player.id) ?? 'Unconfirmed'})));
  }
  return availability;
}

async function getPlayersByIds(supabase: Awaited<ReturnType<typeof createClient>>, playerIds: string[]): Promise<LaunchPlayer[]> {
  if (!playerIds.length) return [];
  const {data, error} = await supabase.from('launch_players').select('*').in('id', playerIds).order('name');
  if (error) throw error;
  return (data ?? []).map((row) => {
    const rating = row as typeof row & {
      clash_index?: number | null;
      clash_index_provisional?: boolean | null;
    };
    return {
      id: row.id,
      name: row.name,
      gender: row.gender as LaunchPlayer['gender'],
      pdgaNumber: row.pdga_number,
      pdgaRating: row.pdga_rating,
      clashIndex: rating.clash_index ?? null,
      clashIndexProvisional: rating.clash_index_provisional ?? false,
      currentTeamId: row.current_team_id,
      homeArea: row.home_area,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

async function getSeasonRosterPlayerIdsByTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seasonId: string,
  teamIds: string[],
  matchId: string,
): Promise<Map<string, Set<string>> | null> {
  const rosterPlayerIdsByTeam = new Map(teamIds.map((teamId) => [teamId, new Set<string>()]));
  const [{data: memberships, error: membershipError}, {data: loans, error: loanError}] = await Promise.all([
    supabase
      .from('launch_season_roster_memberships')
      .select('team_id, player_id')
      .eq('season_id', seasonId)
      .eq('status', 'Active')
      .in('team_id', teamIds),
    (supabase as any)
      .from('launch_match_roster_loans')
      .select('borrowing_team_id,player_id')
      .eq('match_id', matchId)
      .is('removed_at', null)
      .in('borrowing_team_id', teamIds),
  ]);
  if (membershipError || loanError) {
    console.error('Active match roster memberships are unavailable for matchday.', {
      seasonId,
      matchId,
      teamIds,
      membershipError: membershipError?.message,
      loanError: loanError?.message,
    });
    return null;
  }

  for (const membership of memberships ?? []) {
    rosterPlayerIdsByTeam.get(membership.team_id)?.add(membership.player_id);
  }
  for (const loan of loans ?? []) {
    rosterPlayerIdsByTeam.get(loan.borrowing_team_id)?.add(loan.player_id);
  }
  return rosterPlayerIdsByTeam;
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}


function summarizeAttendance(availability: Map<string, TeamAttendanceMember[]>): MatchdayAttendanceTotals {
  const totals: MatchdayAttendanceTotals = {yes: 0, no: 0, unconfirmed: 0};
  for (const players of availability.values()) {
    for (const player of players) {
      if (player.status === 'Playing') totals.yes += 1;
      else if (player.status === 'NotPlaying') totals.no += 1;
      else totals.unconfirmed += 1;
    }
  }
  return totals;
}

async function getLockedAttendanceTotals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  rosters: OfficialMatchRoster[],
): Promise<MatchdayAttendanceTotals> {
  const playerIds = rosters.flatMap((roster) => roster.players.map((player) => player.playerId));
  const totals: MatchdayAttendanceTotals = {yes: 0, no: 0, unconfirmed: playerIds.length};
  if (!playerIds.length) return totals;

  const {data, error} = await (supabase as any)
    .from('launch_match_attendance')
    .select('player_id,status')
    .eq('match_id', matchId)
    .in('player_id', playerIds);

  if (error) return totals;

  totals.unconfirmed = playerIds.length;
  for (const row of data ?? []) {
    if (row.status === 'Playing') {
      totals.yes += 1;
      totals.unconfirmed -= 1;
    } else if (row.status === 'NotPlaying') {
      totals.no += 1;
      totals.unconfirmed -= 1;
    }
  }
  return totals;
}
