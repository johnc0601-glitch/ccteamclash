'use server';

import {revalidatePath} from 'next/cache';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {processMatchdayImage} from '@/services/media/MediaImageProcessor';
import {isMatchFeedOpen, matchFeedClosedMessage} from '@/services/matches/MatchFeedLifecycle';
import {getPublicMatchHref, resolveMatchPublicReference} from '@/services/matches/MatchPublicIdentity';

const REACTIONS = new Set(['like', 'love', 'laugh', 'fire']);
const REPORT_REASONS = new Set(['Spam', 'Harassment', 'Inappropriate', 'Other']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const POST_RATE_LIMIT = 8;
const COMMENT_RATE_LIMIT = 30;
const FEED_CURSOR_PATTERN = /^\d{4}-\d{2}-\d{2}T[^|]+\|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createMatchFeedPost(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const body = read(formData, 'body').slice(0, 3000);
  if (!matchId) return;
  const account = await requireAccount(matchId);
  await requireFeedOpen(account.supabase, matchId, account.matchHref);
  await requireRateLimit(account.supabase, 'launch_match_feed_posts', account.profile.id, POST_RATE_LIMIT, matchId, account.matchHref, 'You are posting too quickly. Try again in a few minutes.');
  const photo = formData.get('photo');
  let imagePath: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    if (!IMAGE_TYPES.has(photo.type) || photo.size > MAX_IMAGE_BYTES) {
      redirect(feedUrl(account.matchHref, 'feedError', 'Photo must be JPG, PNG, WebP, HEIC, or HEIF and 8 MB or smaller.'));
    }

    let processed: Awaited<ReturnType<typeof processMatchdayImage>>;
    try {
      processed = await processMatchdayImage(photo);
    } catch (error) {
      console.error('Matchday photo could not be processed.', {matchId, type: photo.type, size: photo.size, error});
      redirect(feedUrl(account.matchHref, 'feedError', 'That photo could not be processed. Try JPG, PNG, WebP, or a different phone photo.'));
    }

    imagePath = `${matchId}/${crypto.randomUUID()}.webp`;
    const {error} = await account.supabase.storage.from('match-feed').upload(imagePath, processed.image, {
      contentType: processed.mimeType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) redirect(feedUrl(account.matchHref, 'feedError', 'Photo upload failed.'));
  }

  if (!body && !imagePath) redirect(feedUrl(account.matchHref, 'feedError', 'Add a message or photo first.'));
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
    redirect(feedUrl(account.matchHref, 'feedError', 'Post could not be saved.'));
  }
  refresh(matchId, account.matchHref);
  redirect(feedUrl(account.matchHref, 'feedNotice', 'Posted.'));
}

export async function editMatchFeedPost(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const body = read(formData, 'body').slice(0, 3000);
  if (!matchId || !postId) return;
  const account = await requireAccount(matchId);
  const feedBefore = await currentFeedBefore(matchId, account.supabase);
  await requireFeedOpen(account.supabase, matchId, account.matchHref);
  const db = account.supabase as any;
  const {data: post} = await db.from('launch_match_feed_posts').select('profile_id,image_path,deleted_at').eq('id', postId).eq('match_id', matchId).maybeSingle();
  if (!post || post.profile_id !== account.profile.id || post.deleted_at) redirect(feedUrl(account.matchHref, 'feedError', 'That post cannot be edited.'));
  if (!body && !post.image_path) redirect(feedUrl(account.matchHref, 'feedError', 'A post needs text or a photo.'));
  const {error} = await db.from('launch_match_feed_posts').update({body, edited_at: new Date().toISOString(), updated_at: new Date().toISOString()}).eq('id', postId);
  if (error) redirect(feedUrl(account.matchHref, 'feedError', 'Post could not be edited.'));
  refresh(matchId, account.matchHref);
  redirect(feedAnchorUrl(account.matchHref, postId, feedBefore));
}

export async function addMatchFeedComment(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const parentCommentId = read(formData, 'parentCommentId') || null;
  const body = read(formData, 'body').slice(0, 1500);
  if (!matchId || !postId || !body) return;
  const account = await requireAccount(matchId);
  const feedBefore = await currentFeedBefore(matchId, account.supabase);
  await requireFeedOpen(account.supabase, matchId, account.matchHref);
  await requireRateLimit(account.supabase, 'launch_match_feed_comments', account.profile.id, COMMENT_RATE_LIMIT, matchId, account.matchHref, 'You are commenting too quickly. Try again in a few minutes.');
  const db = account.supabase as any;
  if (parentCommentId) {
    const {data: parent} = await db.from('launch_match_feed_comments').select('id,parent_comment_id,post_id,deleted_at').eq('id', parentCommentId).eq('post_id', postId).maybeSingle();
    if (!parent || parent.parent_comment_id || parent.deleted_at) redirect(feedUrl(account.matchHref, 'feedError', 'That comment cannot be replied to.'));
  }
  const {error} = await db.from('launch_match_feed_comments').insert({
    post_id: postId,
    profile_id: account.profile.id,
    author_name_snapshot: account.profile.display_name || 'Member',
    parent_comment_id: parentCommentId,
    body,
  });
  if (error) redirect(feedUrl(account.matchHref, 'feedError', 'Comment could not be saved.'));
  refresh(matchId, account.matchHref);
  redirect(feedAnchorUrl(account.matchHref, postId, feedBefore));
}

export async function editMatchFeedComment(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const commentId = read(formData, 'commentId');
  const postId = read(formData, 'postId');
  const body = read(formData, 'body').slice(0, 1500);
  if (!matchId || !commentId || !postId || !body) return;
  const account = await requireAccount(matchId);
  const feedBefore = await currentFeedBefore(matchId, account.supabase);
  await requireFeedOpen(account.supabase, matchId, account.matchHref);
  const db = account.supabase as any;
  const {data: comment} = await db.from('launch_match_feed_comments').select('profile_id,deleted_at').eq('id', commentId).eq('post_id', postId).maybeSingle();
  if (!comment || comment.profile_id !== account.profile.id || comment.deleted_at) redirect(feedUrl(account.matchHref, 'feedError', 'That comment cannot be edited.'));
  const {error} = await db.from('launch_match_feed_comments').update({body, edited_at: new Date().toISOString(), updated_at: new Date().toISOString()}).eq('id', commentId);
  if (error) redirect(feedUrl(account.matchHref, 'feedError', 'Comment could not be edited.'));
  refresh(matchId, account.matchHref);
  redirect(feedAnchorUrl(account.matchHref, postId, feedBefore));
}

export async function reportMatchFeedContent(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const commentId = read(formData, 'commentId');
  const reasonInput = read(formData, 'reason');
  const note = read(formData, 'note').slice(0, 500);
  const reason = REPORT_REASONS.has(reasonInput) ? reasonInput : 'Other';
  if (!matchId || (!postId && !commentId) || (postId && commentId)) return;

  const account = await requireAccount(matchId);
  const feedBefore = await currentFeedBefore(matchId, account.supabase);
  const db = account.supabase as any;
  let targetProfileId: string | null = null;
  let anchorPostId = postId;

  if (postId) {
    const {data: post} = await db.from('launch_match_feed_posts').select('id,profile_id,deleted_at').eq('id', postId).eq('match_id', matchId).maybeSingle();
    if (!post || post.deleted_at) redirect(feedUrl(account.matchHref, 'feedError', 'That post is no longer available to report.'));
    targetProfileId = post.profile_id;
  } else {
    const {data: comment} = await db.from('launch_match_feed_comments').select('id,post_id,profile_id,deleted_at').eq('id', commentId).maybeSingle();
    if (!comment || comment.deleted_at) redirect(feedUrl(account.matchHref, 'feedError', 'That comment is no longer available to report.'));
    const {data: parentPost} = await db.from('launch_match_feed_posts').select('id,match_id,deleted_at').eq('id', comment.post_id).maybeSingle();
    if (!parentPost || parentPost.match_id !== matchId || parentPost.deleted_at) redirect(feedUrl(account.matchHref, 'feedError', 'That comment is no longer available to report.'));
    targetProfileId = comment.profile_id;
    anchorPostId = comment.post_id;
  }

  if (targetProfileId === account.profile.id) redirect(feedUrl(account.matchHref, 'feedError', 'You cannot report your own content.'));

  const {error} = await db.from('launch_match_feed_reports').insert({
    match_id: matchId,
    post_id: postId || null,
    comment_id: commentId || null,
    reporter_profile_id: account.profile.id,
    reason,
    note,
  });

  if (error) {
    if (error.code === '23505') redirect(feedUrl(account.matchHref, 'feedNotice', 'You already reported this item.'));
    console.error('Matchday report could not be saved.', {matchId, postId: postId || null, commentId: commentId || null, error: error.message});
    redirect(feedUrl(account.matchHref, 'feedError', 'Report could not be submitted.'));
  }

  revalidatePath('/office/media/moderation');
  redirect(feedAnchorUrl(account.matchHref, anchorPostId, feedBefore, 'feedNotice', 'Report submitted. A commissioner can review it.'));
}

export async function setMatchFeedPostReaction(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  const reactionType = read(formData, 'reactionType');
  if (!matchId || !postId || !REACTIONS.has(reactionType)) return;
  const account = await requireAccount(matchId);
  const feedBefore = await currentFeedBefore(matchId, account.supabase);
  await requireFeedOpen(account.supabase, matchId, account.matchHref);
  const db = account.supabase as any;
  const {data: existing, error: readError} = await db.from('launch_match_feed_post_reactions').select('reaction_type').eq('post_id', postId).eq('profile_id', account.profile.id).maybeSingle();
  if (readError) redirect(feedUrl(account.matchHref, 'feedError', 'Reaction could not be updated.'));
  const mutation = existing?.reaction_type === reactionType
    ? db.from('launch_match_feed_post_reactions').delete().eq('post_id', postId).eq('profile_id', account.profile.id)
    : db.from('launch_match_feed_post_reactions').upsert({post_id: postId, profile_id: account.profile.id, reaction_type: reactionType});
  const {error} = await mutation;
  if (error) redirect(feedUrl(account.matchHref, 'feedError', 'Reaction could not be updated.'));
  refresh(matchId, account.matchHref);
  redirect(feedAnchorUrl(account.matchHref, postId, feedBefore));
}

export async function setMatchFeedCommentReaction(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const commentId = read(formData, 'commentId');
  const postId = read(formData, 'postId');
  const reactionType = read(formData, 'reactionType');
  if (!matchId || !commentId || !REACTIONS.has(reactionType)) return;
  const account = await requireAccount(matchId);
  const feedBefore = await currentFeedBefore(matchId, account.supabase);
  await requireFeedOpen(account.supabase, matchId, account.matchHref);
  const db = account.supabase as any;
  const {data: existing, error: readError} = await db.from('launch_match_feed_comment_reactions').select('reaction_type').eq('comment_id', commentId).eq('profile_id', account.profile.id).maybeSingle();
  if (readError) redirect(feedUrl(account.matchHref, 'feedError', 'Reaction could not be updated.'));
  const mutation = existing?.reaction_type === reactionType
    ? db.from('launch_match_feed_comment_reactions').delete().eq('comment_id', commentId).eq('profile_id', account.profile.id)
    : db.from('launch_match_feed_comment_reactions').upsert({comment_id: commentId, profile_id: account.profile.id, reaction_type: reactionType});
  const {error} = await mutation;
  if (error) redirect(feedUrl(account.matchHref, 'feedError', 'Reaction could not be updated.'));
  refresh(matchId, account.matchHref);
  redirect(postId ? feedAnchorUrl(account.matchHref, postId, feedBefore) : feedSectionUrl(account.matchHref, feedBefore));
}

export async function softDeleteMatchFeedPost(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const postId = read(formData, 'postId');
  if (!matchId || !postId) return;
  const account = await requireAccount(matchId);
  const feedBefore = await currentFeedBefore(matchId, account.supabase);
  if (account.profile.role !== 'Commissioner' || account.profile.status !== 'Approved') redirect(feedUrl(account.matchHref, 'feedError', 'Commissioner access is required.'));
  const db = account.supabase as any;
  const {data: post} = await db.from('launch_match_feed_posts').select('image_path').eq('id', postId).eq('match_id', matchId).maybeSingle();
  const {error} = await db.from('launch_match_feed_posts').update({deleted_at: new Date().toISOString(), deleted_by: account.profile.id, image_path: null}).eq('id', postId).eq('match_id', matchId);
  if (error) redirect(feedUrl(account.matchHref, 'feedError', 'Post could not be removed.'));
  if (post?.image_path) {
    const {error: storageError} = await account.supabase.storage.from('match-feed').remove([post.image_path]);
    if (storageError) console.error('Removed Matchday post left an orphaned image.', {matchId, postId});
  }
  refresh(matchId, account.matchHref);
  redirect(feedAnchorUrl(account.matchHref, postId, feedBefore));
}

export async function softDeleteMatchFeedComment(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const commentId = read(formData, 'commentId');
  const postId = read(formData, 'postId');
  if (!matchId || !commentId) return;
  const account = await requireAccount(matchId);
  const feedBefore = await currentFeedBefore(matchId, account.supabase);
  if (account.profile.role !== 'Commissioner' || account.profile.status !== 'Approved') redirect(feedUrl(account.matchHref, 'feedError', 'Commissioner access is required.'));
  const db = account.supabase as any;
  const {error} = await db.from('launch_match_feed_comments').update({deleted_at: new Date().toISOString(), deleted_by: account.profile.id}).eq('id', commentId);
  if (error) redirect(feedUrl(account.matchHref, 'feedError', 'Comment could not be removed.'));
  refresh(matchId, account.matchHref);
  redirect(postId ? feedAnchorUrl(account.matchHref, postId, feedBefore) : feedSectionUrl(account.matchHref, feedBefore));
}

async function requireAccount(matchId: string) {
  const supabase = await createClient();
  const [{data: {user}}, matchHref] = await Promise.all([
    supabase.auth.getUser(),
    getPublicMatchHref(supabase, matchId),
  ]);
  if (!user) redirect(`/account?error=${encodeURIComponent('Sign in to join the match feed.')}`);
  const {data: profile} = await supabase.from('launch_profiles').select('id,display_name,role,status').eq('user_id', user.id).maybeSingle();
  if (!profile) redirect(`/account?error=${encodeURIComponent('Your account profile is not ready yet.')}`);
  return {supabase, user, profile, matchHref};
}

async function requireFeedOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  matchHref: string,
) {
  const {data: match} = await supabase.from('launch_schedule_matches').select('date').eq('id', matchId).maybeSingle();
  if (!match?.date || !isMatchFeedOpen(match.date)) redirect(feedUrl(matchHref, 'feedError', matchFeedClosedMessage()));
}

async function requireRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'launch_match_feed_posts' | 'launch_match_feed_comments',
  profileId: string,
  limit: number,
  matchId: string,
  matchHref: string,
  message: string,
) {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const {count, error} = await (supabase as any)
    .from(table)
    .select('id', {count: 'exact', head: true})
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .gte('created_at', since);

  if (error) {
    console.error('Matchday rate-limit check failed open.', {table, profileId, error: error.message});
    return;
  }
  if ((count ?? 0) >= limit) redirect(feedUrl(matchHref, 'feedError', message));
}

async function currentFeedBefore(
  matchId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const requestHeaders = await headers();
  const referrer = requestHeaders.get('referer');
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    const reference = url.pathname.match(/^\/matches\/([^/]+)\/?$/)?.[1];
    if (!reference) return null;
    const resolved = await resolveMatchPublicReference(supabase as any, reference);
    if (resolved?.matchId !== matchId) return null;
    const cursor = url.searchParams.get('feedBefore');
    return cursor && FEED_CURSOR_PATTERN.test(cursor) ? cursor : null;
  } catch {
    return null;
  }
}

function refresh(matchId: string, matchHref: string) {
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(matchHref);
  revalidatePath('/');
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function feedAnchorUrl(matchHref: string, postId: string, feedBefore: string | null, key?: string, message?: string) {
  const params = new URLSearchParams();
  if (feedBefore) params.set('feedBefore', feedBefore);
  if (key && message) params.set(key, message);
  const query = params.toString();
  return `${matchHref}${query ? `?${query}` : ''}#post-${postId}`;
}

function feedSectionUrl(matchHref: string, feedBefore: string | null) {
  const params = new URLSearchParams();
  if (feedBefore) params.set('feedBefore', feedBefore);
  const query = params.toString();
  return `${matchHref}${query ? `?${query}` : ''}#match-feed`;
}

function feedUrl(matchHref: string, key: string, message: string) {
  return `${matchHref}?${key}=${encodeURIComponent(message)}#match-feed`;
}