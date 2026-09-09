import type {SupabaseClient} from '@supabase/supabase-js';

type ClubhouseContext = {
  seasonId: string;
  seasonName: string;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  teamPrimaryColor: string;
  teamSecondaryColor: string;
  profileId: string;
  playerId: string;
  role: string;
  ownTeamId: string | null;
  isCaptain: boolean;
  isCommissioner: boolean;
  isCommissionerReview: boolean;
};

export async function getClubhouseContext(supabase: SupabaseClient, requestedTeamId?: string | null): Promise<ClubhouseContext | null> {
  const db = supabase as any;
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return null;

  const {data: profile} = await db
    .from('launch_profiles')
    .select('id,player_id,role,status,captain_team_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile || profile.status !== 'Approved') return null;

  const {data: season} = await db
    .from('launch_seasons')
    .select('id,name')
    .eq('active', true)
    .eq('archived', false)
    .order('year', {ascending: false})
    .limit(1)
    .maybeSingle();
  if (!season) return null;

  let ownTeamId: string | null = null;
  if (profile.player_id) {
    const {data: membership} = await db
      .from('launch_season_roster_memberships')
      .select('team_id')
      .eq('season_id', season.id)
      .eq('player_id', profile.player_id)
      .eq('status', 'Active')
      .maybeSingle();
    ownTeamId = membership?.team_id ?? null;
  }

  const isCommissioner = profile.role === 'Commissioner';
  let teamId = ownTeamId;

  if (requestedTeamId) {
    if (requestedTeamId === ownTeamId) {
      teamId = requestedTeamId;
    } else if (isCommissioner) {
      const {data: seasonTeam} = await db
        .from('launch_season_teams')
        .select('team_id')
        .eq('season_id', season.id)
        .eq('team_id', requestedTeamId)
        .maybeSingle();
      if (!seasonTeam) return null;
      teamId = requestedTeamId;
    } else {
      return null;
    }
  }

  if (!teamId) return null;

  const {data: team} = await db
    .from('launch_teams')
    .select('id,name,logo,primary_color,secondary_color')
    .eq('id', teamId)
    .maybeSingle();
  if (!team) return null;

  const isCommissionerReview = isCommissioner && team.id !== ownTeamId;

  return {
    seasonId: season.id,
    seasonName: season.name,
    teamId: team.id,
    teamName: team.name,
    teamLogo: team.logo ?? null,
    teamPrimaryColor: team.primary_color || '#c89b2b',
    teamSecondaryColor: team.secondary_color || '#f4f0e6',
    profileId: profile.id,
    playerId: profile.player_id ?? '',
    role: profile.role,
    ownTeamId,
    isCaptain: profile.role === 'Captain' && profile.captain_team_id === team.id,
    isCommissioner,
    isCommissionerReview,
  };
}

export async function getOwnClubhouseContext(supabase: SupabaseClient): Promise<ClubhouseContext | null> {
  return getClubhouseContext(supabase);
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
