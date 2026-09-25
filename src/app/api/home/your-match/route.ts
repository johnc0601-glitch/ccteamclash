import {NextResponse} from 'next/server';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {PlayerAvailabilityService} from '@/domain/match-roster/PlayerAvailabilityService';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return noStoreJson({match: null});

  const repository = new SeasonAwareMatchRosterRepository(supabase);
  const actor = await repository.getAttendanceActor(user.id);
  if (!actor || actor.profileStatus !== 'Approved') return noStoreJson({match: null});

  const teamId = actor.teamId ?? actor.captainTeamId;
  if (!teamId) return noStoreJson({match: null});

  const scheduleService = await createServerScheduleService();
  const nextMatch = await scheduleService.getTeamNextEvent(teamId);
  if (!nextMatch) return noStoreJson({match: null});

  const playerAvailabilityService = new PlayerAvailabilityService(repository);
  const rosterService = new MatchRosterService(repository);
  const [personalAttendance, managedRosters, teamRows] = await Promise.all([
    actor.playerId
      ? playerAvailabilityService.getPersonalAttendance(user.id, nextMatch.id)
      : Promise.resolve(undefined),
    actor.captainTeamId === teamId
      ? rosterService.getManagedTeamRosters(user.id, nextMatch.id)
      : Promise.resolve([]),
    (supabase as any)
      .from('launch_teams')
      .select('id,name,short_name,logo,primary_color')
      .in('id', [nextMatch.homeTeamId, nextMatch.awayTeamId]),
  ]);

  const teamMap = new Map<string, any>((teamRows.data ?? []).map((row: any) => [String(row.id), row]));
  const homeTeam = teamMap.get(nextMatch.homeTeamId);
  const awayTeam = teamMap.get(nextMatch.awayTeamId);
  const myTeam = teamMap.get(teamId);
  const opponentId = nextMatch.homeTeamId === teamId ? nextMatch.awayTeamId : nextMatch.homeTeamId;
  const opponentTeam = teamMap.get(opponentId);
  const managedRoster = managedRosters.find((roster) => roster.teamId === teamId);
  const captainCounts = managedRoster
    ? managedRoster.players.reduce(
      (counts, player) => {
        if (player.status === 'Playing') counts.going += 1;
        else if (player.status === 'NotPlaying') counts.notGoing += 1;
        else counts.undecided += 1;
        return counts;
      },
      {going: 0, notGoing: 0, undecided: 0},
    )
    : null;

  return noStoreJson({
    match: {
      id: nextMatch.id,
      href: nextMatch.href,
      date: nextMatch.date,
      time: nextMatch.time,
      course: nextMatch.course,
      isHome: nextMatch.isHome,
      team: {
        id: teamId,
        name: myTeam?.name ?? (nextMatch.isHome ? nextMatch.home : nextMatch.away),
        shortName: myTeam?.short_name ?? '',
        logo: myTeam?.logo ?? '',
        color: myTeam?.primary_color ?? '',
      },
      opponent: {
        id: opponentId,
        name: opponentTeam?.name ?? nextMatch.opponent,
        shortName: opponentTeam?.short_name ?? '',
        logo: opponentTeam?.logo ?? '',
        color: opponentTeam?.primary_color ?? '',
      },
      home: {
        id: nextMatch.homeTeamId,
        name: homeTeam?.name ?? nextMatch.home,
      },
      away: {
        id: nextMatch.awayTeamId,
        name: awayTeam?.name ?? nextMatch.away,
      },
      attendance: personalAttendance
        ? {
          status: personalAttendance.status,
          open: personalAttendance.attendanceOpen,
        }
        : null,
      captain: managedRoster
        ? {
          ...captainCounts,
          rosterStatus: managedRoster.rosterStatus,
        }
        : null,
    },
  });
}

function noStoreJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Vary: 'Cookie',
    },
  });
}
