'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {PlayerAvailabilityService} from '@/domain/match-roster/PlayerAvailabilityService';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';
import {getOwnClubhouseContext} from '@/lib/clubhouse';
import {enqueueCaptainAnnouncementNotifications} from '@/services/notifications/NotificationOutboxService';

const MODERATION_REASONS = new Set(['Spam', 'Harassment', 'Inappropriate', 'Off-topic', 'Other']);

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === 'string' ? raw.trim() : '';
}

function moderationReason(formData: FormData) {
  const reason = value(formData, 'reason');
  return MODERATION_REASONS.has(reason) ? reason : 'Other';
}

async function requireContext() {
  const supabase = await createClient();
  const context = await getOwnClubhouseContext(supabase);
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

  if (postType === 'announcement') {
    try {
      await enqueueCaptainAnnouncementNotifications({
        seasonId: context.seasonId,
        teamId: context.teamId,
        teamName: context.teamName,
        postId: createdPost.id,
        title,
        body,
        authorProfileId: context.profileId,
      });
    } catch (notificationError) {
      console.error('Captain announcement notification could not be queued.', {
        postId: createdPost.id,
        teamId: context.teamId,
        error: notificationError,
      });
    }
  }
  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  revalidatePath(`/teams/${context.teamId}`);
  redirect(`/clubhouse?notice=${postType === 'announcement' ? 'Captain announcement posted.' : 'Posted.'}`);
}

export async function deleteClubhousePost(formData: FormData) {
  const postId = value(formData, 'postId');
  if (!postId) redirect('/clubhouse?error=Post is required.');

  const {supabase, context} = await requireContext();
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
  if (error) redirect('/clubhouse?error=Post could not be removed.');

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
  }

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect('/clubhouse?notice=Post removed.');
}

export async function toggleClubhousePin(formData: FormData) {
  const postId = value(formData, 'postId');
  const pinned = value(formData, 'pinned') === 'true';
  const {supabase, context} = await requireContext();
  if (!context.isCaptain && !context.isCommissioner) redirect('/clubhouse?error=Only captains can pin posts.');
  const db = supabase as any;
  const {error} = await db.from('launch_clubhouse_posts').update({pinned_at: pinned ? null : new Date().toISOString()}).eq('id', postId);
  if (error) redirect('/clubhouse?error=Pin could not be updated.');
  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
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
  if (!commentId) redirect('/clubhouse?error=Comment is required.');

  const {supabase, context} = await requireContext();
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
  if (error) redirect('/clubhouse?error=Comment could not be removed.');

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
  }

  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect('/clubhouse?notice=Comment removed.');
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
