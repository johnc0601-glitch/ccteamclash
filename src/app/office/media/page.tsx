import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {StoryManager} from '@/components/StoryManager';
import {getPodcastEpisodeAt, isPodcastEpisodeNew, PODCAST_NEW_EPISODE_DURATION_MS} from '@/services/podcast/PodcastEpisodeStatus';
import {setPodcastEpisodeIndicator} from './podcastActions';

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
  const markedAt = await getPodcastEpisodeAt();
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
          <p style={{margin: '8px 0 10px'}}>Mark a new podcast episode to display a small NEW indicator beside Clash Cast in the site header for seven days.</p>
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

        <section style={mediaCardStyle}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                <strong>Clash Pulse</strong>
                <span style={{fontSize: 11, fontWeight: 800, letterSpacing: '.08em', border: '1px solid currentColor', borderRadius: 999, padding: '2px 7px'}}>VERIFIED DATA</span>
              </div>
              <p style={{margin: '6px 0 0'}}>Review verified player and team facts, build the Pulse Queue, and publish the strongest items to the homepage.</p>
            </div>
            <Link href="/office/media/around-the-clash">Open Clash Pulse</Link>
          </div>
        </section>
      </div>
      <StoryManager />
    </OfficePage>
  );
}
