import {createServerScheduleService} from '@/core/createServerScheduleService';
import type {LaunchPlayer, LaunchTeam} from '@/domain/launch/LaunchData';
import type {createClient} from '@/lib/supabase/server';
import {OfficeRosterForm} from './OfficeRosterForm';

type Unlock = {id: string; match_id: string; team_id: string};
type PlayerId = {player_id: string};
type Attendance = PlayerId & {status: 'Playing' | 'NotPlaying'};

export async function UnlockedMatchRosters({supabase, teams, players}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  teams: LaunchTeam[];
  players: LaunchPlayer[];
}) {
  const db = supabase as any;
  const unlocks = await db.from('launch_match_roster_unlocks')
    .select('id, match_id, team_id').is('relocked_at', null);
  if (unlocks.error) return <p role="alert">Unlocked match rosters could not be loaded.</p>;
  const rows: Unlock[] = unlocks.data ?? [];
  if (!rows.length) return null;

  const schedule = await createServerScheduleService();
  const editors = await Promise.all(rows.map(async (unlock) => {
    const {id, match_id: matchId, team_id: teamId} = unlock;
    const match = await schedule.getMatch(matchId);
    if (!match || !['Scheduled', 'Postponed', 'Rain Delay'].includes(match.status)
      || (match.homeTeamId !== teamId && match.awayTeamId !== teamId)) return null;
    const team = teams.find((item) => item.id === teamId);
    const opponentId = match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId;
    const opponent = teams.find((item) => item.id === opponentId);
    if (!team || !opponent) return null;

    const [members, loans, attendance] = await Promise.all([
      db.from('launch_season_roster_memberships').select('player_id')
        .eq('season_id', match.seasonId).eq('team_id', teamId).eq('status', 'Active'),
      db.from('launch_match_roster_loans').select('player_id')
        .eq('match_id', matchId).eq('borrowing_team_id', teamId).is('removed_at', null),
      db.from('launch_match_attendance').select('player_id, status')
        .eq('match_id', matchId).eq('team_id', teamId),
    ]);
    const title = `${team.name} vs. ${opponent.name} · ${match.date ?? 'Date pending'}`;
    if (members.error || loans.error || attendance.error) {
      return <p key={id} role="alert">Availability could not be loaded for {title}.</p>;
    }
    const eligibleIds = new Set(
      [...members.data, ...loans.data].map((row: PlayerId) => row.player_id),
    );
    const statusByPlayer = new Map(
      (attendance.data as Attendance[]).map((row) => [row.player_id, row.status]),
    );
    const roster = players.filter((player) => player.active && eligibleIds.has(player.id))
      .map(({id, name}) => ({id, name, status: statusByPlayer.get(id) ?? 'Unconfirmed' as const}))
      .sort((left, right) => left.name.localeCompare(right.name));
    return (
      <details key={id}>
        <summary>{title}</summary>
        <OfficeRosterForm matchId={matchId} teamId={teamId} players={roster} />
      </details>
    );
  }));

  if (!editors.some(Boolean)) return null;
  return (
    <section className="office-module-frame" aria-labelledby="unlocked-match-rosters">
      <h2 id="unlocked-match-rosters">Unlocked match rosters</h2>
      <p>Change player availability for the selected match. Saving updates the official roster and locks it again.</p>
      {editors}
    </section>
  );
}
