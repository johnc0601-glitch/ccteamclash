import Link from 'next/link';
import {cookies} from 'next/headers';
import type {ReactNode} from 'react';
import {HomeMatchCarousel} from '@/components/HomeMatchCarousel';
import {Intro} from '@/components/intro/Intro';
import {INTRO_COOKIE_NAME} from '@/components/intro/intro.config';
import {parseIntroQuery} from '@/components/intro/introDecision';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchCard} from '@/components/MatchCard';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {getHomepageMatchFeedPreviews} from '@/services/media/HomepageMatchFeedService';
import {getStoredTeams} from '@/services/teams/TeamStore';
import {getHomepageStories} from '@/services/stories/HomepageStoryService';
import {formatStoryDate, getStoryPreview} from '@/services/stories/storyPresentation';

export const dynamic = 'force-dynamic';

type HomeProps = {
  searchParams: Promise<{intro?: string | string[]}>;
};

export default async function Home({searchParams}: HomeProps) {
  const [cookieStore, query] = await Promise.all([cookies(), searchParams]);
  const scheduleService = await createServerScheduleService();
  const storyData = await getHomepageStories();
  const lead = storyData.lead;
  const teamLogos = await getStoredTeams();
  const homeEvents = (await scheduleService.getHomePageEvents()).slice(0, 4);
  const feedPreviews = await getHomepageMatchFeedPreviews(homeEvents.map((match) => match.id));

  return (
    <main className="home-page">
      <SiteHeader />

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

      <section className="shell home-matches-section">
        <div className="home-matches-heading">
          <span className="panel-title">League schedule</span>
          <h2>This month&apos;s matches</h2>
        </div>
        <HomeMatchCarousel count={homeEvents.length}>
          {homeEvents.map((match) => (
            <MatchCard key={match.id} match={match} teams={teamLogos} feedPreview={feedPreviews.get(match.id)} />
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