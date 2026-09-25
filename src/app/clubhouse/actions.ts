'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {PlayerAvailabilityService} from '@/domain/match-roster/PlayerAvailabilityService';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';
import {getClubhouseContext, getOwnClubhouseContext} from '@/lib/clubhouse';

const MODERATION_REASONS = new Set(['Spam', 'Harassment', 'Inappropriate', 'Off-topic', 'Other']);

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === 'string' ? raw.trim() : '';
}

function moderationReason(formData: FormData) {
  const reason = value(formData, 'reason');
  return MODERATION_REASONS.has(reason) ? reason : 'Other';
}

function clubhouseUrl(
  context: {teamId: string; isCommissionerReview: boolean},
  key?: 'notice' | 'error',
  message?: string,
) {
  const params = new URLSearchParams();
  if (context.isCommissionerReview) params.set('team', context.teamId);
  if (key && message) params.set(key, message);
  const query = params.toString();
  return `/clubhouse${query ? `?${query}` : ''}`;
}

async function requireContext(teamId?: string) {
  const supabase = await createClient();
  const context = teamId
    ? await getClubhouseContext(supabase, teamId)
    : await getOwnClubhouseContext(supabase);
  if (!context) redirect('/account');
  return {supabase, context};
}

export async function setClubhouseAttendance(formData: FormData) {
  const matchId = value(formData, 'matchId');
  const status = value(formData, 'status');
  if (!matchId) redirect('/clubhouse?error=Match is required.');

  const {supabase} = await requireContext();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');

  if (status === 'Unconfirmed') {
    const db = supabase as any;
    const context = await getOwnClubhouseContext(supabase);
    if (!context) redirect('/account');
    const {error} = await db
      .from('launch_match_attendance')
      .delete()
      .eq('match_id', matchId)
      .eq('team_id', context.teamId)
      .eq('player_id', context.playerId);
    if (error) redirect('/clubhouse?error=Availability could not be reset.');
  } else {
    const service = new PlayerAvailabilityService(new SeasonAwareMatchRosterRepository(supabase));
    const result = await service.setOwnAttendance(user.id, matchId, status);
    if (!result.ok) redirect(`/clubhouse?error=${encodeURIComponent(result.message)}`);
  }

  revalidatePath('/clubhouse');
  redirect('/clubhouse?notice=Availability updated.');
}

export async function createClubhousePost(formData: FormData) {
  const title = value(formData, 'title');
  const body = value(formData, 'body');
  const requestedType = value(formData, 'postType');
  if (!body) redirect('/clubhouse?error=Write something before posting.');

  const {supabase, context} = await requireContext();
  const canAnnounce = context.isCaptain || context.isCommissioner;
  const postType = requestedType === 'announcement' && canAnnounce ? 'announcement' : 'discussion';
  const db = supabase as any;

  const {data: createdPost, error} = await db
    .from('launch_clubhouse_posts')
    .insert({
      season_id: context.seasonId,
      team_id: context.teamId,
      author_profile_id: context.profileId,
      title: title || null,
      body,
      post_type: postType,
      pinned_at: postType === 'announcement' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (error || !createdPost) redirect('/clubhouse?error=Post could not be saved.');

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  revalidatePath(`/teams/${context.teamId}`);
  redirect(`/clubhouse?notice=${postType === 'announcement' ? 'Captain announcement posted.' : 'Posted.'}`);
}

export async function deleteClubhousePost(formData: FormData) {
  const postId = value(formData, 'postId');
  const teamId = value(formData, 'teamId');
  if (!postId) redirect('/clubhouse?error=Post is required.');

  const {supabase, context} = await requireContext(teamId || undefined);
  const db = supabase as any;
  const {data: post} = await db
    .from('launch_clubhouse_posts')
    .select('id,season_id,team_id,author_profile_id,deleted_at')
    .eq('id', postId)
    .maybeSingle();

  if (!post || post.deleted_at || post.season_id !== context.seasonId || post.team_id !== context.teamId) {
    redirect('/clubhouse?error=That post is no longer available.');
  }

  const isOwn = post.author_profile_id === context.profileId;
  const isModerator = context.isCaptain || context.isCommissioner;
  if (!isOwn && !isModerator) redirect('/clubhouse?error=You cannot remove that post.');

  const {error} = await db
    .from('launch_clubhouse_posts')
    .update({deleted_at: new Date().toISOString()})
    .eq('id', postId)
    .is('deleted_at', null);
  if (error) redirect(clubhouseUrl(context, 'error', 'Post could not be removed.'));

  if (!isOwn && isModerator) {
    const {error: auditError} = await db.from('launch_clubhouse_moderation_events').insert({
      season_id: context.seasonId,
      team_id: context.teamId,
      content_type: 'post',
      content_id: post.id,
      content_author_profile_id: post.author_profile_id,
      moderator_profile_id: context.profileId,
      reason: moderationReason(formData),
    });
    if (auditError) console.error('Clubhouse moderation event could not be recorded.', {postId, error: auditError.message});
    await db
      .from('launch_clubhouse_reports')
      .update({status: 'Removed', reviewed_by_profile_id: context.profileId, reviewed_at: new Date().toISOString()})
      .eq('team_id', context.teamId)
      .eq('content_type', 'post')
      .eq('content_id', post.id)
      .eq('status', 'Open');
  }

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect(clubhouseUrl(context, 'notice', 'Post removed.'));
}

export async function toggleClubhousePin(formData: FormData) {
  const postId = value(formData, 'postId');
  const teamId = value(formData, 'teamId');
  const pinned = value(formData, 'pinned') === 'true';
  const {supabase, context} = await requireContext(teamId || undefined);
  if (!context.isCaptain && !context.isCommissioner) redirect('/clubhouse?error=Only captains can pin posts.');
  const db = supabase as any;
  const {error} = await db.from('launch_clubhouse_posts').update({pinned_at: pinned ? null : new Date().toISOString()}).eq('id', postId);
  if (error) redirect(clubhouseUrl(context, 'error', 'Pin could not be updated.'));
  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  if (context.isCommissionerReview) redirect(clubhouseUrl(context));
}

export async function addClubhouseComment(formData: FormData) {
  const postId = value(formData, 'postId');
  const parentCommentId = value(formData, 'parentCommentId');
  const body = value(formData, 'body');
  if (!postId || !body) redirect('/clubhouse?error=Comment is required.');
  const {supabase, context} = await requireContext();
  const db = supabase as any;
  const {error} = await db.from('launch_clubhouse_comments').insert({
    post_id: postId,
    author_profile_id: context.profileId,
    parent_comment_id: parentCommentId || null,
    body,
  });
  if (error) redirect('/clubhouse?error=Comment could not be saved.');
  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
}

export async function removeClubhouseComment(formData: FormData) {
  const commentId = value(formData, 'commentId');
  const teamId = value(formData, 'teamId');
  if (!commentId) redirect('/clubhouse?error=Comment is required.');

  const {supabase, context} = await requireContext(teamId || undefined);
  const db = supabase as any;
  const {data: comment} = await db
    .from('launch_clubhouse_comments')
    .select('id,post_id,author_profile_id,deleted_at')
    .eq('id', commentId)
    .maybeSingle();
  if (!comment || comment.deleted_at) redirect('/clubhouse?error=That comment is no longer available.');

  const {data: post} = await db
    .from('launch_clubhouse_posts')
    .select('id,season_id,team_id,deleted_at')
    .eq('id', comment.post_id)
    .maybeSingle();
  if (!post || post.deleted_at || post.season_id !== context.seasonId || post.team_id !== context.teamId) {
    redirect('/clubhouse?error=That comment is no longer available.');
  }

  const isOwn = comment.author_profile_id === context.profileId;
  const isModerator = context.isCaptain || context.isCommissioner;
  if (!isOwn && !isModerator) redirect('/clubhouse?error=You cannot remove that comment.');

  const {error} = await db
    .from('launch_clubhouse_comments')
    .update({deleted_at: new Date().toISOString()})
    .eq('id', commentId)
    .is('deleted_at', null);
  if (error) redirect(clubhouseUrl(context, 'error', 'Comment could not be removed.'));

  if (!isOwn && isModerator) {
    const {error: auditError} = await db.from('launch_clubhouse_moderation_events').insert({
      season_id: context.seasonId,
      team_id: context.teamId,
      content_type: 'comment',
      content_id: comment.id,
      content_author_profile_id: comment.author_profile_id,
      moderator_profile_id: context.profileId,
      reason: moderationReason(formData),
    });
    if (auditError) console.error('Clubhouse moderation event could not be recorded.', {commentId, error: auditError.message});
    await db
      .from('launch_clubhouse_reports')
      .update({status: 'Removed', reviewed_by_profile_id: context.profileId, reviewed_at: new Date().toISOString()})
      .eq('team_id', context.teamId)
      .eq('content_type', 'comment')
      .eq('content_id', comment.id)
      .eq('status', 'Open');
  }

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect(clubhouseUrl(context, 'notice', 'Comment removed.'));
}

export async function reactToClubhousePost(formData: FormData) {
  const postId = value(formData, 'postId');
  const reactionType = value(formData, 'reactionType');
  const {supabase, context} = await requireContext();
  const db = supabase as any;
  const {data: existing} = await db
    .from('launch_clubhouse_post_reactions')
    .select('reaction_type')
    .eq('post_id', postId)
    .eq('profile_id', context.profileId)
    .maybeSingle();

  if (existing?.reaction_type === reactionType) {
    await db.from('launch_clubhouse_post_reactions').delete().eq('post_id', postId).eq('profile_id', context.profileId);
  } else {
    await db.from('launch_clubhouse_post_reactions').upsert({post_id: postId, profile_id: context.profileId, reaction_type: reactionType});
  }
  revalidatePath('/clubhouse');
}


export async function editClubhousePost(formData: FormData) {
  const postId = value(formData, 'postId');
  const teamId = value(formData, 'teamId');
  const title = value(formData, 'title').slice(0, 120);
  const body = value(formData, 'body').slice(0, 3000);
  if (!postId || !body) redirect('/clubhouse?error=Post text is required.');

  const {supabase, context} = await requireContext(teamId || undefined);
  const db = supabase as any;
  const {data: post} = await db
    .from('launch_clubhouse_posts')
    .select('id,season_id,team_id,author_profile_id,deleted_at')
    .eq('id', postId)
    .maybeSingle();

  if (!post || post.deleted_at || post.season_id !== context.seasonId || post.team_id !== context.teamId) {
    redirect('/clubhouse?error=That post is no longer available.');
  }
  if (post.author_profile_id !== context.profileId) {
    redirect('/clubhouse?error=Only the author can edit that post.');
  }

  const {error} = await db
    .from('launch_clubhouse_posts')
    .update({title: title || null, body})
    .eq('id', postId)
    .is('deleted_at', null);
  if (error) redirect(clubhouseUrl(context, 'error', 'Post could not be edited.'));

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect(clubhouseUrl(context, 'notice', 'Post updated.'));
}

export async function editClubhouseComment(formData: FormData) {
  const commentId = value(formData, 'commentId');
  const teamId = value(formData, 'teamId');
  const body = value(formData, 'body').slice(0, 1500);
  if (!commentId || !body) redirect('/clubhouse?error=Comment text is required.');

  const {supabase, context} = await requireContext(teamId || undefined);
  const db = supabase as any;
  const {data: comment} = await db
    .from('launch_clubhouse_comments')
    .select('id,post_id,author_profile_id,deleted_at')
    .eq('id', commentId)
    .maybeSingle();
  if (!comment || comment.deleted_at || comment.author_profile_id !== context.profileId) {
    redirect('/clubhouse?error=That comment cannot be edited.');
  }

  const {data: post} = await db
    .from('launch_clubhouse_posts')
    .select('season_id,team_id,deleted_at')
    .eq('id', comment.post_id)
    .maybeSingle();
  if (!post || post.deleted_at || post.season_id !== context.seasonId || post.team_id !== context.teamId) {
    redirect('/clubhouse?error=That comment cannot be edited.');
  }

  const {error} = await db
    .from('launch_clubhouse_comments')
    .update({body, updated_at: new Date().toISOString()})
    .eq('id', commentId)
    .is('deleted_at', null);
  if (error) redirect(clubhouseUrl(context, 'error', 'Comment could not be edited.'));

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect(clubhouseUrl(context, 'notice', 'Comment updated.'));
}

export async function reportClubhouseContent(formData: FormData) {
  const teamId = value(formData, 'teamId');
  const contentType = value(formData, 'contentType');
  const contentId = value(formData, 'contentId');
  const reason = moderationReason(formData);
  const note = value(formData, 'note').slice(0, 500);
  if (!contentId || !['post', 'comment'].includes(contentType)) {
    redirect('/clubhouse?error=That content cannot be reported.');
  }

  const {supabase, context} = await requireContext(teamId || undefined);
  const db = supabase as any;
  const {error} = await db.from('launch_clubhouse_reports').insert({
    season_id: context.seasonId,
    team_id: context.teamId,
    content_type: contentType,
    content_id: contentId,
    content_author_profile_id: context.profileId,
    reporter_profile_id: context.profileId,
    reason,
    note: note || null,
  });

  if (error) {
    if (error.code === '23505') redirect(clubhouseUrl(context, 'notice', 'You already reported that item.'));
    console.error('Clubhouse report could not be saved.', {contentType, contentId, error: error.message});
    redirect(clubhouseUrl(context, 'error', 'Report could not be submitted.'));
  }

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect(clubhouseUrl(context, 'notice', 'Report submitted.'));
}

export async function resolveClubhouseReport(formData: FormData) {
  const reportId = value(formData, 'reportId');
  const teamId = value(formData, 'teamId');
  const status = value(formData, 'status');
  if (!reportId || !['Reviewed', 'Dismissed', 'Removed'].includes(status)) {
    redirect('/clubhouse?error=Report update is invalid.');
  }

  const {supabase, context} = await requireContext(teamId || undefined);
  if (!context.isCaptain && !context.isCommissioner) {
    redirect('/clubhouse?error=Moderator access is required.');
  }

  const db = supabase as any;
  const {error} = await db
    .from('launch_clubhouse_reports')
    .update({
      status,
      reviewed_by_profile_id: context.profileId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('season_id', context.seasonId)
    .eq('team_id', context.teamId);
  if (error) redirect(clubhouseUrl(context, 'error', 'Report could not be updated.'));

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect(clubhouseUrl(context, 'notice', 'Report updated.'));
}
