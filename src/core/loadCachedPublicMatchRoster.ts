import {unstable_cache} from 'next/cache';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {MatchAttendanceStatus} from '@/domain/match-roster/MatchAttendance';
import {createPublicClient} from '@/lib/supabase/public';

export const PUBLIC_MATCH_ROSTERS_TAG = 'public:match-rosters';

export function publicMatchRosterTag(matchId: string): string {
  return `public:match-roster:${matchId}`;
}

export type CachedPublicMatchRoster = {
  rosterByTeam: Array<{teamId: string; playerIds: string[]}>;
  players: LaunchPlayer[];
  attendance: Array<{
    teamId: string;
    playerId: string;
    status: MatchAttendanceStatus;
  }>;
};

export async function loadCachedPublicMatchRoster(
  matchId: string,
  seasonId: string,
  teamIds: string[],
): Promise<CachedPublicMatchRoster | null> {
  const normalizedTeamIds = [...new Set(teamIds.filter(Boolean))].sort();

  return unstable_cache(
    async (): Promise<CachedPublicMatchRoster | null> => {
      const supabase = createPublicClient();
      const rosterByTeam = new Map(
        normalizedTeamIds.map((teamId) => [teamId, new Set<string>()] as const),
      );

      const [
        {data: memberships, error: membershipError},
        {data: loans, error: loanError},
        {data: attendanceRows, error: attendanceError},
      ] = await Promise.all([
        supabase
          .from('launch_season_roster_memberships')
          .select('team_id,player_id')
          .eq('season_id', seasonId)
          .eq('status', 'Active')
          .in('team_id', normalizedTeamIds),
        (supabase as any)
          .from('launch_match_roster_loans')
          .select('borrowing_team_id,player_id')
          .eq('match_id', matchId)
          .is('removed_at', null)
          .in('borrowing_team_id', normalizedTeamIds),
        (supabase as any)
          .from('launch_match_attendance')
          .select('team_id,player_id,status')
          .eq('match_id', matchId)
          .in('team_id', normalizedTeamIds),
      ]);

      if (membershipError || loanError || attendanceError) {
        throw membershipError ?? loanError ?? attendanceError;
      }

      for (const membership of memberships ?? []) {
        rosterByTeam.get(membership.team_id)?.add(membership.player_id);
      }
      for (const loan of loans ?? []) {
        rosterByTeam.get(loan.borrowing_team_id)?.add(loan.player_id);
      }

      const playerIds = [...new Set(
        [...rosterByTeam.values()].flatMap((ids) => [...ids]),
      )];

      let players: LaunchPlayer[] = [];
      if (playerIds.length) {
        const {data, error} = await supabase
          .from('launch_players')
          .select('*')
          .in('id', playerIds)
          .eq('active', true)
          .order('name');

        if (error) throw error;

        players = (data ?? []).map((row) => {
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

      return {
        rosterByTeam: normalizedTeamIds.map((teamId) => ({
          teamId,
          playerIds: [...(rosterByTeam.get(teamId) ?? [])],
        })),
        players,
        attendance: (attendanceRows ?? []).map((row: {
          team_id: string;
          player_id: string;
          status: string;
        }) => ({
          teamId: row.team_id,
          playerId: row.player_id,
          status: row.status as MatchAttendanceStatus,
        })),
      };
    },
    ['public-match-roster-v1', matchId, seasonId, ...normalizedTeamIds],
    {
      tags: [PUBLIC_MATCH_ROSTERS_TAG, publicMatchRosterTag(matchId), 'public:players'],
    },
  )().catch((error) => {
    console.error('Cached public match roster is unavailable.', {
      matchId,
      seasonId,
      teamIds: normalizedTeamIds,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    return null;
  });
}
