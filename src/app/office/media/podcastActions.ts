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
