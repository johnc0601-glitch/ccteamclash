import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {createPublicScheduleService} from '@/core/createPublicScheduleService';
import {createClient} from '@/lib/supabase/server';

type PreviewRow = {
  match_id: string;
  excerpt: string;
  story_url: string | null;
};

export default async function OfficeMatchPreviewsPage() {
  const events = await createPublicScheduleService().getPublishedEvents();
  const upcoming = events.filter((event) => event.bucket === 'upcoming');
  const supabase = await createClient();
  const ids = upcoming.map((event) => event.id);

  let previews: PreviewRow[] = [];
  if (ids.length) {
    const db = supabase as any;
    const {data} = await db
      .from('launch_match_previews')
      .select('match_id,excerpt,story_url')
      .in('match_id', ids);
    previews = (data ?? []) as PreviewRow[];
  }

  const previewByMatch = new Map(previews.map((preview) => [preview.match_id, preview]));
  const readyCount = upcoming.filter((match) => previewByMatch.get(match.id)?.excerpt?.trim()).length;

  return (
    <OfficePage sectionId="matchPreviews">
      <section className="office-preview-summary" aria-label="Match preview status">
        <div>
          <span>Upcoming matches</span>
          <strong>{upcoming.length}</strong>
        </div>
        <div>
          <span>Preview added</span>
          <strong>{readyCount}</strong>
        </div>
        <div>
          <span>Needs preview</span>
          <strong>{Math.max(0, upcoming.length - readyCount)}</strong>
        </div>
      </section>

      <div className="office-preview-list">
        {upcoming.length ? upcoming.map((match) => {
          const preview = previewByMatch.get(match.id);
          const hasPreview = Boolean(preview?.excerpt?.trim());

          return (
            <article className="office-preview-match" key={match.id}>
              <div className="office-preview-match-head">
                <div>
                  <h2>{match.away} at {match.home}</h2>
                  <div className="office-preview-match-meta">
                    <span>{match.date} · {match.time}</span>
                    <span>{match.course}</span>
                  </div>
                </div>
                <span className={hasPreview ? 'office-preview-status ready' : 'office-preview-status'}>
                  {hasPreview ? 'Preview added' : 'Needs preview'}
                </span>
              </div>

              <p className="office-preview-excerpt">
                {hasPreview
                  ? preview!.excerpt
                  : 'No preview has been added yet. Open Matchday to add the current preview text.'}
              </p>

              <div className="office-preview-actions">
                <Link href={`${match.href}#match-preview`}>{hasPreview ? 'Edit preview' : 'Add preview'}</Link>
                <Link href={match.href}>View Matchday</Link>
              </div>
            </article>
          );
        }) : (
          <section className="office-module-frame">
            <span>Match Previews</span>
            <h2>No upcoming matches</h2>
            <p>Published upcoming matches will appear here automatically.</p>
          </section>
        )}
      </div>
    </OfficePage>
  );
}
