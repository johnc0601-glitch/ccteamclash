'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

const REPORT_STATUSES = new Set(['Resolved', 'Dismissed']);

export async function reviewMatchFeedReport(formData: FormData) {
  const reportId = read(formData, 'reportId');
  const status = read(formData, 'status');
  const resolutionNote = read(formData, 'resolutionNote').slice(0, 500);
  if (!reportId || !REPORT_STATUSES.has(status)) return;

  const {supabase, profile} = await requireCommissioner();
  const db = supabase as any;
  const {data: report, error: reportError} = await db
    .from('launch_match_feed_reports')
    .select('id,match_id,post_id,comment_id,status')
    .eq('id', reportId)
    .maybeSingle();

  if (reportError || !report) redirect(`/office/media/moderation?error=${encodeURIComponent('Report could not be loaded.')}`);
  if (report.status !== 'Pending') redirect(`/office/media/moderation?notice=${encodeURIComponent('That report was already reviewed.')}`);

  const now = new Date().toISOString();
  const {error} = await db.from('launch_match_feed_reports').update({
    status,
    reviewed_at: now,
    reviewed_by_profile_id: profile.id,
    resolution_note: resolutionNote,
  }).eq('id', reportId).eq('status', 'Pending');

  if (error) redirect(`/office/media/moderation?error=${encodeURIComponent('Report could not be updated.')}`);

  revalidatePath('/office/media/moderation');
  revalidatePath(`/matches/${report.match_id}`);
  redirect(`/office/media/moderation?notice=${encodeURIComponent(status === 'Resolved' ? 'Report resolved.' : 'Report dismissed.')}`);
}

export async function reviewStoryCommentReport(formData: FormData) {
  const reportId = read(formData, 'reportId');
  const status = read(formData, 'status');
  const resolutionNote = read(formData, 'resolutionNote').slice(0, 500);
  if (!reportId || !REPORT_STATUSES.has(status)) return;

  const {supabase, profile} = await requireCommissioner();
  const db = supabase as any;
  const {data: report, error: reportError} = await db
    .from('launch_story_comment_reports')
    .select('id,story_id,comment_id,status')
    .eq('id', reportId)
    .maybeSingle();

  if (reportError || !report) redirect(`/office/media/moderation?error=${encodeURIComponent('Story report could not be loaded.')}`);
  if (report.status !== 'Pending') redirect(`/office/media/moderation?notice=${encodeURIComponent('That story report was already reviewed.')}`);

  const now = new Date().toISOString();
  const {error} = await db.from('launch_story_comment_reports').update({
    status,
    reviewed_at: now,
    reviewed_by_profile_id: profile.id,
    resolution_note: resolutionNote,
  }).eq('id', reportId).eq('status', 'Pending');

  if (error) redirect(`/office/media/moderation?error=${encodeURIComponent('Story report could not be updated.')}`);

  const {data: story} = await db.from('launch_stories').select('slug').eq('id', report.story_id).maybeSingle();
  revalidatePath('/office/media/moderation');
  if (story?.slug) revalidatePath(`/stories/${story.slug}`);
  redirect(`/office/media/moderation?notice=${encodeURIComponent(status === 'Resolved' ? 'Story report resolved.' : 'Story report dismissed.')}`);
}

async function requireCommissioner() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');
  const {data: profile} = await supabase.from('launch_profiles').select('id,role,status').eq('user_id', user.id).maybeSingle();
  if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') redirect('/account');
  return {supabase, profile};
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
