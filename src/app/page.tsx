import Link from 'next/link';
import type {ReactNode} from 'react';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RotatingMatchCard} from '@/components/RotatingMatchCard';
import {services} from '@/core/ServiceContainer';
import {getLatestHistoricalPlayerSeasonSummaries} from '@/data/historicalSeed';
import {matches, teams} from '@/lib-data';
import {getStories} from '@/services/stories/StoryService';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const stories = await getStories();
  const lead = stories[0];
  const topTeams = teams.slice(0, 3);
  const topPlayers = getLatestHistoricalPlayerSeasonSummaries().slice(0, 3);
  const teamLogos = await services.teams.getAll();

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
            <span className="panel-title">Leaderboard</span>
            <h2>Rankings</h2>
          </div>
          <div className="ranking-mini-head"><span>#</span><span>Player</span><span>Win %</span></div>
          {topPlayers.map((entry, index) => (
            <div className="ranking-mini-row" key={entry.playerId}>
              <span>{index + 1}</span>
              <span>
                <strong>{entry.playerName}</strong>
                <small>{entry.teamName} · {formatRecord(entry.overallRecord)}</small>
              </span>
              <b>{entry.winPercentage.toFixed(1)}%</b>
            </div>
          ))}
          <Link href="/rankings" className="gold-link">Open rankings -&gt;</Link>
        </article>

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

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
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
