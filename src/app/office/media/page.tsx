import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {StoryManager} from '@/components/StoryManager';
import {getPodcastStatus, isPodcastEpisodeNew, PODCAST_NEW_EPISODE_DURATION_MS} from '@/services/podcast/PodcastEpisodeStatus';
import {savePodcastEpisodeDetails, setPodcastEpisodeIndicator} from './podcastActions';

const mediaCardStyle = {
  border: '1px solid rgba(127,127,127,.35)',
  borderRadius: 12,
  padding: 16,
} as const;

type OfficeMediaSearchParams = {
  episodeNotice?: string;
  episodeError?: string;
};

export default async function OfficeMediaPage({searchParams}: {searchParams?: Promise<OfficeMediaSearchParams>}) {
  const query = searchParams ? await searchParams : {};
  const podcast = await getPodcastStatus();
  const markedAt = podcast.newEpisodeAt;
  const active = isPodcastEpisodeNew(markedAt);
  const expiresAt = markedAt && active
    ? new Date(Date.parse(markedAt) + PODCAST_NEW_EPISODE_DURATION_MS)
    : null;
  const expiresLabel = expiresAt ? new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(expiresAt) : '';
  return (
    <OfficePage sectionId="media">
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20}}>
        <section style={mediaCardStyle}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
            <strong>Clash Cast</strong>
            <span style={{fontSize: 11, fontWeight: 850, opacity: .8}}>{active ? 'NEW EPISODE ACTIVE' : 'NO NEW EPISODE'}</span>
          </div>
          <p style={{margin: '8px 0 12px'}}>Set the latest episode title and link. The title stays visible in the desktop header until you replace it; the optional NEW badge lasts seven days.</p>
          <form action={savePodcastEpisodeDetails} style={{display: 'grid', gap: 10, marginBottom: 14}}>
            <label style={{display: 'grid', gap: 4, fontSize: 12, fontWeight: 800}}>
              Latest episode title
              <input
                name="episodeTitle"
                type="text"
                maxLength={140}
                defaultValue={podcast.latestEpisodeTitle ?? ''}
                placeholder="Enter the published episode title"
                style={{width: '100%', padding: '10px 11px', border: '1px solid rgba(127,127,127,.5)', borderRadius: 5, background: 'var(--cc-surface-deep)', color: 'var(--cc-text)', font: 'inherit'}}
              />
            </label>
            <label style={{display: 'grid', gap: 4, fontSize: 12, fontWeight: 800}}>
              Spotify episode link (optional)
              <input
                name="episodeUrl"
                type="url"
                maxLength={500}
                defaultValue={podcast.latestEpisodeUrl ?? ''}
                placeholder="https://open.spotify.com/episode/..."
                style={{width: '100%', padding: '10px 11px', border: '1px solid rgba(127,127,127,.5)', borderRadius: 5, background: 'var(--cc-surface-deep)', color: 'var(--cc-text)', font: 'inherit'}}
              />
            </label>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              <button type="submit" name="episodeAction" value="save">Save latest episode</button>
              <button type="submit" name="episodeAction" value="announce">Save &amp; mark NEW (7 days)</button>
            </div>
          </form>
          {expiresAt ? <p style={{fontSize: 12, margin: '0 0 10px'}}>Indicator expires {expiresLabel}.</p> : null}
          {query.episodeNotice ? <p role="status" style={{fontSize: 13}}>{query.episodeNotice}</p> : null}
          {query.episodeError ? <p role="alert" style={{fontSize: 13, color: '#c0392b'}}>{query.episodeError}</p> : null}
          <form action={setPodcastEpisodeIndicator} style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <button type="submit" name="intent" value="activate">{active ? 'Restart 7-day indicator' : 'Mark new episode'}</button>
            {active ? <button type="submit" name="intent" value="clear">Clear indicator</button> : null}
          </form>
        </section>
        <section style={mediaCardStyle}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
            <div>
              <strong>Photo Library</strong>
              <p style={{margin: '6px 0 0'}}>Upload once, reuse photos in stories, and choose which images appear in the public gallery.</p>
            </div>
            <Link href="/office/media/photos">Open photo library</Link>
          </div>
        </section>

        <section style={mediaCardStyle}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
            <div>
              <strong>Matchday moderation</strong>
              <p style={{margin: '6px 0 0'}}>Review member reports from Matchday posts and comments.</p>
            </div>
            <Link href="/office/media/moderation">Open moderation</Link>
          </div>
        </section>

      </div>
      <StoryManager />
    </OfficePage>
  );
}
