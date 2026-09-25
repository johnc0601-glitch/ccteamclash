import Link from 'next/link';
import type {ReactNode} from 'react';
import {ClashCountdown} from '@/components/ClashCountdown';
import {ClashPulse} from '@/components/ClashPulse';
import {HomeMatchCarousel} from '@/components/HomeMatchCarousel';
import {Intro} from '@/components/intro/Intro';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchCard} from '@/components/MatchCard';
import {PwaHomeDashboard} from '@/components/PwaHomeDashboard';
import {getHomepageData} from '@/services/home/HomepageDataService';
import {createPublicStandingsService} from '@/core/createPublicStandingsService';
import {getHomepageClashPulseItems} from '@/services/home/ClashPulseService';
import {formatStoryDate, getStoryPreview} from '@/services/stories/storyPresentation';

export const revalidate = 21_600;

export default async function Home() {
  const [homepageData, clashPulseItems, standingsData] = await Promise.all([
    getHomepageData(),
    getHomepageClashPulseItems(),
    createPublicStandingsService().getActiveSeasonStandings(),
  ]);
  const {storyData, teams: teamLogos, homeEvents, feedPreviews} = homepageData;
  const lead = storyData.lead;

  const pwaMatches = homeEvents.map((match) => ({
    id: match.id,
    href: match.href,
    date: match.date,
    time: match.time,
    course: match.course,
    home: match.home,
    away: match.away,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  }));
  const pwaTeams = teamLogos.map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
  }));
  const pwaStandings = (standingsData?.entries ?? []).map((entry) => ({
    rank: entry.rank,
    teamId: entry.team.id,
    shortName: entry.team.shortName,
    wins: entry.wins,
    losses: entry.losses,
    gamesPlayed: entry.gamesPlayed,
  }));
  const pwaStory = lead ? {
    slug: lead.slug,
    title: lead.title,
    preview: getStoryPreview(lead),
  } : null;

  return (
    <main className="home-page">
      <SiteHeader />
      <PwaHomeDashboard
        matches={pwaMatches}
        teams={pwaTeams}
        standings={pwaStandings}
        story={pwaStory}
        pulse={clashPulseItems}
      />
      <div className="browser-home-content">
      <ClashCountdown />

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
      <Intro />
      <ClashPulse items={clashPulseItems} />
      </div>
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
