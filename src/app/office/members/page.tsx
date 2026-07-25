import {OfficePage} from '@/components/commissioner/OfficePage';
import {MemberManagement} from '@/components/launch/MemberManagement';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';

type OfficeMembersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OfficeMembersPage({searchParams}: OfficeMembersPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readParam(params.notice);
  const error = readParam(params.error);

  if (!hasSupabaseConfig()) {
    return (
      <OfficePage sectionId="members">
        <MemberManagement notice={notice} error="Supabase is not configured for league accounts." />
      </OfficePage>
    );
  }

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) {
    return (
      <OfficePage sectionId="members">
        <MemberManagement notice={notice} error="Sign in from the public Account page before opening member approvals." />
      </OfficePage>
    );
  }

  const repository = new SupabaseLaunchRepository(supabase);
  const commissionerProfile = await repository.getProfileByUserId(user.id);

  if (commissionerProfile?.role !== 'Commissioner' || commissionerProfile.status !== 'Approved') {
    return (
      <OfficePage sectionId="members">
        <MemberManagement notice={notice} error="Approved commissioner access is required." />
      </OfficePage>
    );
  }

  const [profiles, claims, players, teams] = await Promise.all([
    repository.getProfiles(),
    repository.getPlayerClaims(),
    repository.getPlayers(),
    repository.getTeams(),
  ]);

  return (
    <OfficePage sectionId="members">
      <MemberManagement
        claims={claims}
        commissionerProfileId={commissionerProfile.id}
        error={error}
        notice={notice}
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
