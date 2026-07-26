import {OfficePage} from '@/components/commissioner/OfficePage';
import {LaunchPlayerManagement} from '@/components/launch/LaunchPlayerManagement';
import {MemberManagement} from '@/components/launch/MemberManagement';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';

type OfficePlayersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

  return (
    <OfficePage sectionId="players">
      <MemberManagement
        claims={claims}
        commissionerProfileId={commissionerProfile.id}
        error={error}
        notice={notice}
        players={players}
        profiles={profiles}
        teams={teams}
      />
      <LaunchPlayerManagement players={players} teams={teams} />
    </OfficePage>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
