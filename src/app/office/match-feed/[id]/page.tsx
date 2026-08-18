import Link from 'next/link';
import {notFound} from 'next/navigation';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import styles from '../MatchFeedLab.module.css';
import {
  addMatchFeedComment,
  createMatchFeedPost,
  setMatchFeedCommentReaction,
  setMatchFeedPostReaction,
  softDeleteMatchFeedComment,
  softDeleteMatchFeedPost,
} from './actions';

type PageProps = {
  params: Promise<{id: string}>;
  searchParams: Promise<{notice?: string | string[]; error?: string | string[]}>;
};

type MatchRow = {
  id: string;
  date: string | null;
  time: string | null;
  status: string;
  home_team_id: string | null;
  away_team_id: string | null;
  course_id: string | null;
};

type PostRow = {
  id: string;
  match_id: string;
  profile_id: string;
  body: string;
  image_path: string | null;
  created_at: string;
  last_activity_at: string;
  deleted_at: string | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  profile_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  deleted_at: string | null;
};

type ReactionRow = {profile_id: string; reaction_type: string};

type ProfileRow = {id: string; display_name: string};
type TeamRow = {id: string; name: string};
type CourseRow = {id: string; name: string};

const reactionLabels: Record<string, string> = {
  like: '👍 Like',
  love: '❤️ Love',
  laugh: '😂 Laugh',
  fire: '🔥 Fire',
};

export const dynamic = 'force-dynamic';

export default async function MatchFeedLabMatch({params, searchParams}: PageProps) {
  const {id: matchId} = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const db = supabase as any;

  const {data: {user}} = await supabase.auth.getUser();
  if (!user) notFound();
  const repository = new SupabaseLaunchRepository(supabase);
  const currentProfile = await repository.getProfileByUserId(user.id);
  if (!currentProfile || currentProfile.role !== 'Commissioner' || currentProfile.status !== 'Approved') notFound();

  const [{data: match}, {data: teams}, {data: courses}, {data: posts}] = await Promise.all([
    db.from('launch_schedule_matches').select('id,date,time,status,home_team_id,away_team_id,course_id').eq('id', matchId).maybeSingle(),
    db.from('launch_teams').select('id,name'),
    db.from('launch_courses').select('id,name'),
    db.from('launch_match_feed_posts').select('id,match_id,profile_id,body,image_path,created_at,last_activity_at,deleted_at').eq('match_id', matchId).order('last_activity_at', {ascending: false}),
  ]);

  if (!match) notFound();
  const typedMatch = match as MatchRow;
  const typedPosts = (posts ?? []) as PostRow[];
  const postIds = typedPosts.map((post) => post.id);

  const [{data: comments}, {data: postReactions}] = postIds.length
    ? await Promise.all([
        db.from('launch_match_feed_comments').select('id,post_id,profile_id,parent_comment_id,body,created_at,deleted_at').in('post_id', postIds).order('created_at', {ascending: true}),
        db.from('launch_match_feed_post_reactions').select('post_id,profile_id,reaction_type').in('post_id', postIds),
      ])
    : [{data: []}, {data: []}];

  const typedComments = (comments ?? []) as CommentRow[];
  const commentIds = typedComments.map((comment) => comment.id);
  const {data: commentReactions} = commentIds.length
    ? await db.from('launch_match_feed_comment_reactions').select('comment_id,profile_id,reaction_type').in('comment_id', commentIds)
    : {data: []};

  const profileIds = Array.from(new Set([
    ...typedPosts.map((post) => post.profile_id),
    ...typedComments.map((comment) => comment.profile_id),
    currentProfile.id,
  ]));
  const {data: profiles} = profileIds.length
    ? await db.from('launch_profiles').select('id,display_name').in('id', profileIds)
    : {data: []};

  const profileNames = new Map<string, string>(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.display_name]));
  const teamNames = new Map<string, string>(((teams ?? []) as TeamRow[]).map((team) => [team.id, team.name]));
  const courseNames = new Map<string, string>(((courses ?? []) as CourseRow[]).map((course) => [course.id, course.name]));
  const away = typedMatch.away_team_id ? teamNames.get(typedMatch.away_team_id) ?? typedMatch.away_team_id : 'TBD';
  const home = typedMatch.home_team_id ? teamNames.get(typedMatch.home_team_id) ?? typedMatch.home_team_id : 'TBD';

  const signedUrls = new Map<string, string>();
  await Promise.all(typedPosts.filter((post) => post.image_path && !post.deleted_at).map(async (post) => {
    const {data} = await supabase.storage.from('match-feed').createSignedUrl(post.image_path!, 60 * 60);
    if (data?.signedUrl) signedUrls.set(post.id, data.signedUrl);
  }));

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className={styles.meta}>Commissioner-only · Match Feed Lab</span>
        <h1>{away} @ {home}</h1>
        <p>{typedMatch.date ?? 'Date TBD'} {typedMatch.time ? `· ${typedMatch.time.slice(0, 5)}` : ''} · {typedMatch.course_id ? courseNames.get(typedMatch.course_id) ?? typedMatch.course_id : 'Course TBD'}</p>
        <div><Link href="/office/match-feed">← Choose another match</Link></div>
      </header>

      {readParam(query.notice) ? <div className={styles.notice}>{readParam(query.notice)}</div> : null}
      {readParam(query.error) ? <div className={styles.error}>{readParam(query.error)}</div> : null}

      <div className={styles.labGrid}>
        <div className={styles.mainColumn}>
          <form action={createMatchFeedPost} className={`${styles.card} ${styles.composer}`} encType="multipart/form-data">
            <input type="hidden" name="matchId" value={matchId} />
            <strong>Post to Matchday</strong>
            <textarea className={styles.textarea} name="body" placeholder="Share a match moment, update, or quick comment…" maxLength={2000} />
            <div className={styles.composerRow}>
              <label className={styles.meta}>Photo <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /></label>
              <button className={styles.button} type="submit">Post</button>
            </div>
          </form>

          <div className={styles.feed}>
            {typedPosts.map((post) => {
              const postComments = typedComments.filter((comment) => comment.post_id === post.id);
              const topComments = postComments.filter((comment) => !comment.parent_comment_id);
              const reactions = (postReactions ?? []).filter((reaction: any) => reaction.post_id === post.id) as ReactionRow[];
              const myReaction = reactions.find((reaction) => reaction.profile_id === currentProfile.id)?.reaction_type;
              return (
                <article key={post.id} id={`post-${post.id}`} className={styles.card}>
                  <div className={styles.postHeader}>
                    <div>
                      <strong>{profileNames.get(post.profile_id) ?? 'Commissioner'}</strong>
                      <div className={styles.meta}>{formatTime(post.created_at)}</div>
                    </div>
                    {!post.deleted_at ? (
                      <form action={softDeleteMatchFeedPost}>
                        <input type="hidden" name="matchId" value={matchId} />
                        <input type="hidden" name="postId" value={post.id} />
                        <button className={styles.linkButton} type="submit">Moderate</button>
                      </form>
                    ) : null}
                  </div>

                  {post.deleted_at ? <p className={styles.deleted}>This post was removed by a commissioner.</p> : (
                    <>
                      {post.body ? <p className={styles.postBody}>{post.body}</p> : null}
                      {signedUrls.get(post.id) ? <img className={styles.photo} src={signedUrls.get(post.id)} alt="Match feed upload" /> : null}
                    </>
                  )}

                  {!post.deleted_at ? (
                    <>
                      <div className={styles.reactionRow}>
                        {Object.entries(reactionLabels).map(([type, label]) => (
                          <form key={type} action={setMatchFeedPostReaction}>
                            <input type="hidden" name="matchId" value={matchId} />
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="reactionType" value={type} />
                            <button className={styles.reactionButton} data-active={myReaction === type} type="submit">{label} {reactions.filter((reaction) => reaction.reaction_type === type).length || ''}</button>
                          </form>
                        ))}
                      </div>

                      <div className={styles.comments}>
                        {topComments.map((comment) => (
                          <CommentThread
                            key={comment.id}
                            comment={comment}
                            replies={postComments.filter((reply) => reply.parent_comment_id === comment.id)}
                            reactions={(commentReactions ?? []) as any[]}
                            matchId={matchId}
                            postId={post.id}
                            currentProfileId={currentProfile.id}
                            profileNames={profileNames}
                          />
                        ))}
                        <form action={addMatchFeedComment} className={styles.actionRow}>
                          <input type="hidden" name="matchId" value={matchId} />
                          <input type="hidden" name="postId" value={post.id} />
                          <input className={styles.input} name="body" placeholder="Write a comment…" maxLength={1200} required />
                          <button className={styles.button} type="submit">Comment</button>
                        </form>
                      </div>
                    </>
                  ) : null}
                </article>
              );
            })}
            {!typedPosts.length ? <div className={styles.empty}>No posts yet. Use this match to start testing the feed.</div> : null}
          </div>
        </div>

        <aside className={styles.sideColumn}>
          <div className={styles.card}>
            <h2 className={styles.sideCardTitle}>Prototype rules</h2>
            <ul className={styles.sideList}>
              <li>Commissioners only for now</li>
              <li>One photo per post</li>
              <li>Four lightweight reactions</li>
              <li>Replies limited to one visual level</li>
              <li>Soft-delete moderation</li>
              <li>Every post has a stable #post anchor</li>
            </ul>
          </div>
          <div className={styles.card}>
            <h2 className={styles.sideCardTitle}>Future public rollout</h2>
            <p className={styles.meta}>The tables are match-first and already track last activity, so the homepage can later surface newly active match conversations and deep-link directly to the post.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function CommentThread({comment, replies, reactions, matchId, postId, currentProfileId, profileNames}: {
  comment: CommentRow;
  replies: CommentRow[];
  reactions: Array<{comment_id: string; profile_id: string; reaction_type: string}>;
  matchId: string;
  postId: string;
  currentProfileId: string;
  profileNames: Map<string, string>;
}) {
  return (
    <div className={styles.comments}>
      <Comment comment={comment} reactions={reactions} matchId={matchId} postId={postId} currentProfileId={currentProfileId} profileNames={profileNames} canReply />
      {replies.map((reply) => (
        <div key={reply.id} className={styles.reply}>
          <Comment comment={reply} reactions={reactions} matchId={matchId} postId={postId} currentProfileId={currentProfileId} profileNames={profileNames} canReply={false} />
        </div>
      ))}
    </div>
  );
}

function Comment({comment, reactions, matchId, postId, currentProfileId, profileNames, canReply}: {
  comment: CommentRow;
  reactions: Array<{comment_id: string; profile_id: string; reaction_type: string}>;
  matchId: string;
  postId: string;
  currentProfileId: string;
  profileNames: Map<string, string>;
  canReply: boolean;
}) {
  const commentReactions = reactions.filter((reaction) => reaction.comment_id === comment.id);
  const myReaction = commentReactions.find((reaction) => reaction.profile_id === currentProfileId)?.reaction_type;
  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        <span><strong>{profileNames.get(comment.profile_id) ?? 'Commissioner'}</strong> <span className={styles.meta}>· {formatTime(comment.created_at)}</span></span>
        {!comment.deleted_at ? (
          <form action={softDeleteMatchFeedComment}>
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="commentId" value={comment.id} />
            <button className={styles.linkButton} type="submit">Remove</button>
          </form>
        ) : null}
      </div>
      {comment.deleted_at ? <p className={styles.deleted}>Comment removed.</p> : <p className={styles.postBody}>{comment.body}</p>}
      {!comment.deleted_at ? (
        <div className={styles.reactionRow}>
          {Object.entries(reactionLabels).map(([type, label]) => (
            <form key={type} action={setMatchFeedCommentReaction}>
              <input type="hidden" name="matchId" value={matchId} />
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="reactionType" value={type} />
              <button className={styles.reactionButton} data-active={myReaction === type} type="submit">{label} {commentReactions.filter((reaction) => reaction.reaction_type === type).length || ''}</button>
            </form>
          ))}
          {canReply ? (
            <details className={styles.details}>
              <summary>Reply</summary>
              <form action={addMatchFeedComment} className={styles.actionRow}>
                <input type="hidden" name="matchId" value={matchId} />
                <input type="hidden" name="postId" value={postId} />
                <input type="hidden" name="parentCommentId" value={comment.id} />
                <input className={styles.input} name="body" placeholder="Write a reply…" maxLength={1200} required />
                <button className={styles.button} type="submit">Reply</button>
              </form>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(value));
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
