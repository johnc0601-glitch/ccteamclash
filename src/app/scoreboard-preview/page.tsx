import {notFound} from 'next/navigation';
import {ScoreboardPreviewClient} from '@/components/matches/ScoreboardPreviewClient';
import {getPublicDirectoryData} from '@/services/public/PublicDirectoryDataService';
import {loadPublishedUpsetEvidence} from '@/services/matches/PublicUpsetEvidence';
import {
  FALLBACK_PREVIEW_BRANDING,
  type PublicTeamBranding,
} from '@/services/matches/ScoreboardPreviewBranding';

export const dynamic = 'force-dynamic';

async function getPreviewTeamBranding(): Promise<PublicTeamBranding[]> {
  try {
    // Uses only the public league directory and RLS. No player/roster/private data
    // is queried. Uploaded JSON files remain entirely inside the browser.
    const {teams} = await getPublicDirectoryData();
    const result = teams.map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      logo: team.logo,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
    }));
    return result.length ? result : FALLBACK_PREVIEW_BRANDING;
  } catch {
    // Keep the reviewer-only page available when a preview deployment lacks
    // Supabase configuration; fallback assets match the public production record.
    return FALLBACK_PREVIEW_BRANDING;
  }
}

export default async function ScoreboardPreviewPage() {
  // Commissioner authentication is never bypassed. This is a browser-only
  // local JSON viewer and does not exist on production deployments.
  if (process.env.VERCEL_ENV === 'production') notFound();

  const [branding, publishedUpsets] = await Promise.all([
    getPreviewTeamBranding(),
    loadPublishedUpsetEvidence(),
  ]);
  return <ScoreboardPreviewClient branding={branding} publishedUpsets={publishedUpsets} />;
}
