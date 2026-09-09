import type {SupabaseClient} from '@supabase/supabase-js';

type ClubhouseContext = {
  seasonId: string;
  seasonName: string;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  profileId: string;
  playerId: string;
  role: string;
  isCaptain: boolean;
  isCommissioner: boolean;
};

export async function getOwnClubhouseContext(supabase: SupabaseClient): Promise<ClubhouseContext | null> {
  const db = supabase as any;
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return null;

  const {data: profile} = await db
    .from('launch_profiles')
    .select('id,player_id,role,status,captain_team_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile || profile.status !== 'Approved' || !profile.player_id) return null;

  const {data: season} = await db
    .from('launch_seasons')
    .select('id,name')
    .eq('active', true)
    .eq('archived', false)
    .order('year', {ascending: false})
    .limit(1)
    .maybeSingle();
  if (!season) return null;

  const {data: membership} = await db
    .from('launch_season_roster_memberships')
    .select('team_id')
    .eq('season_id', season.id)
    .eq('player_id', profile.player_id)
    .eq('status', 'Active')
    .maybeSingle();
  if (!membership?.team_id) return null;

  const {data: team} = await db
    .from('launch_teams')
    .select('id,name,logo')
    .eq('id', membership.team_id)
    .maybeSingle();
  if (!team) return null;

  return {
    seasonId: season.id,
    seasonName: season.name,
    teamId: team.id,
    teamName: team.name,
    teamLogo: team.logo ?? null,
    profileId: profile.id,
    playerId: profile.player_id,
    role: profile.role,
    isCaptain: profile.role === 'Captain' && profile.captain_team_id === team.id,
    isCommissioner: profile.role === 'Commissioner',
  };
}

export async function getCommissionerProfile(supabase: SupabaseClient) {
  const db = supabase as any;
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return null;
  const {data: profile} = await db
    .from('launch_profiles')
    .select('id,role,status')
    .eq('user_id', user.id)
    .maybeSingle();
  return profile?.role === 'Commissioner' && profile.status === 'Approved' ? profile : null;
}
