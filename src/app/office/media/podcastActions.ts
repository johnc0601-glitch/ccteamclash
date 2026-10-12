'use server';

import {updateTag, revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';

export async function setPodcastEpisodeIndicator(formData: FormData) {
  const intent = formData.get('intent');
  if (intent !== 'activate' && intent !== 'clear') {
    redirect('/office/media?episodeError=Invalid+episode+action');
  }

  // Both the server action and the database RLS require an approved commissioner.
  const {supabase} = await requireStoryCommissioner();
  const now = new Date().toISOString();
  const {data, error} = await (supabase as any)
    .from('launch_podcast_status')
    .update({new_episode_at: intent === 'activate' ? now : null, updated_at: now})
    .eq('id', 'clash-cast')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    redirect('/office/media?episodeError=Unable+to+update+podcast+indicator');
  }

  // Bust cached public reads immediately; the seven-day expiry itself is date-based.
  updateTag('podcast:status');
  revalidatePath('/office/media');
  revalidatePath('/');
  redirect(intent === 'activate'
    ? '/office/media?episodeNotice=New+episode+indicator+enabled+for+seven+days'
    : '/office/media?episodeNotice=New+episode+indicator+cleared');
}

/**
 * Save a specific Spotify episode; optionally mark it NEW for seven days.
 * Updating the title alone does not restart the NEW badge.
 */
export async function savePodcastEpisodeDetails(formData: FormData) {
  const intent = String(formData.get('episodeAction') || 'save');
  const title = String(formData.get('episodeTitle') || '').trim();
  const url = String(formData.get('episodeUrl') || '').trim();

  if (intent !== 'save' && intent !== 'announce') {
    redirect('/office/media?episodeError=Invalid+episode+action');
  }
  if (title.length > 140 || (!title && url)) {
    redirect('/office/media?episodeError=Enter+a+title+of+up+to+140+characters');
  }
  if (url && (url.length > 500 ||
    !/^https:\/\/open\.spotify\.com\/episode\/[a-zA-Z0-9]+(?:\?[^\s]*)?$/.test(url))) {
    redirect('/office/media?episodeError=Use+an+open.spotify.com%2Fepisode%2F+link');
  }
  if (intent === 'announce' && !title) {
    redirect('/office/media?episodeError=Enter+an+episode+title+before+marking+new');
  }

  const {supabase} = await requireStoryCommissioner();
  const now = new Date().toISOString();
  const changes: Record<string, string | null> = {
    latest_episode_title: title || null,
    latest_episode_url: url || null,
    updated_at: now,
  };
  if (intent === 'announce') changes.new_episode_at = now;

  const {data, error} = await (supabase as any)
    .from('launch_podcast_status')
    .update(changes)
    .eq('id', 'clash-cast')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('[podcast] Latest episode update failed.', error);
    redirect('/office/media?episodeError=Unable+to+save+latest+episode');
  }

  updateTag('podcast:status');
  revalidatePath('/office/media');
  revalidatePath('/');
  redirect(intent === 'announce'
    ? '/office/media?episodeNotice=Episode+saved+and+NEW+indicator+enabled+for+seven+days'
    : '/office/media?episodeNotice=Latest+episode+saved');
}
