import {OfficePage} from '@/components/commissioner/OfficePage';
import {LaunchPlayerManagement} from '@/components/launch/LaunchPlayerManagement';
import {MemberManagement} from '@/components/launch/MemberManagement';
import {
  SeasonRegistrationReview,
  type RejectedSeasonRegistration,
} from '@/components/launch/SeasonRegistrationReview';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';

type OfficePlayersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RejectedApplicationRow = {
  id: string;
  profile_id: string;
  season_id: string;
  requested_team_id: string;
  player_type: string;
  gender: string;
};

export default async function OfficePlayersPage({searchParams}: OfficePlayersPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readParam(params.notice);
  const error = readParam(params.error);

  if (!hasSupabaseConfig()) {
    return (
      <OfficePage sectionId="players">
        <LaunchPlayerManagement error="Supabase is not configured for player control." notice={notice} />
      </OfficePage>
    );
  }

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) {
    return (
      <OfficePage sectionId="players">
        <LaunchPlayerManagement error="Sign in from the public Account page before opening player control." notice={notice} />
      </OfficePage>
    );
  }

  const repository = new SupabaseLaunchRepository(supabase);
  const commissionerProfile = await repository.getProfileByUserId(user.id);
  if (commissionerProfile?.role !== 'Commissioner' || commissionerProfile.status !== 'Approved') {
    return (
      <OfficePage sectionId="players">
        <LaunchPlayerManagement error="Approved commissioner access is required." notice={notice} />
      </OfficePage>
    );
  }

  const [players, teams, profiles, claims] = await Promise.all([
    repository.getPlayers(),
    repository.getTeams(),
    repository.getProfiles(),
    repository.getPlayerClaims(),
  ]);

  const launchSupabase = supabase as any;
  const {data: rejectedRows} = await launchSupabase
    .from('launch_player_applications')
    .select('id, profile_id, season_id, requested_team_id, player_type, gender')
    .eq('status', 'Rejected')
    .order('updated_at', {ascending: false});

  const rows = (rejectedRows ?? []) as RejectedApplicationRow[];
  const seasonIds = [...new Set(rows.map((row) => row.season_id))];
  const {data: seasonRows} = seasonIds.length
    ? await supabase.from('launch_seasons').select('id, name').in('id', seasonIds)
    : {data: [] as {id: string; name: string}[]};

  const seasonNames = new Map((seasonRows ?? []).map((season) => [season.id, season.name]));
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.displayName]));
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));

  const rejectedRegistrations: RejectedSeasonRegistration[] = rows.map((row) => ({
    id: row.id,
    displayName: profileNames.get(row.profile_id) ?? 'Unknown player',
    seasonName: seasonNames.get(row.season_id) ?? row.season_id,
    teamId: row.requested_team_id,
    teamName: teamNames.get(row.requested_team_id) ?? row.requested_team_id,
    playerType: row.player_type,
    gender: row.gender,
  }));

  return (
    <OfficePage sectionId="players">
      <SeasonRegistrationReview
        registrations={rejectedRegistrations}
        teams={teams.map((team) => ({id: team.id, name: team.name}))}
      />
      <MemberManagement
        claims={claims}
        commissionerProfileId={commissionerProfile.id}
        error={error}
        notice={notice}
        players={players}
        profiles={profiles}
        showDirectory={false}
        teams={teams}
      />
      <LaunchPlayerManagement
        commissionerProfileId={commissionerProfile.id}
        players={players}
        profiles={profiles}
        teams={teams}
      />
    </OfficePage>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
