import Link from 'next/link';
import {stories,teams,matches} from '@/lib-data';
import {SiteHeader,Footer} from '@/components/SiteHeader';

export default function Home(){
  const lead=stories[0];
  return <main className="home-page">
    <SiteHeader/>
    <section className="feature-hero">
      <div className="hero-photo" aria-label="Featured disc golf story image">
        <div className="hero-shade"/>
        <div className="shell hero-content">
          <div className="hero-copy">
            <span className="eyebrow light">Featured story</span>
            <h1>{lead.title}</h1>
            <p>{lead.excerpt}</p>
            <Link href={`/stories/${lead.slug}`} className="button gold-button">Read story <span>→</span></Link>
          </div>
          <div className="hero-dots" aria-hidden="true"><b/><i/><i/><i/></div>
        </div>
      </div>
    </section>

    <section className="dashboard-shell shell">
      <article className="dark-panel next-match-card">
        <span className="panel-title">Upcoming match</span>
        <div className="matchup-logos">
          <div><span className="team-shield">♞</span><strong>{matches[0].home}</strong></div>
          <b>VS</b>
          <div><span className="team-shield ninja">N</span><strong>{matches[0].away}</strong></div>
        </div>
        <div className="match-details">
          <p><span>▣</span>{matches[0].date}</p><p><span>◷</span>{matches[0].time}</p><p><span>⌖</span>{matches[0].course}</p>
        </div>
        <Link href="/schedule" className="outline-button">View schedule</Link>
      </article>

      <section className="dark-panel latest-panel">
        <div className="panel-heading"><span className="panel-title">Latest stories</span><Link href="/stories">View all</Link></div>
        <div className="compact-story-grid">
          {stories.map(s=><article className="compact-story" key={s.slug}>
            <div className={`compact-photo ${s.image}`}><span>Replace with photo</span></div>
            <div><small>{s.date}</small><h3>{s.title}</h3><Link href={`/stories/${s.slug}`}>Read more →</Link></div>
          </article>)}
        </div>
      </section>

      <aside className="dark-panel compact-standings">
        <div className="panel-heading"><span className="panel-title">Current standings</span></div>
        <div className="mini-table-head"><span>Team</span><span>W-L</span><span>Diff</span></div>
        {teams.map((t,i)=><div className="mini-standing" key={t.name}><span><b>{i+1}</b>{t.name}</span><span>{t.record}</span><span>{t.diff}</span></div>)}
        <Link href="/standings" className="gold-link">Full standings →</Link>
      </aside>
    </section>

    <section className="shell section simple-publishing">
      <div><span className="eyebrow">Simple publishing</span><h2>Post in minutes.<br/>No code required.</h2><p>Upload a photo, paste your Facebook story, add links, preview it, and save a ready-to-publish post.</p><Link href="/admin" className="button">Open post editor</Link></div>
      <div className="workflow-card"><div className="workflow-top"><span>New story</span><small>Draft saved automatically</small></div><div className="fake-upload">＋<strong>Drop, paste, or choose a photo</strong></div><div className="fake-input">Match headline</div><div className="fake-story">Paste your story here…</div><div className="fake-actions"><span>Preview</span><b>Publish</b></div></div>
    </section>
    <Footer/>
  </main>
}
