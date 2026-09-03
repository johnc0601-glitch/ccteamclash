'use server';

import {createClient} from '@/lib/supabase/server';

export type LazyRosterPlayer = {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Unknown';
  pdgaRating: number | null;
  clashIndex: number | null;
  clashIndexProvisional: boolean;
};

export type LazyRosterResult =
  | {ok: true; players: LazyRosterPlayer[]}
  | {ok: false; message: string};

const PREVIEW_COUNT = 5;
const MAX_RETURNED_PLAYERS = 60;

export async function loadActiveRosterRemainder(seasonId: string, teamId: string): Promise<LazyRosterResult> {
  const cleanSeasonId = cleanId(seasonId);
  const cleanTeamId = cleanId(teamId);
  if (!cleanSeasonId || !cleanTeamId) return {ok: false, message: 'Roster could not be loaded.'};

  try {
    const supabase = await createClient();
    const {data: memberships, error: membershipError} = await supabase
      .from('launch_season_roster_memberships')
      .select('player_id')
      .eq('season_id', cleanSeasonId)
      .eq('team_id', cleanTeamId)
      .eq('status', 'Active');

    if (membershipError) throw membershipError;

    const playerIds = [...new Set((memberships ?? []).map((membership) => membership.player_id).filter(Boolean))];
    if (playerIds.length <= PREVIEW_COUNT) return {ok: true, players: []};

    const {data: players, error: playerError} = await (supabase as any)
      .from('launch_players')
      .select('id,name,gender,pdga_rating,clash_index,clash_index_provisional')
      .in('id', playerIds)
      .order('name');

    if (playerError) throw playerError;

    return {
      ok: true,
      players: (players ?? [])
        .slice(PREVIEW_COUNT, PREVIEW_COUNT + MAX_RETURNED_PLAYERS)
        .map((player: any) => ({
          id: String(player.id),
          name: typeof player.name === 'string' ? player.name : '',
          gender: player.gender === 'Female' || player.gender === 'Male' ? player.gender : 'Unknown',
          pdgaRating: typeof player.pdga_rating === 'number' ? player.pdga_rating : null,
          clashIndex: typeof player.clash_index === 'number' ? player.clash_index : null,
          clashIndexProvisional: player.clash_index_provisional === true,
        })),
    };
  } catch (error) {
    console.error('Public active roster remainder could not be loaded.', {seasonId: cleanSeasonId, teamId: cleanTeamId, error});
    return {ok: false, message: 'Roster could not be loaded. Try again.'};
  }
}

function cleanId(value: string): string {
  return typeof value === 'string' ? value.trim().slice(0, 160) : '';
}
