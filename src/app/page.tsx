import Link from 'next/link';
import type {ReactNode} from 'react';
import {ClashCountdown} from '@/components/ClashCountdown';
import {ClashPulse} from '@/components/ClashPulse';
import {createPublicStandingsService} from '@/core/createPublicStandingsService';
import {Intro} from '@/components/intro/Intro';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchCard} from '@/components/MatchCard';
import {getHomepageData} from '@/services/home/HomepageDataService';
import {getHomepageClashPulseItems} from '@/services/home/ClashPulseService';
import {formatStoryDate, getStoryPreview} from '@/services/stories/storyPresentation';

export const revalidate = 21_600;

export default async function Home() {
  const [homepageData, clashPulseItems, standings] = await Promise.all([
    getHomepageData(),
    getHomepageClashPulseItems(),
    createPublicStandingsService().getActiveSeasonStandings(),
  ]);
  const showStandingsSnapshot = Boolean(standings?.entries.some((entry) => entry.gamesPlayed > 0));
  const {storyData, teams: teamLogos, homeEvents} = homepageData;
  const lead = storyData.lead;

  return (
    <main className="home-page">
      <SiteHeader />
      <ClashCountdown />

      <section className="shell home-matches-section home-matches-primary">
        <div className="home-matches-heading">
          <span className="panel-title">Next up</span>
          <h2>{homeEvents[0]?.date ? `Next Clash — ${homeEvents[0].date}` : 'Next Clash matches'}</h2>
        </div>
        <div className="home-match-slate">
          {homeEvents.map((match) => (
            <MatchCard key={match.id} match={match} teams={teamLogos} variant="slate" />
          ))}
        </div>
      </section>

      {showStandingsSnapshot && standings ? (
        <section className="shell home-league-snapshot" aria-label="Current standings snapshot">
          <article className="dark-panel story-home-card compact-standings home-standings-snapshot">
            <div className="panel-heading">
              <span className="panel-title">Current standings</span>
              <Link href="/standings">View all -&gt;</Link>
            </div>
            <div className="mini-table-head"><span>Team</span><span>W-L</span><span>Diff</span></div>
            {standings.entries.slice(0, 4).map((entry) => (
              <div className="mini-standing" key={entry.team.id}>
                <span>
                  <b>{entry.rank}</b>
                  <Link href={`/teams/${entry.team.id}`}>{entry.team.shortName || entry.team.name}</Link>
                </span>
                <span>{entry.wins}-{entry.losses}</span>
                <span>{entry.pointDifferential > 0 ? `+${entry.pointDifferential}` : entry.pointDifferential}</span>
              </div>
            ))}
          </article>
        </section>
      ) : null}

      {lead ? (
        <section className="story-home-hero">
          <StoryPhoto className="story-home-photo" image={lead.image} />
          <div className="story-home-content">
            <span className="eyebrow">Featured story</span>
            <h1>{lead.title}</h1>
            <p>{getStoryPreview(lead)}</p>
            <div className="home-actions">
              <Link href={`/stories/${lead.slug}`} className="button gold-button">Read story <span>-&gt;</span></Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="shell story-home-bottom">
        <section className="dark-panel latest-panel">
          <div className="panel-heading">
            <span className="panel-title">Latest stories</span>
            <Link href="/stories">View all -&gt;</Link>
          </div>
          <div className="compact-story-grid">
            {storyData.latest.map((story) => (
              <article className="compact-story" key={story.id}>
                <StoryPhoto className="compact-photo" image={story.image}><span>League story</span></StoryPhoto>
                <div>
                  <small>{formatStoryDate(story.publishedAt)}</small>
                  <h3>{story.title}</h3>
                  <Link href={`/stories/${story.slug}`}>Read more -&gt;</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <Footer />
      <Intro />
      <ClashPulse items={clashPulseItems} />
    </main>
  );
}

function StoryPhoto({className, image, children}: {className: string; image: string; children?: ReactNode}) {
  const isUrl = image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/');

  return (
    <div
      className={isUrl ? className : `${className} ${image}`}
      style={isUrl ? {backgroundImage: `url(${image})`} : undefined}
      aria-hidden={!children}
    >
      {children}
    </div>
  );
}
