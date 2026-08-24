import Link from 'next/link';
import {cookies} from 'next/headers';
import type {ReactNode} from 'react';
import {HomeCommentFeed, type HomeCommentFeedItem} from '@/components/HomeCommentFeed';
import {Intro} from '@/components/intro/Intro';
import {INTRO_COOKIE_NAME} from '@/components/intro/intro.config';
import {parseIntroQuery} from '@/components/intro/introDecision';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchCard, type MatchFeedPreview} from '@/components/MatchCard';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import type {PublicScheduleEvent} from '@/domain/schedule/ScheduleService';
import {createClient} from '@/lib/supabase/server';
import {getStoredTeams} from '@/services/teams/TeamStore';
import {getStories} from '@/services/stories/StoryService';

export const dynamic = 'force-dynamic';

type HomeProps = {
  searchParams: Promise<{intro?: string | string[]}>;
};

export default async function Home({searchParams}: HomeProps) {
  const [cookieStore, query] = await Promise.all([cookies(), searchParams]);
  const scheduleService = await createServerScheduleService();
  const stories = await getStories();
  const lead = stories.find((story) => story.featured) ?? stories[0];
  const teamLogos = await getStoredTeams();
  const [homeEvents, publishedEvents] = await Promise.all([
    scheduleService.getHomePageEvents(),
    scheduleService.getPublishedEvents(),
  ]);
  const visibleHomeEvents = homeEvents.slice(0, 4);
  const [feedPreviews, commentFeed] = await Promise.all([
    getMatchFeedPreviews(visibleHomeEvents.map((match) => match.id)),
    getHomeCommentFeed(publishedEvents),
  ]);

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

      <section className="shell home-matches-section">
        <div className="home-matches-heading">
          <span className="panel-title">League schedule</span>
          <h2>This month&apos;s matches</h2>
        </div>
        <div className="home-match-grid">
          {visibleHomeEvents.map((match) => (
            <MatchCard key={match.id} match={match} teams={teamLogos} feedPreview={feedPreviews.get(match.id)} />
          ))}
        </div>
      </section>

      <HomeCommentFeed items={commentFeed} />

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

async function getMatchFeedPreviews(matchIds: string[]): Promise<Map<string, MatchFeedPreview>> {
  const previews = new Map<string, MatchFeedPreview>();
  if (!matchIds.length) return previews;
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const {data: posts, error} = await db.from('launch_match_feed_posts')
      .select('id,match_id,author_name_snapshot,body,image_path,last_activity_at,deleted_at')
      .in('match_id', matchIds)
      .is('deleted_at', null)
      .order('last_activity_at', {ascending: false})
      .limit(40);
    if (error || !posts?.length) return previews;

    const latestByMatch = new Map<string, any>();
    for (const post of posts) if (!latestByMatch.has(post.match_id)) latestByMatch.set(post.match_id, post);
    const postIds = [...latestByMatch.values()].map((post) => post.id);
    const [{data: comments}, {data: reactions}] = await Promise.all([
      db.from('launch_match_feed_comments').select('post_id,id,deleted_at').in('post_id', postIds),
      db.from('launch_match_feed_post_reactions').select('post_id,profile_id').in('post_id', postIds),
    ]);

    for (const [matchId, post] of latestByMatch) {
      const commentCount = (comments ?? []).filter((comment: {post_id: string; deleted_at: string | null}) => comment.post_id === post.id && !comment.deleted_at).length;
      const reactionCount = (reactions ?? []).filter((reaction: {post_id: string}) => reaction.post_id === post.id).length;
      const imageUrl = post.image_path ? supabase.storage.from('match-feed').getPublicUrl(post.image_path).data.publicUrl : null;
      previews.set(matchId, {
        author: post.author_name_snapshot || 'Member',
        excerpt: String(post.body ?? '').trim().slice(0, 140),
        imageUrl,
        commentCount,
        reactionCount,
      });
    }
  } catch {
    return previews;
  }
  return previews;
}

async function getHomeCommentFeed(events: PublicScheduleEvent[]): Promise<HomeCommentFeedItem[]> {
  if (!events.length) return [];
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const eventById = new Map(events.map((event) => [event.id, event]));
    const matchIds = [...eventById.keys()];

    const {data: posts, error: postsError} = await db.from('launch_match_feed_posts')
      .select('id,match_id,deleted_at')
      .in('match_id', matchIds)
      .is('deleted_at', null)
      .limit(250);
    if (postsError || !posts?.length) return [];

    const postToMatch = new Map<string, string>(posts.map((post: {id: string; match_id: string}) => [post.id, post.match_id]));
    const {data: comments, error: commentsError} = await db.from('launch_match_feed_comments')
      .select('id,post_id,author_name_snapshot,body,created_at,deleted_at')
      .in('post_id', [...postToMatch.keys()])
      .is('deleted_at', null)
      .order('created_at', {ascending: false})
      .limit(6);
    if (commentsError || !comments?.length) return [];

    return comments.flatMap((comment: {
      id: string;
      post_id: string;
      author_name_snapshot: string | null;
      body: string;
      created_at: string;
    }) => {
      const matchId = postToMatch.get(comment.post_id);
      const event = matchId ? eventById.get(matchId) : undefined;
      if (!event) return [];
      const body = String(comment.body ?? '').trim();
      if (!body) return [];
      return [{
        id: comment.id,
        author: comment.author_name_snapshot || 'Member',
        body: body.length > 180 ? `${body.slice(0, 177)}...` : body,
        createdAt: comment.created_at,
        matchLabel: `${event.away} at ${event.home}`,
        matchHref: event.href,
      }];
    });
  } catch {
    return [];
  }
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
