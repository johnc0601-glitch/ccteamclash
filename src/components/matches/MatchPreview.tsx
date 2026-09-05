import {createClient} from '@/lib/supabase/server';
import {saveMatchPreview} from './matchPreviewActions';
import styles from './MatchPreview.module.css';

type MatchPreviewRow = {
  excerpt: string;
  story_url: string | null;
};

export async function MatchPreview({matchId}: {matchId: string}) {
  const supabase = await createClient();
  const db = supabase as any;
  const [previewResult, claimsResult] = await Promise.all([
    db.from('launch_match_previews').select('excerpt,story_url').eq('match_id', matchId).maybeSingle(),
    supabase.auth.getClaims(),
  ]);

  const preview = previewResult.data as MatchPreviewRow | null;
  const userId = typeof claimsResult.data?.claims?.sub === 'string'
    ? claimsResult.data.claims.sub
    : undefined;

  let canEdit = false;
  if (userId) {
    const {data: profile} = await supabase
      .from('launch_profiles')
      .select('role,status')
      .eq('user_id', userId)
      .maybeSingle();
    canEdit = profile?.role === 'Commissioner' && profile?.status === 'Approved';
  }

  const excerpt = preview?.excerpt?.trim() ?? '';
  if (!excerpt && !canEdit) return null;

  const storyUrl = safeStoryUrl(preview?.story_url);

  return (
    <div className={`shell ${styles.wrap}`} id="match-preview">
      <section className={styles.card} aria-labelledby={`match-preview-title-${matchId}`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Before the clash</p>
            <h2 className={styles.title} id={`match-preview-title-${matchId}`}>Match Preview</h2>
          </div>
          {canEdit ? (
            <details className={styles.editor}>
              <summary>{excerpt ? 'Edit' : 'Add preview'}</summary>
              <form action={saveMatchPreview} className={styles.form}>
                <input type="hidden" name="matchId" value={matchId} />
                <label>
                  Preview text
                  <textarea name="excerpt" defaultValue={excerpt} maxLength={2000} placeholder="Paste the approved match preview here." />
                </label>
                <label>
                  Full story link (optional)
                  <input name="storyUrl" defaultValue={preview?.story_url ?? ''} maxLength={600} placeholder="/stories/..." />
                </label>
                <small>Leave the preview text blank and save to remove this block from the public match page.</small>
                <button type="submit">Save Preview</button>
              </form>
            </details>
          ) : null}
        </div>

        {excerpt ? <p className={styles.excerpt}>{excerpt}</p> : <p className={styles.empty}>No match preview has been added yet.</p>}
        {excerpt && storyUrl ? <a className={styles.storyLink} href={storyUrl}>Read Full Preview →</a> : null}
      </section>
    </div>
  );
}

function safeStoryUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
