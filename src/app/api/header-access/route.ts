import {NextResponse} from 'next/server';
import type {HeaderAccessState} from '@/components/HeaderAccessProvider';
import {createClient} from '@/lib/supabase/server';

const SIGNED_OUT: HeaderAccessState = {
  isSignedIn: false,
  role: null,
  canCaptainManage: false,
  hasClubhouse: false,
  clubhouseHasUnread: false,
};

export async function GET() {
  const supabase = await createClient();
  // Clubhouse tables are newer than the checked-in generated database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clubhouseDb = supabase as any;
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) return NextResponse.json(SIGNED_OUT);

  const signedIn: HeaderAccessState = {...SIGNED_OUT, isSignedIn: true};
  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,role,status,player_id,captain_team_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || profile.status !== 'Approved') {
    return NextResponse.json(signedIn);
  }

  const role = profile.role === 'Commissioner'
    ? 'commissioner'
    : profile.role === 'Captain'
      ? 'captain'
      : null;
  const canCaptainManage = (
    profile.role === 'Captain' || profile.role === 'Commissioner'
  ) && Boolean(profile.captain_team_id);

  let hasClubhouse = false;
  let clubhouseHasUnread = false;

  if (profile.player_id) {
    const {data: season} = await supabase
      .from('launch_seasons')
      .select('id')
      .eq('active', true)
      .eq('archived', false)
      .order('year', {ascending: false})
      .limit(1)
      .maybeSingle();

    if (season?.id) {
      const {data: membership} = await supabase
        .from('launch_season_roster_memberships')
        .select('team_id')
        .eq('season_id', season.id)
        .eq('player_id', profile.player_id)
        .eq('status', 'Active')
        .limit(1)
        .maybeSingle();

      if (membership?.team_id) {
        hasClubhouse = true;
        const {data: readState} = await clubhouseDb
          .from('launch_clubhouse_reads')
          .select('last_read_at')
          .eq('profile_id', profile.id)
          .eq('season_id', season.id)
          .eq('team_id', membership.team_id)
          .maybeSingle();

        let unreadQuery = clubhouseDb
          .from('launch_clubhouse_activity')
          .select('activity_id')
          .eq('season_id', season.id)
          .eq('team_id', membership.team_id)
          .neq('author_profile_id', profile.id)
          .order('created_at', {ascending: false})
          .limit(1);

        if (readState?.last_read_at) {
          unreadQuery = unreadQuery.gt('created_at', readState.last_read_at);
        }

        const {data: unreadActivity} = await unreadQuery;
        clubhouseHasUnread = Boolean(unreadActivity?.length);
      }
    }
  }

  return NextResponse.json({
    isSignedIn: true,
    role,
    canCaptainManage,
    hasClubhouse,
    clubhouseHasUnread,
  } satisfies HeaderAccessState);
}
