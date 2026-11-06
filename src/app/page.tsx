import Link from 'next/link';
import Image from 'next/image';
import styles from './matchday.module.css';
import type {ReactNode} from 'react';
import {ClashCountdown} from '@/components/ClashCountdown';
import {ClashPulse} from '@/components/ClashPulse';
import {HomeMatchCarousel} from '@/components/HomeMatchCarousel';
import {HomeScoreAutoRefresh} from '@/components/HomeScoreAutoRefresh';
import {Intro} from '@/components/intro/Intro';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchCard} from '@/components/MatchCard';
import {getHomepageData} from '@/services/home/HomepageDataService';
import {getHomepageClashPulseItems} from '@/services/home/ClashPulseService';
import {easternDate} from '@/services/weather/MatchWeather';
import {formatStoryDate} from '@/services/stories/storyPresentation';

// Regenerate the score cards regularly on Matchday while the other homepage
// queries stay cached. Result publication also invalidates this route.
export const revalidate = 60;

export default async function Home() {
  const [homepageData, clashPulseItems] = await Promise.all([
    getHomepageData(),
    getHomepageClashPulseItems(),
  ]);
  const {storyData, teams: teamLogos, homeEvents, publishedScores, feedPreviews, roundLabel} = homepageData;
  const today = easternDate();
  const hasUnpublishedMatchToday = homeEvents.some((match) => match.scheduledDate === today && !publishedScores.has(match.id));

  return (
    <main className="home-page">
      <SiteHeader />
      <ClashCountdown />

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
        <HomeScoreAutoRefresh enabled={hasUnpublishedMatchToday} />
        <div className="home-matches-heading">
          <h2>{roundLabel}</h2>
        </div>
        <HomeMatchCarousel count={homeEvents.length}>
          {homeEvents.map((match) => (
            <MatchCard key={match.id} match={match} teams={teamLogos} feedPreview={feedPreviews.get(match.id)} today={today} result={publishedScores.get(match.id)} />
          ))}
        </HomeMatchCarousel>
      </section>

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
