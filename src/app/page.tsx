import Link from 'next/link';
import type {ReactNode} from 'react';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RotatingMatchCard} from '@/components/RotatingMatchCard';
import {matches, teams} from '@/lib-data';
import {getStoredTeams} from '@/services/teams/TeamStore';
import {getStories} from '@/services/stories/StoryService';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const stories = await getStories();
  const lead = stories[0];
  const topTeams = teams.slice(0, 3);
  const teamLogos = await getStoredTeams();

  return (
    <main className="home-page">
      <SiteHeader />

      {lead ? (
        <section className="story-home-hero">
          <StoryPhoto className="story-home-photo" image={lead.image} />
          <div className="story-home-content">
            <span className="eyebrow">Featured story</span>
            <h1>{lead.title}</h1>
            <p>{lead.excerpt}</p>
            <div className="home-actions">
              <Link href={`/stories/${lead.slug}`} className="button gold-button">Read story <span>-&gt;</span></Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="shell story-home-stack">
        <RotatingMatchCard matches={matches} teams={teamLogos} />

        <article className="dark-panel story-home-card">
          <div>
            <span className="panel-title">Current</span>
            <h2>Standings</h2>
          </div>
          <div className="mini-table-head"><span>Team</span><span>W-L</span><span>Pts %</span></div>
          {topTeams.map((team, index) => (
            <div className="mini-standing" key={team.name}>
              <span><b>{index + 1}</b>{team.name}</span>
              <span>{team.record}</span>
              <span>{team.diff}</span>
            </div>
          ))}
          <Link href="/standings" className="gold-link">Full standings -&gt;</Link>
        </article>

        <article className="dark-panel story-home-card">
          <div>
            <span className="panel-title">Players</span>
            <h2>Rankings</h2>
          </div>
          <div className="ranking-link-list">
            <Link href="/rankings#top-25">Top 25</Link>
            <Link href="/rankings#women">Top 10 Women</Link>
            <Link href="/rankings#all">All</Link>
          </div>
        </article>
      </section>

      <section className="shell story-home-bottom">
        <section className="dark-panel latest-panel">
          <div className="panel-heading">
            <span className="panel-title">Latest stories</span>
            <Link href="/stories">View all -&gt;</Link>
          </div>
          <div className="compact-story-grid">
            {stories.slice(0, 2).map((story) => (
              <article className="compact-story" key={story.slug}>
                <StoryPhoto className="compact-photo" image={story.image}><span>League story</span></StoryPhoto>
                <div>
                  <small>{story.date}</small>
                  <h3>{story.title}</h3>
                  <Link href={`/stories/${story.slug}`}>Read more -&gt;</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <Footer />
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
