'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

const REACTIONS = new Set(['like', 'love', 'laugh', 'fire']);
const REPORT_REASONS = new Set(['Spam', 'Harassment', 'Inappropriate', 'Other']);
const RATE_WINDOW_MS = 5 * 60 * 1000;
const COMMENT_RATE_LIMIT = 30;

export async function addStoryComment(formData: FormData) {
  const storyId = read(formData, 'storyId');
  const storySlug = read(formData, 'storySlug');
  const parentCommentId = read(formData, 'parentCommentId') || null;
  const body = read(formData, 'body').slice(0, 1500);
  if (!storyId || !storySlug) return;
  if (!body) redirect(storyUrl(storySlug, 'storyError', 'Add a comment first.'));

  const account = await requireStoryAccount(storyId, storySlug);
  await requireCommentRateLimit(account.supabase, account.profile.id, storySlug);
  const db = account.supabase as any;

  if (parentCommentId) {
    const {data: parent} = await db
      .from('launch_story_comments')
      .select('id,parent_comment_id,deleted_at')
      .eq('id', parentCommentId)
      .eq('story_id', storyId)
      .maybeSingle();

    if (!parent || parent.parent_comment_id || parent.deleted_at) {
      redirect(storyUrl(storySlug, 'storyError', 'That comment cannot be replied to.'));
    }
  }

  const {error} = await db.from('launch_story_comments').insert({
    story_id: storyId,
    profile_id: account.profile.id,
    author_name_snapshot: account.profile.display_name || 'Member',
    parent_comment_id: parentCommentId,
    body,
  });

  if (error) {
    console.error('Story comment could not be saved.', {storyId, profileId: account.profile.id, error: error.message});
    redirect(storyUrl(storySlug, 'storyError', 'Comment could not be saved.'));
  }

  refreshStory(storySlug);
  redirect(storyUrl(storySlug, 'storyNotice', parentCommentId ? 'Reply posted.' : 'Comment posted.'));
}

export async function editStoryComment(formData: FormData) {
  const storyId = read(formData, 'storyId');
  const storySlug = read(formData, 'storySlug');
  const commentId = read(formData, 'commentId');
  const body = read(formData, 'body').slice(0, 1500);
  if (!storyId || !storySlug || !commentId) return;
  if (!body) redirect(storyUrl(storySlug, 'storyError', 'A comment cannot be empty.'));

  const account = await requireStoryAccount(storyId, storySlug);
  const db = account.supabase as any;
  const {data: comment} = await db
    .from('launch_story_comments')
    .select('profile_id,deleted_at')
    .eq('id', commentId)
    .eq('story_id', storyId)
    .maybeSingle();

  if (!comment || comment.profile_id !== account.profile.id || comment.deleted_at) {
    redirect(storyUrl(storySlug, 'storyError', 'That comment cannot be edited.'));
  }

  const now = new Date().toISOString();
  const {error} = await db
    .from('launch_story_comments')
    .update({body, edited_at: now, updated_at: now})
    .eq('id', commentId)
    .eq('story_id', storyId);

  if (error) redirect(storyUrl(storySlug, 'storyError', 'Comment could not be edited.'));

  refreshStory(storySlug);
  redirect(storyCommentUrl(storySlug, commentId));
}

export async function setStoryCommentReaction(formData: FormData) {
  const storyId = read(formData, 'storyId');
  const storySlug = read(formData, 'storySlug');
  const commentId = read(formData, 'commentId');
  const reactionType = read(formData, 'reactionType');
  if (!storyId || !storySlug || !commentId || !REACTIONS.has(reactionType)) return;

  const account = await requireStoryAccount(storyId, storySlug);
  const db = account.supabase as any;
  const {data: comment} = await db
    .from('launch_story_comments')
    .select('id,deleted_at')
    .eq('id', commentId)
    .eq('story_id', storyId)
    .maybeSingle();

  if (!comment || comment.deleted_at) {
    redirect(storyUrl(storySlug, 'storyError', 'That comment is no longer available.'));
  }

  const {data: existing, error: readError} = await db
    .from('launch_story_comment_reactions')
    .select('reaction_type')
    .eq('comment_id', commentId)
    .eq('profile_id', account.profile.id)
    .maybeSingle();

  if (readError) redirect(storyUrl(storySlug, 'storyError', 'Reaction could not be updated.'));

  const mutation = existing?.reaction_type === reactionType
    ? db.from('launch_story_comment_reactions').delete().eq('comment_id', commentId).eq('profile_id', account.profile.id)
    : db.from('launch_story_comment_reactions').upsert({
      comment_id: commentId,
      profile_id: account.profile.id,
      reaction_type: reactionType,
    });

  const {error} = await mutation;
  if (error) redirect(storyUrl(storySlug, 'storyError', 'Reaction could not be updated.'));

  refreshStory(storySlug);
  redirect(storyCommentUrl(storySlug, commentId));
}

export async function reportStoryComment(formData: FormData) {
  const storyId = read(formData, 'storyId');
  const storySlug = read(formData, 'storySlug');
  const commentId = read(formData, 'commentId');
  const reasonInput = read(formData, 'reason');
  const note = read(formData, 'note').slice(0, 500);
  if (!storyId || !storySlug || !commentId) return;
  const reason = REPORT_REASONS.has(reasonInput) ? reasonInput : 'Other';

  const account = await requireStoryAccount(storyId, storySlug);
  const db = account.supabase as any;
  const {data: comment} = await db
    .from('launch_story_comments')
    .select('profile_id,deleted_at')
    .eq('id', commentId)
    .eq('story_id', storyId)
    .maybeSingle();

  if (!comment || comment.deleted_at) {
    redirect(storyUrl(storySlug, 'storyError', 'That comment is no longer available to report.'));
  }
  if (comment.profile_id === account.profile.id) {
    redirect(storyUrl(storySlug, 'storyError', 'You cannot report your own comment.'));
  }

  const {error} = await db.from('launch_story_comment_reports').insert({
    story_id: storyId,
    comment_id: commentId,
    reporter_profile_id: account.profile.id,
    reason,
    note,
  });

  if (error) {
    if (error.code === '23505') {
      redirect(storyUrl(storySlug, 'storyNotice', 'You already reported that comment.'));
    }
    console.error('Story comment report could not be saved.', {storyId, commentId, error: error.message});
    redirect(storyUrl(storySlug, 'storyError', 'Report could not be submitted.'));
  }

  revalidatePath('/office/media/moderation');
  redirect(storyUrl(storySlug, 'storyNotice', 'Report submitted. A commissioner can review it.'));
}

export async function removeStoryComment(formData: FormData) {
  const storyId = read(formData, 'storyId');
  const storySlug = read(formData, 'storySlug');
  const commentId = read(formData, 'commentId');
  if (!storyId || !storySlug || !commentId) return;

  const account = await requireStoryAccount(storyId, storySlug);
  if (account.profile.role !== 'Commissioner' || account.profile.status !== 'Approved') {
    redirect(storyUrl(storySlug, 'storyError', 'Commissioner access is required.'));
  }

  const db = account.supabase as any;
  const {error} = await db
    .from('launch_story_comments')
    .update({deleted_at: new Date().toISOString(), deleted_by: account.profile.id})
    .eq('id', commentId)
    .eq('story_id', storyId)
    .is('deleted_at', null);

  if (error) redirect(storyUrl(storySlug, 'storyError', 'Comment could not be removed.'));

  refreshStory(storySlug);
  revalidatePath('/office/media/moderation');
  redirect(storyCommentUrl(storySlug, commentId));
}

async function requireStoryAccount(storyId: string, storySlug: string) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect(`/account?error=${encodeURIComponent('Sign in to join the story conversation.')}`);

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,display_name,role,status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect(`/account?error=${encodeURIComponent('Your account profile is not ready yet.')}`);

  const db = supabase as any;
  const {data: story} = await db
    .from('launch_stories')
    .select('id,slug,status')
    .eq('id', storyId)
    .eq('slug', storySlug)
    .eq('status', 'published')
    .maybeSingle();
  if (!story) redirect(storyUrl(storySlug, 'storyError', 'Story discussion is unavailable.'));

  return {supabase, user, profile};
}

async function requireCommentRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  storySlug: string,
) {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const {count, error} = await (supabase as any)
    .from('launch_story_comments')
    .select('id', {count: 'exact', head: true})
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .gte('created_at', since);

  if (error) {
    console.error('Story comment rate-limit check failed open.', {profileId, error: error.message});
    return;
  }
  if ((count ?? 0) >= COMMENT_RATE_LIMIT) {
    redirect(storyUrl(storySlug, 'storyError', 'You are commenting too quickly. Try again in a few minutes.'));
  }
}

function refreshStory(storySlug: string) {
  revalidatePath(`/stories/${storySlug}`);
}

function storyCommentUrl(storySlug: string, commentId: string) {
  return `/stories/${encodeURIComponent(storySlug)}#story-comment-${commentId}`;
}

function storyUrl(storySlug: string, key: 'storyNotice' | 'storyError', message: string) {
  return `/stories/${encodeURIComponent(storySlug)}?${key}=${encodeURIComponent(message)}#story-conversation`;
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
