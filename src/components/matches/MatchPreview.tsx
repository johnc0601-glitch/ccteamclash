import {createClient} from '@/lib/supabase/server';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {getMatchPreviewInsights} from '@/services/matches/MatchPreviewInsights';
import {saveMatchPreview} from './matchPreviewActions';
import styles from './MatchPreview.module.css';

type MatchPreviewRow = {
  excerpt: string;
  story_url: string | null;
};

const APPROVED_COPY: Record<string, {story: string; battle: string; proven?: string}> = {
  'wild turkey|cougar country': {
    story: 'WT brings a stronger top end',
    battle: 'The Turkeys head into Cougar Country, where the Cougars will be defending their ground.',
  },
  'kb|dark knights': {
    story: 'New Burnt Mill layout',
    battle: 'KB owns the history. Burnt Mill gives Dark Knights a clean slate—and a chance to make the series mean something different.',
    proven: 'Duncan · 15 wins / England · 14 wins',
  },
  'hayneous ogs|ninjas': {
    story: 'New faces on both sides',
    battle: 'The OG’s step into Ninja territory for another close-quarters fight.',
  },
  'beast mode|riptide': {
    story: 'Championship rematch',
    battle: 'Beast Mode meets the Riptide again, looking to turn the current after last year’s Championship.',
  },
};

export async function MatchPreview({matchId, matchday}: {matchId: string; matchday: PublicMatchday}) {
  const supabase = await createClient();
  const db = supabase as any;
  const [previewResult, claimsResult, insights] = await Promise.all([
    db.from('launch_match_previews').select('excerpt,story_url').eq('match_id', matchId).maybeSingle(),
    supabase.auth.getClaims(),
    getMatchPreviewInsights({
      awayName: matchday.awayTeam.name,
      homeName: matchday.homeTeam.name,
      awayRoster: matchday.awayTeam.roster,
      homeRoster: matchday.homeTeam.roster,
    }),
  ]);

  if (previewResult.error) {
    console.error('Match preview is unavailable.', {
      matchId,
      code: previewResult.error.code,
      message: previewResult.error.message,
    });
  } else if (!previewResult.data) {
    console.warn('Match preview was not found.', {matchId});
  }

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
  const approved = APPROVED_COPY[pairKey(matchday.awayTeam.name, matchday.homeTeam.name)];

  return (
    <div className={styles.wrap} id="match-preview">
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
        {excerpt ? (
          <>
            <div className={styles.synopsis}>
              <Stat label="Series" value={insights.series} />
              <Stat label="Proven" value={approved?.proven ?? insights.proven} />
              <Stat label="Swing player" value={insights.swing} />
              <Stat label="Story" value={approved?.story ?? 'A new chapter'} />
            </div>
            <p className={styles.battleLine}>{approved?.battle ?? `${matchday.awayTeam.name} meets ${matchday.homeTeam.name}.`}</p>
            <details className={styles.fullPreview}>
              <summary>
                <span>Full matchup preview</span>
                <span className={styles.chevron} aria-hidden="true">⌄</span>
              </summary>
              <div className={styles.fullPreviewBody}>
                <PreviewCopy excerpt={excerpt} />
                {storyUrl ? <a className={styles.storyLink} href={storyUrl}>Read Full Preview →</a> : null}
              </div>
            </details>
          </>
        ) : <p className={styles.empty}>No match preview has been added yet.</p>}
      </section>
    </div>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return <div className={styles.stat}><span>{label}</span><strong>{value}</strong></div>;
}

function PreviewCopy({excerpt}: {excerpt: string}) {
  const paragraphs = excerpt.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <div className={styles.previewCopy}>
      {paragraphs.map((paragraph, index) => {
        const watch = paragraph.match(/^What to watch:\s*(.*)$/i);
        if (watch) {
          return (
            <aside className={styles.previewWatch} key={paragraph}>
              <span>What to watch</span>
              <strong>{watch[1]}</strong>
            </aside>
          );
        }

        return (
          <p className={index === 0 ? styles.previewLead : styles.previewParagraph} key={paragraph}>
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}

function pairKey(away: string, home: string) {
  return `${normalizeTeamName(away)}|${normalizeTeamName(home)}`;
}

function normalizeTeamName(value: string) {
  return value.toLocaleLowerCase('en').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
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
