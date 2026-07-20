import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RotatingMatchCard} from '@/components/RotatingMatchCard';
import {matches, stories, teams} from '@/lib-data';

export default function Home() {
  const lead = stories[0];
  const topTeams = teams.slice(0, 3);

  return (
    <main className="home-page">
      <SiteHeader />

      <section className="story-home-hero">
        <div className="story-home-photo" aria-hidden="true" />
        <div className="story-home-content">
          <span className="eyebrow">Featured story</span>
          <h1>{lead.title}</h1>
          <p>{lead.excerpt}</p>
          <div className="home-actions">
            <Link href={`/stories/${lead.slug}`} className="button gold-button">Read story <span>-&gt;</span></Link>
            <Link href="/teams" className="button outline-home-button">View teams</Link>
            <Link href="/players" className="button subtle-home-button">Players</Link>
          </div>
        </div>
      </section>

      <section className="shell story-home-stack">
        <RotatingMatchCard matches={matches} />

        <article className="dark-panel story-home-card">
          <div>
            <span className="panel-title">Leaderboard</span>
            <h2>Rankings</h2>
          </div>
          <p>Overall rankings, top 25, women, singles, and doubles live together in one clean view.</p>
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
                <div className={`compact-photo ${story.image}`}><span>League story</span></div>
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
