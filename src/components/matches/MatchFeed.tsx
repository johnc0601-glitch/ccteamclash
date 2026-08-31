import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {
  addMatchFeedComment,
  createMatchFeedPost,
  editMatchFeedComment,
  editMatchFeedPost,
  setMatchFeedCommentReaction,
  setMatchFeedPostReaction,
  softDeleteMatchFeedComment,
  softDeleteMatchFeedPost,
} from '@/app/matches/[id]/feedActions';
import {isMatchFeedOpen} from '@/services/matches/MatchFeedLifecycle';
import styles from './MatchFeed.module.css';

const REACTION_LABELS: Record<string, string> = {like: 'Like', love: 'Love', laugh: 'Laugh', fire: 'Fire'};
const FEED_PAGE_SIZE = 10;

type FeedPost = {
  id: string;
  match_id: string;
  profile_id: string;
  author_name_snapshot: string | null;
  body: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type FeedComment = {
  id: string;
  post_id: string;
  profile_id: string;
  author_name_snapshot: string | null;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type Reaction = {profile_id: string; reaction_type: string; post_id?: string; comment_id?: string};

type MatchFeedProps = {
  matchId: string;
  matchDate: string | null;
  notice?: string;
  error?: string;
  before?: string;
};

type FeedCursor = {
  createdAt: string;
  id: string;
};

export async function MatchFeed({matchId, matchDate, notice, error, before}: MatchFeedProps) {
  const supabase = await createClient();
  const db = supabase as any;
  const cursor = parseFeedCursor(before);
  const [{data: {user}}, postsResult] = await Promise.all([
    supabase.auth.getUser(),
    db.rpc('get_match_feed_post_page', {
      p_match_id: matchId,
      p_before_created_at: cursor?.createdAt ?? null,
      p_before_id: cursor?.id ?? null,
      p_limit: FEED_PAGE_SIZE + 1,
    }),
  ]);

  if (postsResult.error) {
    console.error('Match feed posts are unavailable.', {matchId, error: postsResult.error.message});
  }

  const pageRows = (postsResult.data ?? []) as FeedPost[];
  const hasOlderPosts = pageRows.length > FEED_PAGE_SIZE;
  const posts = pageRows.slice(0, FEED_PAGE_SIZE);
  const lastPost = posts.at(-1);
  const nextCursor = hasOlderPosts && lastPost ? createFeedCursor(lastPost) : null;
  const postIds = posts.map((post) => post.id);
  const [{data: commentsData}, {data: postReactionsData}, profileResult] = await Promise.all([
    postIds.length
      ? db.from('launch_match_feed_comments').select('id,post_id,profile_id,author_name_snapshot,parent_comment_id,body,created_at,edited_at,deleted_at').in('post_id', postIds).order('created_at', {ascending: true})
      : Promise.resolve({data: []}),
    postIds.length
      ? db.from('launch_match_feed_post_reactions').select('post_id,profile_id,reaction_type').in('post_id', postIds)
      : Promise.resolve({data: []}),
    user ? supabase.from('launch_profiles').select('id,role,status').eq('user_id', user.id).maybeSingle() : Promise.resolve({data: null}),
  ]);
  const comments = (commentsData ?? []) as FeedComment[];
  const commentIds = comments.map((comment) => comment.id);
  const {data: commentReactionsData} = commentIds.length
    ? await db.from('launch_match_feed_comment_reactions').select('comment_id,profile_id,reaction_type').in('comment_id', commentIds)
    : {data: []};
  const postReactions = (postReactionsData ?? []) as Reaction[];
  const commentReactions = (commentReactionsData ?? []) as Reaction[];
  const profile = profileResult.data as {id: string; role: string; status: string} | null;
  const commissioner = profile?.role === 'Commissioner' && profile.status === 'Approved';
  const open = isMatchFeedOpen(matchDate);
  const publicUrl = (path: string) => supabase.storage.from('match-feed').getPublicUrl(path).data.publicUrl;

  return (
    <section id="match-feed" className={styles.feed}>
      <header className={styles.feedHeader}>
        <div><span>Match feed</span><h2>Match conversation</h2></div>
        <p>Photos, reactions and match banter stay with this matchup.</p>
      </header>
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {user && profile && open ? (
        <form action={createMatchFeedPost} className={styles.composer}>
          <input type="hidden" name="matchId" value={matchId} />
          <textarea name="body" maxLength={3000} placeholder="What’s happening at this match?" aria-label="New match post" />
          <div className={styles.composerActions}>
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" />
            <button type="submit">Post</button>
          </div>
        </form>
      ) : user && profile ? null : (
        <div className={styles.signIn}><Link href="/account">Sign in</Link> to post, reply or react.</div>
      )}

      {!posts.length ? <div className={styles.empty}>{cursor ? 'No older match posts.' : 'No match posts yet. Start the conversation.'}</div> : null}
      {posts.slice(0, 3).map((post) => (
        <PostCard key={post.id} post={post} comments={comments.filter((comment) => comment.post_id === post.id)} postReactions={postReactions.filter((reaction) => reaction.post_id === post.id)} commentReactions={commentReactions} currentProfileId={profile?.id ?? null} commissioner={Boolean(commissioner)} open={open} matchId={matchId} imageUrl={post.image_path ? publicUrl(post.image_path) : null} />
      ))}
      {posts.length > 3 ? (
        <details className={styles.loadMore}>
          <summary>Show more on this page · {posts.length - 3}</summary>
          <div className={styles.morePosts}>
            {posts.slice(3).map((post) => (
              <PostCard key={post.id} post={post} comments={comments.filter((comment) => comment.post_id === post.id)} postReactions={postReactions.filter((reaction) => reaction.post_id === post.id)} commentReactions={commentReactions} currentProfileId={profile?.id ?? null} commissioner={Boolean(commissioner)} open={open} matchId={matchId} imageUrl={post.image_path ? publicUrl(post.image_path) : null} />
            ))}
          </div>
        </details>
      ) : null}

      {(cursor || nextCursor) ? (
        <nav aria-label="Match feed pages" style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 14}}>
          {cursor ? <Link href={`/matches/${encodeURIComponent(matchId)}#match-feed`}>Latest posts</Link> : <span />}
          {nextCursor ? <Link href={olderFeedHref(matchId, nextCursor)}>Older posts -&gt;</Link> : <span />}
        </nav>
      ) : null}
    </section>
  );
}

function PostCard({post, comments, postReactions, commentReactions, currentProfileId, commissioner, open, matchId, imageUrl}: {
  post: FeedPost;
  comments: FeedComment[];
  postReactions: Reaction[];
  commentReactions: Reaction[];
  currentProfileId: string | null;
  commissioner: boolean;
  open: boolean;
  matchId: string;
  imageUrl: string | null;
}) {
  const roots = comments.filter((comment) => !comment.parent_comment_id);
  const counts = countReactions(postReactions);
  const interactive = open && Boolean(currentProfileId) && !post.deleted_at;
  return (
    <article id={`post-${post.id}`} className={styles.post}>
      <header className={styles.postHeader}>
        <div className={styles.author}>
          <strong>{post.author_name_snapshot || 'Member'}</strong>
          <span>{formatDate(post.created_at)}{post.edited_at ? ' · Edited' : ''}</span>
        </div>
        <div className={styles.postActions}>
          {interactive && currentProfileId === post.profile_id ? (
            <details><summary className={styles.editSummary}>Edit</summary><form action={editMatchFeedPost} className={styles.editForm}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="postId" value={post.id} /><textarea name="body" defaultValue={post.body} maxLength={3000} /><button type="submit">Save edit</button></form></details>
          ) : null}
          {commissioner && !post.deleted_at ? <form action={softDeleteMatchFeedPost}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="postId" value={post.id} /><button type="submit">Remove</button></form> : null}
        </div>
      </header>
      {post.deleted_at ? <div className={styles.removed}>Post removed</div> : <>
        {post.body ? <div className={styles.postBody}>{post.body}</div> : null}
        {imageUrl ? <a href={imageUrl} target="_blank" rel="noreferrer"><img className={styles.photo} src={imageUrl} alt="Match feed upload" loading="lazy" /></a> : null}
      </>}
      <div className={styles.reactionBar}>
        {Object.entries(REACTION_LABELS).map(([key, label]) => (
          interactive ? <form action={setMatchFeedPostReaction} key={key}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="postId" value={post.id} /><input type="hidden" name="reactionType" value={key} /><button type="submit" data-active={postReactions.some((reaction) => reaction.profile_id === currentProfileId && reaction.reaction_type === key)}>{label}{counts[key] ? ` ${counts[key]}` : ''}</button></form> : counts[key] ? <span className={styles.stats} key={key}>{label} {counts[key]}</span> : null
        ))}
        <span className={styles.stats}>{comments.filter((comment) => !comment.deleted_at).length} comments</span>
      </div>
      <div className={styles.commentArea}>
        {roots.map((comment) => <CommentCard key={comment.id} comment={comment} replies={comments.filter((candidate) => candidate.parent_comment_id === comment.id)} reactions={commentReactions} currentProfileId={currentProfileId} commissioner={commissioner} open={open && !post.deleted_at} matchId={matchId} postId={post.id} />)}
        {interactive ? <form action={addMatchFeedComment} className={styles.commentForm}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="postId" value={post.id} /><input name="body" maxLength={1500} placeholder="Add a comment" /><button type="submit">Comment</button></form> : null}
      </div>
    </article>
  );
}

function CommentCard({comment, replies, reactions, currentProfileId, commissioner, open, matchId, postId}: {
  comment: FeedComment;
  replies: FeedComment[];
  reactions: Reaction[];
  currentProfileId: string | null;
  commissioner: boolean;
  open: boolean;
  matchId: string;
  postId: string;
}) {
  return <>
    <CommentBubble comment={comment} reactions={reactions.filter((reaction) => reaction.comment_id === comment.id)} currentProfileId={currentProfileId} commissioner={commissioner} open={open} matchId={matchId} postId={postId} canReply />
    {replies.map((reply) => <div className={styles.reply} key={reply.id}><CommentBubble comment={reply} reactions={reactions.filter((reaction) => reaction.comment_id === reply.id)} currentProfileId={currentProfileId} commissioner={commissioner} open={open} matchId={matchId} postId={postId} canReply={false} /></div>)}
  </>;
}

function CommentBubble({comment, reactions, currentProfileId, commissioner, open, matchId, postId, canReply}: {
  comment: FeedComment;
  reactions: Reaction[];
  currentProfileId: string | null;
  commissioner: boolean;
  open: boolean;
  matchId: string;
  postId: string;
  canReply: boolean;
}) {
  const counts = countReactions(reactions);
  return <div className={styles.comment}>
    <div className={styles.commentTop}><strong>{comment.author_name_snapshot || 'Member'}</strong><span>{formatDate(comment.created_at)}{comment.edited_at ? ' · Edited' : ''}</span></div>
    <p>{comment.deleted_at ? 'Comment removed' : comment.body}</p>
    <div className={styles.commentTools}>
      {!comment.deleted_at && open && currentProfileId ? Object.entries(REACTION_LABELS).map(([key, label]) => <form action={setMatchFeedCommentReaction} key={key}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="postId" value={postId} /><input type="hidden" name="commentId" value={comment.id} /><input type="hidden" name="reactionType" value={key} /><button type="submit" data-active={reactions.some((reaction) => reaction.profile_id === currentProfileId && reaction.reaction_type === key)}>{label}{counts[key] ? ` ${counts[key]}` : ''}</button></form>) : null}
      {!comment.deleted_at && open && currentProfileId === comment.profile_id ? <details><summary>Edit</summary><form action={editMatchFeedComment} className={styles.editForm}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="postId" value={postId} /><input type="hidden" name="commentId" value={comment.id} /><textarea name="body" defaultValue={comment.body} maxLength={1500} /><button type="submit">Save edit</button></form></details> : null}
      {!comment.deleted_at && commissioner ? <form action={softDeleteMatchFeedComment}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="postId" value={postId} /><input type="hidden" name="commentId" value={comment.id} /><button type="submit">Remove</button></form> : null}
      {!comment.deleted_at && canReply && open && currentProfileId ? <details><summary>Reply</summary><form action={addMatchFeedComment} className={styles.replyForm}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="postId" value={postId} /><input type="hidden" name="parentCommentId" value={comment.id} /><input name="body" maxLength={1500} placeholder="Reply" /><button type="submit">Reply</button></form></details> : null}
    </div>
  </div>;
}

function countReactions(reactions: Reaction[]) {
  return reactions.reduce<Record<string, number>>((counts, reaction) => {
    counts[reaction.reaction_type] = (counts[reaction.reaction_type] ?? 0) + 1;
    return counts;
  }, {});
}

function createFeedCursor(post: FeedPost): string {
  return `${post.created_at}|${post.id}`;
}

function parseFeedCursor(value: string | undefined): FeedCursor | null {
  if (!value) return null;
  const separator = value.lastIndexOf('|');
  if (separator <= 0) return null;
  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (Number.isNaN(new Date(createdAt).getTime())) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  return {createdAt: new Date(createdAt).toISOString(), id};
}

function olderFeedHref(matchId: string, cursor: string): string {
  const params = new URLSearchParams({feedBefore: cursor});
  return `/matches/${encodeURIComponent(matchId)}?${params.toString()}#match-feed`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(value));
}
