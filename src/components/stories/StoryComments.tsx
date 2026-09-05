import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {
  addStoryComment,
  editStoryComment,
  removeStoryComment,
  reportStoryComment,
  setStoryCommentReaction,
} from '@/app/stories/[slug]/commentActions';
import styles from './StoryComments.module.css';

const REACTION_LABELS = {
  like: {label: 'Like', icon: '👍'},
  love: {label: 'Love', icon: '❤️'},
  laugh: {label: 'Laugh', icon: '😂'},
  fire: {label: 'Fire', icon: '🔥'},
} as const;

type StoryComment = {
  id: string;
  story_id: string;
  profile_id: string;
  author_name_snapshot: string | null;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type Reaction = {
  comment_id: string;
  profile_id: string;
  reaction_type: string;
};

type StoryCommentsProps = {
  storyId: string;
  storySlug: string;
  notice?: string;
  error?: string;
};

export async function StoryComments({storyId, storySlug, notice, error}: StoryCommentsProps) {
  const supabase = await createClient();
  const db = supabase as any;
  const [{data: {user}}, commentsResult] = await Promise.all([
    supabase.auth.getUser(),
    db
      .from('launch_story_comments')
      .select('id,story_id,profile_id,author_name_snapshot,parent_comment_id,body,created_at,edited_at,deleted_at')
      .eq('story_id', storyId)
      .order('created_at', {ascending: true})
      .limit(250),
  ]);

  const comments = (commentsResult.data ?? []) as StoryComment[];
  const commentIds = comments.filter((comment) => !comment.deleted_at).map((comment) => comment.id);
  const [{data: reactionsData}, profileResult] = await Promise.all([
    commentIds.length
      ? db.from('launch_story_comment_reactions').select('comment_id,profile_id,reaction_type').in('comment_id', commentIds)
      : Promise.resolve({data: []}),
    user
      ? supabase.from('launch_profiles').select('id,role,status').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({data: null}),
  ]);

  const reactions = (reactionsData ?? []) as Reaction[];
  const profile = profileResult.data as {id: string; role: string; status: string} | null;
  const commissioner = profile?.role === 'Commissioner' && profile.status === 'Approved';
  const roots = comments.filter((comment) => !comment.parent_comment_id);
  const visibleCount = comments.filter((comment) => !comment.deleted_at).length;

  return (
    <section id="story-conversation" className={styles.conversation}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Conversation</span>
          <h2>Join the conversation</h2>
        </div>
        <span className={styles.count}>{visibleCount} {visibleCount === 1 ? 'comment' : 'comments'}</span>
      </header>

      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {error || commentsResult.error ? <p className={styles.error}>{error || 'Comments are unavailable right now.'}</p> : null}

      {profile ? (
        <form action={addStoryComment} className={styles.composer}>
          <input type="hidden" name="storyId" value={storyId} />
          <input type="hidden" name="storySlug" value={storySlug} />
          <textarea name="body" maxLength={1500} rows={3} placeholder="Add to the conversation" aria-label="Add a comment" required />
          <div className={styles.composerFooter}>
            <span>Comments are visible to everyone.</span>
            <button type="submit">Comment</button>
          </div>
        </form>
      ) : (
        <div className={styles.signIn}>
          <Link href="/account">Sign in</Link> to comment, reply or react.
        </div>
      )}

      {!roots.length ? <div className={styles.empty}>No comments yet. Start the conversation.</div> : null}

      <div className={styles.thread}>
        {roots.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            replies={comments.filter((candidate) => candidate.parent_comment_id === comment.id)}
            reactions={reactions}
            currentProfileId={profile?.id ?? null}
            commissioner={Boolean(commissioner)}
            storyId={storyId}
            storySlug={storySlug}
          />
        ))}
      </div>
    </section>
  );
}

function CommentCard({comment, replies, reactions, currentProfileId, commissioner, storyId, storySlug}: {
  comment: StoryComment;
  replies: StoryComment[];
  reactions: Reaction[];
  currentProfileId: string | null;
  commissioner: boolean;
  storyId: string;
  storySlug: string;
}) {
  return (
    <article className={styles.threadItem}>
      <CommentBubble
        comment={comment}
        reactions={reactions.filter((reaction) => reaction.comment_id === comment.id)}
        currentProfileId={currentProfileId}
        commissioner={commissioner}
        storyId={storyId}
        storySlug={storySlug}
        canReply
      />
      {replies.length ? (
        <div className={styles.replies}>
          {replies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              reactions={reactions.filter((reaction) => reaction.comment_id === reply.id)}
              currentProfileId={currentProfileId}
              commissioner={commissioner}
              storyId={storyId}
              storySlug={storySlug}
              canReply={false}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CommentBubble({comment, reactions, currentProfileId, commissioner, storyId, storySlug, canReply}: {
  comment: StoryComment;
  reactions: Reaction[];
  currentProfileId: string | null;
  commissioner: boolean;
  storyId: string;
  storySlug: string;
  canReply: boolean;
}) {
  const removed = Boolean(comment.deleted_at);
  const owner = currentProfileId === comment.profile_id;
  const selectedReaction = reactions.find((reaction) => reaction.profile_id === currentProfileId)?.reaction_type ?? null;
  const counts = countReactions(reactions);

  return (
    <div id={`story-comment-${comment.id}`} className={styles.comment}>
      <div className={styles.commentTop}>
        <div>
          <strong>{comment.author_name_snapshot || 'Member'}</strong>
          <span>{formatDate(comment.created_at)}{comment.edited_at ? ' · Edited' : ''}</span>
        </div>
        {removed ? <span className={styles.removedLabel}>Removed</span> : null}
      </div>

      <p className={removed ? styles.removedBody : undefined}>{removed ? 'Comment removed' : comment.body}</p>

      {!removed ? (
        <div className={styles.tools}>
          {currentProfileId ? (
            <div className={styles.reactions} aria-label="Reactions">
              {Object.entries(REACTION_LABELS).map(([key, reaction]) => (
                <form action={setStoryCommentReaction} key={key}>
                  <input type="hidden" name="storyId" value={storyId} />
                  <input type="hidden" name="storySlug" value={storySlug} />
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="reactionType" value={key} />
                  <button type="submit" data-active={selectedReaction === key} title={reaction.label} aria-label={reaction.label}>
                    <span>{reaction.icon}</span>
                    {counts[key as keyof typeof counts] ? <small>{counts[key as keyof typeof counts]}</small> : null}
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <ReactionSummary counts={counts} />
          )}

          {owner ? (
            <details>
              <summary>Edit</summary>
              <form action={editStoryComment} className={styles.editForm}>
                <input type="hidden" name="storyId" value={storyId} />
                <input type="hidden" name="storySlug" value={storySlug} />
                <input type="hidden" name="commentId" value={comment.id} />
                <textarea name="body" defaultValue={comment.body} maxLength={1500} rows={3} required />
                <button type="submit">Save edit</button>
              </form>
            </details>
          ) : null}

          {currentProfileId && !owner ? (
            <details>
              <summary>Report</summary>
              <form action={reportStoryComment} className={styles.reportForm}>
                <input type="hidden" name="storyId" value={storyId} />
                <input type="hidden" name="storySlug" value={storySlug} />
                <input type="hidden" name="commentId" value={comment.id} />
                <select name="reason" defaultValue="Inappropriate" aria-label="Report reason">
                  <option>Spam</option>
                  <option>Harassment</option>
                  <option>Inappropriate</option>
                  <option>Other</option>
                </select>
                <input name="note" maxLength={500} placeholder="Optional note" />
                <button type="submit">Submit report</button>
              </form>
            </details>
          ) : null}

          {canReply && currentProfileId ? (
            <details>
              <summary>Reply</summary>
              <form action={addStoryComment} className={styles.replyForm}>
                <input type="hidden" name="storyId" value={storyId} />
                <input type="hidden" name="storySlug" value={storySlug} />
                <input type="hidden" name="parentCommentId" value={comment.id} />
                <input name="body" maxLength={1500} placeholder="Write a reply" required />
                <button type="submit">Reply</button>
              </form>
            </details>
          ) : null}

          {commissioner ? (
            <form action={removeStoryComment}>
              <input type="hidden" name="storyId" value={storyId} />
              <input type="hidden" name="storySlug" value={storySlug} />
              <input type="hidden" name="commentId" value={comment.id} />
              <button type="submit" className={styles.removeButton}>Remove</button>
            </form>
          ) : null}
        </div>
      ) : (
        <ReactionSummary counts={counts} />
      )}
    </div>
  );
}

function ReactionSummary({counts}: {counts: Record<keyof typeof REACTION_LABELS, number>}) {
  const entries = Object.entries(REACTION_LABELS).filter(([key]) => counts[key as keyof typeof counts] > 0);
  if (!entries.length) return null;
  return (
    <span className={styles.reactionSummary}>
      {entries.map(([key, reaction]) => `${reaction.icon} ${counts[key as keyof typeof counts]}`).join('  ')}
    </span>
  );
}

function countReactions(reactions: Reaction[]): Record<keyof typeof REACTION_LABELS, number> {
  const counts = {like: 0, love: 0, laugh: 0, fire: 0};
  reactions.forEach((reaction) => {
    if (reaction.reaction_type in counts) counts[reaction.reaction_type as keyof typeof counts] += 1;
  });
  return counts;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
