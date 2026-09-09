'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {PlayerAvailabilityService} from '@/domain/match-roster/PlayerAvailabilityService';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';
import {getOwnClubhouseContext} from '@/lib/clubhouse';

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === 'string' ? raw.trim() : '';
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
  if (!body) redirect('/clubhouse?error=Write something before posting.');
  const {supabase, context} = await requireContext();
  const db = supabase as any;
  const {error} = await db.from('launch_clubhouse_posts').insert({
    season_id: context.seasonId,
    team_id: context.teamId,
    author_profile_id: context.profileId,
    title: title || null,
    body,
  });
  if (error) redirect('/clubhouse?error=Post could not be saved.');
  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
  redirect('/clubhouse?notice=Posted.');
}

export async function deleteClubhousePost(formData: FormData) {
  const postId = value(formData, 'postId');
  const {supabase} = await requireContext();
  const db = supabase as any;
  const {error} = await db.from('launch_clubhouse_posts').delete().eq('id', postId);
  if (error) redirect('/clubhouse?error=Post could not be removed.');
  revalidatePath('/clubhouse');
  revalidatePath('/office/clubhouses');
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
