import {notFound} from 'next/navigation';
import {ScoreboardPreviewClient} from '@/components/matches/ScoreboardPreviewClient';

export const dynamic = 'force-dynamic';

export default function ScoreboardPreviewPage() {
  // Commissioner authentication is never bypassed. This is a browser-only,
  // read-only design preview and must not be available on production.
  if (process.env.VERCEL_ENV === 'production') notFound();

  return <ScoreboardPreviewClient />;
}
