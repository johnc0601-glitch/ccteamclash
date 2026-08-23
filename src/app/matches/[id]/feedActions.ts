'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {isMatchFeedOpen, matchFeedClosedMessage} from '@/services/matches/MatchFeedLifecycle';

const REACTIONS = new Set(['like', 'love', 'laugh', 'fire']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function createMatchFeedPost(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const body = read(formData, 'body').slice(0, 3000);
  if (!matchId) return;
  const account = await requireAccount(matchId);
  await requireFeedOpen(account.supabase, matchId);
  const photo = formData.get('photo');
  let imagePath: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    if (!IMAGE_TYPES.has(photo.type) || photo.size > MAX_IMAGE_BYTES) {
      redirect(feedUrl(matchId, 'feedError', 'Photo must be JPG, PNG, WebP, HEIC, or HEIF and 8 MB or smaller.'));
    }
    const extension = photo.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    imagePath = `${matchId}/${crypto.randomUUID()}.${extension}`;
    const {error} = await account.supabase.storage.from('match-feed').upload(imagePath, photo, {contentType: photo.type, upsert: false});
    if (error) redirect(feedUrl(matchId, 'feedError', 'Photo upload failed.'));
  }

  if (!body && !imagePath) redirect(feedUrl(matchId, 'feedError', 'Add a message or photo first.'));
  const db = account.supabase as any;
  const {error} = await db.from('launch_match_feed_posts').insert({
    match_id: matchId,
    profile_id: account.profile.id,
    author_name_snapshot: account.profile.display_name || 'Member',
    body,
    image_path: imagePath,
  });
  if (error) {
    if (imagePath) await account.supabase.storage.from('match-feed').remove([imagePath]);
    redirect(feedUrl(matchId, 'feedError', 'Post could not be saved.'));
  }
  refresh(matchId);
  redirect(feedUrl(matchId, 'feedNotice', 'Posted.'));
}

export async function editMatchFeedPost(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const body = read(formData, 'body').slice(0, 3000);
  if (!matchId || !postId) return;
  const account = await requireAccount(matchId);
  await requireFeedOpen(account.supabase, matchId);
  const db = account.supabase as any;
  const {data: post} = await db.from('launch_match_feed_posts').select('profile_id,image_path,deleted_at').eq('id', postId).eq('match_id', matchId).maybeSingle();
  if (!post || post.profile_id !== account.profile.id || post.deleted_at) redirect(feedUrl(matchId, 'feedError', 'That post cannot be edited.'));
  if (!body && !post.image_path) redirect(feedUrl(matchId, 'feedError', 'A post needs text or a photo.'));
  const {error} = await db.from('launch_match_feed_posts').update({body, edited_at: new Date().toISOString(), updated_at: new Date().toISOString()}).eq('id', postId);
  if (error) redirect(feedUrl(matchId, 'feedError', 'Post could not be edited.'));
  refresh(matchId);
  redirect(`/matches/${encodeURIComponent(matchId)}#post-${postId}`);
}

export async function addMatchFeedComment(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const parentCommentId = read(formData, 'parentCommentId') || null;
  const body = read(formData, 'body').slice(0, 1500);
  if (!matchId || !postId || !body) return;
  const account = await requireAccount(matchId);
  await requireFeedOpen(account.supabase, matchId);
  const db = account.supabase as any;
  if (parentCommentId) {
    const {data: parent} = await db.from('launch_match_feed_comments').select('id,parent_comment_id,post_id,deleted_at').eq('id', parentCommentId).eq('post_id', postId).maybeSingle();
    if (!parent || parent.parent_comment_id || parent.deleted_at) redirect(feedUrl(matchId, 'feedError', 'That comment cannot be replied to.'));
  }
  const {error} = await db.from('launch_match_feed_comments').insert({
    post_id: postId,
    profile_id: account.profile.id,
    author_name_snapshot: account.profile.display_name || 'Member',
    parent_comment_id: parentCommentId,
    body,
  });
  if (error) redirect(feedUrl(matchId, 'feedError', 'Comment could not be saved.'));
  refresh(matchId);
  redirect(`/matches/${encodeURIComponent(matchId)}#post-${postId}`);
}

export async function editMatchFeedComment(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const commentId = read(formData, 'commentId');
  const postId = read(formData, 'postId');
  const body = read(formData, 'body').slice(0, 1500);
  if (!matchId || !commentId || !postId || !body) return;
  const account = await requireAccount(matchId);
  await requireFeedOpen(account.supabase, matchId);
  const db = account.supabase as any;
  const {data: comment} = await db.from('launch_match_feed_comments').select('profile_id,deleted_at').eq('id', commentId).eq('post_id', postId).maybeSingle();
  if (!comment || comment.profile_id !== account.profile.id || comment.deleted_at) redirect(feedUrl(matchId, 'feedError', 'That comment cannot be edited.'));
  const {error} = await db.from('launch_match_feed_comments').update({body, edited_at: new Date().toISOString(), updated_at: new Date().toISOString()}).eq('id', commentId);
  if (error) redirect(feedUrl(matchId, 'feedError', 'Comment could not be edited.'));
  refresh(matchId);
  redirect(`/matches/${encodeURIComponent(matchId)}#post-${postId}`);
}

export async function setMatchFeedPostReaction(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const reactionType = read(formData, 'reactionType');
  if (!matchId || !postId || !REACTIONS.has(reactionType)) return;
  const account = await requireAccount(matchId);
  await requireFeedOpen(account.supabase, matchId);
  const db = account.supabase as any;
  const {data: existing, error: readError} = await db.from('launch_match_feed_post_reactions').select('reaction_type').eq('post_id', postId).eq('profile_id', account.profile.id).maybeSingle();
  if (readError) redirect(feedUrl(matchId, 'feedError', 'Reaction could not be updated.'));
  const mutation = existing?.reaction_type === reactionType
    ? db.from('launch_match_feed_post_reactions').delete().eq('post_id', postId).eq('profile_id', account.profile.id)
    : db.from('launch_match_feed_post_reactions').upsert({post_id: postId, profile_id: account.profile.id, reaction_type: reactionType});
  const {error} = await mutation;
  if (error) redirect(feedUrl(matchId, 'feedError', 'Reaction could not be updated.'));
  refresh(matchId);
  redirect(`/matches/${encodeURIComponent(matchId)}#post-${postId}`);
}

export async function setMatchFeedCommentReaction(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const commentId = read(formData, 'commentId');
  const postId = read(formData, 'postId');
  const reactionType = read(formData, 'reactionType');
  if (!matchId || !commentId || !REACTIONS.has(reactionType)) return;
  const account = await requireAccount(matchId);
  await requireFeedOpen(account.supabase, matchId);
  const db = account.supabase as any;
  const {data: existing, error: readError} = await db.from('launch_match_feed_comment_reactions').select('reaction_type').eq('comment_id', commentId).eq('profile_id', account.profile.id).maybeSingle();
  if (readError) redirect(feedUrl(matchId, 'feedError', 'Reaction could not be updated.'));
  const mutation = existing?.reaction_type === reactionType
    ? db.from('launch_match_feed_comment_reactions').delete().eq('comment_id', commentId).eq('profile_id', account.profile.id)
    : db.from('launch_match_feed_comment_reactions').upsert({comment_id: commentId, profile_id: account.profile.id, reaction_type: reactionType});
  const {error} = await mutation;
  if (error) redirect(feedUrl(matchId, 'feedError', 'Reaction could not be updated.'));
  refresh(matchId);
  redirect(postId ? `/matches/${encodeURIComponent(matchId)}#post-${postId}` : `/matches/${encodeURIComponent(matchId)}#match-feed`);
}

export async function softDeleteMatchFeedPost(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  if (!matchId || !postId) return;
  const account = await requireAccount(matchId);
  if (account.profile.role !== 'Commissioner' || account.profile.status !== 'Approved') redirect(feedUrl(matchId, 'feedError', 'Commissioner access is required.'));
  const db = account.supabase as any;
  const {data: post} = await db.from('launch_match_feed_posts').select('image_path').eq('id', postId).eq('match_id', matchId).maybeSingle();
  const {error} = await db.from('launch_match_feed_posts').update({deleted_at: new Date().toISOString(), deleted_by: account.profile.id, image_path: null}).eq('id', postId).eq('match_id', matchId);
  if (error) redirect(feedUrl(matchId, 'feedError', 'Post could not be removed.'));
  if (post?.image_path) {
    const {error: storageError} = await account.supabase.storage.from('match-feed').remove([post.image_path]);
    if (storageError) console.error('Removed Matchday post left an orphaned image.', {matchId, postId});
  }
  refresh(matchId);
  redirect(`/matches/${encodeURIComponent(matchId)}#post-${postId}`);
}

export async function softDeleteMatchFeedComment(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const commentId = read(formData, 'commentId');
  const postId = read(formData, 'postId');
  if (!matchId || !commentId) return;
  const account = await requireAccount(matchId);
  if (account.profile.role !== 'Commissioner' || account.profile.status !== 'Approved') redirect(feedUrl(matchId, 'feedError', 'Commissioner access is required.'));
  const db = account.supabase as any;
  const {error} = await db.from('launch_match_feed_comments').update({deleted_at: new Date().toISOString(), deleted_by: account.profile.id}).eq('id', commentId);
  if (error) redirect(feedUrl(matchId, 'feedError', 'Comment could not be removed.'));
  refresh(matchId);
  redirect(postId ? `/matches/${encodeURIComponent(matchId)}#post-${postId}` : `/matches/${encodeURIComponent(matchId)}#match-feed`);
}

async function requireAccount(matchId: string) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect(`/account?error=${encodeURIComponent('Sign in to join the match feed.')}`);
  const {data: profile} = await supabase.from('launch_profiles').select('id,display_name,role,status').eq('user_id', user.id).maybeSingle();
  if (!profile) redirect(`/account?error=${encodeURIComponent('Your account profile is not ready yet.')}`);
  return {supabase, user, profile};
}

async function requireFeedOpen(supabase: Awaited<ReturnType<typeof createClient>>, matchId: string) {
  const {data: match} = await supabase.from('launch_schedule_matches').select('date').eq('id', matchId).maybeSingle();
  if (match?.date && !isMatchFeedOpen(match.date)) redirect(feedUrl(matchId, 'feedError', matchFeedClosedMessage()));
}

function refresh(matchId: string) {
  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/');
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function feedUrl(matchId: string, key: string, message: string) {
  return `/matches/${encodeURIComponent(matchId)}?${key}=${encodeURIComponent(message)}#match-feed`;
}
