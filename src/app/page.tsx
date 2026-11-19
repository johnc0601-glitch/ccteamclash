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

      <section className={styles.challengeHero} aria-labelledby="clash-challenge-heading">
        <div className={styles.challengeCopy}>
          <div className={styles.featureEyebrow}>
            <span className={styles.featureDot} aria-hidden="true" />
            <span>New at Team Clash · The game within the game</span>
          </div>
          <h1 id="clash-challenge-heading">Think You Know <span>the Clash?</span></h1>
          <p className={styles.challengeLead}>
            Winning the match is one thing. <strong>Beating expectations is another.</strong>
          </p>
          <p className={styles.challengeDescription}>
            Every matchup has one fixed projection. Pick the team you think will outperform it —
            even if that team doesn’t win. Make your picks before tee-off, follow the results,
            and play for bragging rights.
          </p>
        </div>

        <div className={styles.challengeVisual}>
          <div className={styles.challengeCard}>
            <div className={styles.cardHeader}>
              <span>Team Clash presents</span>
              <span className={styles.cardNew}>New game</span>
            </div>
          <div className={styles.challengeActions}>
            <Link href="/clash-challenge" className={`button gold-button ${styles.challengeButton}`}>
              Play Clash Challenge <span aria-hidden="true">→</span>
            </Link>
          </div>
            <div className={styles.cardIdentity}>
              <div className={styles.brandEmblem}>
                <Image src="/brand/cctc-logo-inverted.jpg" alt="" width={86} height={86} />
              </div>
              <div className={styles.cardTitle}>
                <span>The</span>
                <strong>Clash<br />Challenge</strong>
              </div>
            </div>
            <div className={styles.cardQuestion}>Which team beats the projection?</div>
            <div className={styles.cardChoices}>
              <div className={styles.cardFavorite}><small>Pick the</small><strong>Favorite</strong></div>
              <span className={styles.cardOr}>or</span>
              <div className={styles.cardUnderdog}><small>Pick the</small><strong>Underdog</strong></div>
            </div>
            <div className={styles.cardSteps}>
              <span><b>01</b> See the projection</span>
              <span><b>02</b> Pick a side</span>
              <span><b>03</b> Beat expectations</span>
            </div>
            <p className={styles.challengeEligibility}>
              Everyone can play. Just sign in to your CCTeamClash account — league registration isn’t required.
            </p>
          </div>
        </div>
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
