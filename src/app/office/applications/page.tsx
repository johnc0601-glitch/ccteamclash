import {OfficePage} from '@/components/commissioner/OfficePage';
import {PlayerApplicationReviewQueue} from '@/components/launch/PlayerApplicationReviewQueue';
import {createServerPlayerApplicationService} from '@/core/createServerPlayerApplicationService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {buildPlayerApplicationReviewCards} from '@/domain/player-application/PlayerApplicationReview';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OfficeApplicationsPage({searchParams}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const applicationService = await createServerPlayerApplicationService();
  const launchRepository = new SupabaseLaunchRepository(supabase);
  const [applications, profiles, claims, players, teams] = await Promise.all([
    applicationService.listApplications(), launchRepository.getProfiles(),
    launchRepository.getPlayerClaims(), launchRepository.getPlayers(), launchRepository.getTeams(),
  ]);
  const cards = buildPlayerApplicationReviewCards({applications, profiles, claims, players, teams});

  return <OfficePage sectionId="applications">
    <PlayerApplicationReviewQueue cards={cards} notice={readParam(params.notice)} error={readParam(params.error)} />
  </OfficePage>;
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
