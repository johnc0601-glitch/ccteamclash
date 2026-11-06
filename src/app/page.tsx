import Link from 'next/link';
import Image from 'next/image';
import {cookies} from 'next/headers';
import type {ReactNode} from 'react';
import {Intro} from '@/components/intro/Intro';
import {INTRO_COOKIE_NAME} from '@/components/intro/intro.config';
import {parseIntroQuery} from '@/components/intro/introDecision';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchCard} from '@/components/MatchCard';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {getStoredTeams} from '@/services/teams/TeamStore';
import {getStories} from '@/services/stories/StoryService';
import styles from './matchday.module.css';

export const dynamic = 'force-dynamic';

type HomeProps = {
  searchParams: Promise<{intro?: string | string[]}>;
};

export default async function Home({searchParams}: HomeProps) {
  const [cookieStore, query] = await Promise.all([cookies(), searchParams]);
  const scheduleService = await createServerScheduleService();
  const stories = await getStories();
  const teamLogos = await getStoredTeams();
  const homeEvents = (await scheduleService.getHomePageEvents()).slice(0, 4);

  return (
    <main className="home-page">
      <SiteHeader />

      <section className={styles.banner} aria-labelledby="matchday-heading">
        <div className={styles.poster}>
          <Image
            src="/matchday/round-2-fall.png"
            alt="Coastal Carolina Team Clash Round 2 Matchday crest over an autumn coastal sunset"
            width={1672}
            height={941}
            sizes="(max-width: 900px) 100vw, 60vw"
            preload
          />
        </div>
        <div className={styles.content}>
          <span className="eyebrow">Round 2 Matchday</span>
          <h1 id="matchday-heading">Round 2. Bring the Heat.</h1>
          <p>
            Fall is in the air, and Team Clash is back on the course. Round 2 brings fresh battles,
            hometown pride, and another chance to put points on the board. Rally your team, bring
            your best, and make every throw count.
          </p>
          <strong>Fun. Fellowship. Disc Golf.</strong>
          <div className="home-actions">
            <Link href="/schedule" className="button gold-button">View the schedule <span>-&gt;</span></Link>
          </div>
        </div>
      </section>

      <section className="shell home-matches-section">
        <div className="home-matches-heading">
          <span className="panel-title">League schedule</span>
          <h2>This month&apos;s matches</h2>
        </div>
        <div className="home-match-grid">
          {homeEvents.map((match) => (
            <MatchCard key={match.id} match={match} teams={teamLogos} />
          ))}
        </div>
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
      <Intro
        hasLoginMarker={cookieStore.get(INTRO_COOKIE_NAME)?.value === '1'}
        queryOverride={parseIntroQuery(query.intro)}
      />
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
