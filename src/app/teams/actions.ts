'use server';

import {services} from '@/core/ServiceContainer';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {createProfileFromPublicPlayerView} from '@/services/playerProfiles';
import type {PlayerProfile} from '@/services/playerProfiles';
import {buildPublicTeamRoster} from '@/services/public/PublicRosterService';

export type TeamRosterPlayerProfileRequest = {
  seasonId: string;
  teamId: string;
  teamName: string;
  currentSeasonName: string;
  playerId: string;
  playerName: string;
};

export async function loadTeamRosterPlayerProfile(
  request: TeamRosterPlayerProfileRequest,
): Promise<PlayerProfile | null> {
  if (!validRequest(request)) return null;

  const supabase = await createClient();
  const {data: membership, error: membershipError} = await supabase
    .from('launch_season_roster_memberships')
    .select('player_id')
    .eq('season_id', request.seasonId)
    .eq('team_id', request.teamId)
    .eq('player_id', request.playerId)
    .eq('status', 'Active')
    .maybeSingle();
  if (membershipError || !membership) return null;

  const launchPlayers = await new SupabaseLaunchRepository(supabase).getPlayers();
  const launchPlayer = launchPlayers.find((player) =>
    player.id === request.playerId && player.active,
  );
  if (!launchPlayer) return null;

  const historicalPlayers = await services.publicPlayers.getForPlayerIdentities([
    {id: request.playerId, name: request.playerName},
  ]);
  const roster = buildPublicTeamRoster(
    launchPlayers,
    historicalPlayers,
    request.teamId,
    request.teamName,
    request.currentSeasonName,
    new Set([request.playerId]),
  );
  const playerView = roster.find(({player}) => player.id === request.playerId);
  return playerView ? createProfileFromPublicPlayerView(playerView) : null;
}

function validRequest(request: TeamRosterPlayerProfileRequest): boolean {
  return [
    request.seasonId,
    request.teamId,
    request.teamName,
    request.currentSeasonName,
    request.playerId,
    request.playerName,
  ].every((value) => value.trim().length > 0 && value.length <= 200);
}
