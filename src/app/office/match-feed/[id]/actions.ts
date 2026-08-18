'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

const REACTIONS = new Set(['like', 'love', 'laugh', 'fire']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function createMatchFeedPost(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const body = read(formData, 'body');
  if (!matchId) redirect('/office/match-feed?error=Match%20is%20required.');

  const {supabase, profileId} = await requireCommissioner();
  const db = supabase as any;
  const photo = formData.get('photo');
  let imagePath: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    if (!IMAGE_TYPES.has(photo.type) || photo.size > MAX_IMAGE_BYTES) {
      redirect(withError(matchId, 'Photo must be JPG, PNG, WebP, HEIC, or HEIF and 8 MB or smaller.'));
    }
    const extension = photo.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    imagePath = `${matchId}/${crypto.randomUUID()}.${extension}`;
    const {error: uploadError} = await supabase.storage.from('match-feed').upload(imagePath, photo, {
      contentType: photo.type,
      upsert: false,
    });
    if (uploadError) redirect(withError(matchId, 'Photo upload failed.'));
  }

  if (!body && !imagePath) redirect(withError(matchId, 'Add a message or photo first.'));

  const {error} = await db.from('launch_match_feed_posts').insert({
    match_id: matchId,
    profile_id: profileId,
    body,
    image_path: imagePath,
  });

  if (error) {
    if (imagePath) await supabase.storage.from('match-feed').remove([imagePath]);
    redirect(withError(matchId, 'Post could not be saved.'));
  }

  revalidatePath(`/office/match-feed/${matchId}`);
  redirect(withNotice(matchId, 'Posted to the match feed.'));
}

export async function addMatchFeedComment(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const parentCommentId = read(formData, 'parentCommentId') || null;
  const body = read(formData, 'body');
  if (!matchId || !postId || !body) redirect(withError(matchId, 'Comment text is required.'));

  const {supabase, profileId} = await requireCommissioner();
  const db = supabase as any;

  if (parentCommentId) {
    const {data: parent} = await db.from('launch_match_feed_comments')
      .select('id,parent_comment_id,post_id')
      .eq('id', parentCommentId)
      .eq('post_id', postId)
      .maybeSingle();
    if (!parent || parent.parent_comment_id) redirect(withError(matchId, 'Replies are limited to one level.'));
  }

  const {error} = await db.from('launch_match_feed_comments').insert({
    post_id: postId,
    profile_id: profileId,
    parent_comment_id: parentCommentId,
    body,
  });
  if (error) redirect(withError(matchId, 'Comment could not be saved.'));

  revalidatePath(`/office/match-feed/${matchId}`);
  redirect(`/office/match-feed/${encodeURIComponent(matchId)}#post-${postId}`);
}

export async function setMatchFeedPostReaction(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const reactionType = read(formData, 'reactionType');
  if (!matchId || !postId || !REACTIONS.has(reactionType)) return;

  const {supabase, profileId} = await requireCommissioner();
  const db = supabase as any;
  const {data: existing} = await db.from('launch_match_feed_post_reactions')
    .select('reaction_type')
    .eq('post_id', postId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (existing?.reaction_type === reactionType) {
    await db.from('launch_match_feed_post_reactions').delete().eq('post_id', postId).eq('profile_id', profileId);
  } else {
    await db.from('launch_match_feed_post_reactions').upsert({post_id: postId, profile_id: profileId, reaction_type: reactionType});
  }
  revalidatePath(`/office/match-feed/${matchId}`);
}

export async function setMatchFeedCommentReaction(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const commentId = read(formData, 'commentId');
  const reactionType = read(formData, 'reactionType');
  if (!matchId || !commentId || !REACTIONS.has(reactionType)) return;

  const {supabase, profileId} = await requireCommissioner();
  const db = supabase as any;
  const {data: existing} = await db.from('launch_match_feed_comment_reactions')
    .select('reaction_type')
    .eq('comment_id', commentId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (existing?.reaction_type === reactionType) {
    await db.from('launch_match_feed_comment_reactions').delete().eq('comment_id', commentId).eq('profile_id', profileId);
  } else {
    await db.from('launch_match_feed_comment_reactions').upsert({comment_id: commentId, profile_id: profileId, reaction_type: reactionType});
  }
  revalidatePath(`/office/match-feed/${matchId}`);
}

export async function softDeleteMatchFeedPost(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  if (!matchId || !postId) return;
  const {supabase, profileId} = await requireCommissioner();
  const db = supabase as any;
  await db.from('launch_match_feed_posts').update({deleted_at: new Date().toISOString(), deleted_by: profileId}).eq('id', postId).eq('match_id', matchId);
  revalidatePath(`/office/match-feed/${matchId}`);
}

export async function softDeleteMatchFeedComment(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const commentId = read(formData, 'commentId');
  if (!matchId || !commentId) return;
  const {supabase, profileId} = await requireCommissioner();
  const db = supabase as any;
  await db.from('launch_match_feed_comments').update({deleted_at: new Date().toISOString(), deleted_by: profileId}).eq('id', commentId);
  revalidatePath(`/office/match-feed/${matchId}`);
}

async function requireCommissioner() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account?error=Commissioner%20sign-in%20required.');
  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') {
    redirect('/account?error=Approved%20commissioner%20access%20is%20required.');
  }
  return {supabase, profileId: profile.id};
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function withError(matchId: string, message: string) {
  return `/office/match-feed/${encodeURIComponent(matchId)}?error=${encodeURIComponent(message)}`;
}

function withNotice(matchId: string, message: string) {
  return `/office/match-feed/${encodeURIComponent(matchId)}?notice=${encodeURIComponent(message)}`;
}
