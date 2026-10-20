import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {SiteHeader, Footer} from '@/components/SiteHeader';
import {hasSupabaseConfig} from '@/lib/supabase';
import {requireClashCastEditor} from '@/services/podcast/ClashCastEditorAccess';
import {getPodcastStatus, isPodcastEpisodeNew, PODCAST_NEW_EPISODE_DURATION_MS} from '@/services/podcast/PodcastEpisodeStatus';
import {savePodcastEpisodeDetails, setPodcastEpisodeIndicator} from '@/app/office/media/podcastActions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Clash Cast Editor | CC Team Clash',
  description: 'Podcast management for approved Clash Cast editors.',
};

type SearchParams = {episodeNotice?: string; episodeError?: string};
const inputStyle = {
  width: '100%', padding: 12, borderRadius: 9,
  border: '1px solid #b8c5d1', background: '#fff',
  color: '#182635', font: 'inherit',
} as const;
const buttonStyle = {
  borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
  fontWeight: 750, border: '1px solid #aabac8',
} as const;

export default async function ClashCastEditorPage({searchParams}: {searchParams?: Promise<SearchParams>}) {
  if (!hasSupabaseConfig()) redirect('/account?error=Clash%20Cast%20is%20not%20configured.');
  try {
    await requireClashCastEditor();
  } catch {
    redirect('/account?error=Approved%20Clash%20Cast%20editor%20access%20is%20required.');
  }

  const query = searchParams ? await searchParams : {};
  const podcast = await getPodcastStatus();
  const isNew = isPodcastEpisodeNew(podcast.newEpisodeAt);
  const expiresAt = isNew && podcast.newEpisodeAt
    ? new Date(Date.parse(podcast.newEpisodeAt) + PODCAST_NEW_EPISODE_DURATION_MS)
    : null;
  const expiresLabel = expiresAt ? new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(expiresAt) : null;

  return (
    <>
      <SiteHeader />
      <main style={{maxWidth: 800, margin: '0 auto', padding: '30px 16px 80px'}}>
        <section style={{background: '#f5f7fa', color: '#1b2836', padding: 'clamp(18px, 4vw, 30px)', borderRadius: 20, border: '1px solid #d9e1e8'}}>
          <p style={{fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 8px'}}>Podcast tools</p>
          <h1 style={{margin: '0 0 10px'}}>Clash Cast</h1>
          <p style={{marginTop: 0, marginBottom: 20}}>Update the latest Spotify episode shown on ccteamclash.com. The optional NEW indicator lasts seven days.</p>
          <form action={savePodcastEpisodeDetails} style={{display: 'grid', gap: 15, marginBottom: 20}}>
            <input type="hidden" name="returnTo" value="/clash-cast" />
            <label style={{display: 'grid', gap: 6, fontWeight: 700}}>
              Latest episode title
              <input name="episodeTitle" type="text" maxLength={140}
                defaultValue={podcast.latestEpisodeTitle ?? ''} placeholder="Published episode title"
                style={inputStyle} />
            </label>
            <label style={{display: 'grid', gap: 6, fontWeight: 700}}>
              Spotify episode link (optional)
              <input name="episodeUrl" type="url" maxLength={500}
                defaultValue={podcast.latestEpisodeUrl ?? ''} placeholder="https://open.spotify.com/episode/..."
                style={inputStyle} />
            </label>
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              <button type="submit" name="episodeAction" value="save"
                style={{...buttonStyle, background: '#fff', color: '#1b2836'}}>Save latest episode</button>
              <button type="submit" name="episodeAction" value="announce"
                style={{...buttonStyle, background: '#193c59', color: '#fff'}}>Save &amp; mark NEW (7 days)</button>
            </div>
          </form>
          {query.episodeNotice ? <p role="status" style={{fontWeight: 700}}>{query.episodeNotice}</p> : null}
          {query.episodeError ? <p role="alert" style={{fontWeight: 700, color: '#aa2828'}}>{query.episodeError}</p> : null}
          <div style={{borderTop: '1px solid #d7e0e8', paddingTop: 18}}>
            <p style={{margin: '0 0 12px', fontSize: 14}}>
              Status: <strong>{isNew ? 'NEW episode indicator active' : 'No active NEW indicator'}</strong>
              {expiresLabel ? ' (expires ' + expiresLabel + ')' : ''}
            </p>
            <form action={setPodcastEpisodeIndicator} style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              <input type="hidden" name="returnTo" value="/clash-cast" />
              <button type="submit" name="intent" value="activate"
                style={{...buttonStyle, background: '#fff', color: '#1b2836'}}>{isNew ? 'Restart seven-day indicator' : 'Mark new episode'}</button>
              {isNew ? <button type="submit" name="intent" value="clear"
                style={{...buttonStyle, background: '#fff', color: '#1b2836'}}>Clear NEW indicator</button> : null}
            </form>
          </div>
          <p style={{marginBottom: 0, marginTop: 24, fontSize: 13}}><Link href="/">Back to league homepage</Link></p>
        </section>
      </main>
      <Footer />
    </>
  );
}
