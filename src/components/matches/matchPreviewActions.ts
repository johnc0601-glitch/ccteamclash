'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

const MAX_EXCERPT_LENGTH = 2000;
const MAX_STORY_URL_LENGTH = 600;

export async function saveMatchPreview(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const excerpt = read(formData, 'excerpt');
  const storyUrl = read(formData, 'storyUrl');

  if (!matchId) return;
  if (excerpt.length > MAX_EXCERPT_LENGTH || storyUrl.length > MAX_STORY_URL_LENGTH) {
    redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('Match preview is too long.')}`);
  }

  const {supabase, profile} = await requireCommissioner(matchId);
  const db = supabase as any;
  const {data: match} = await supabase.from('launch_schedule_matches').select('id').eq('id', matchId).maybeSingle();
  if (!match) redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('Match could not be found.')}`);

  if (!excerpt) {
    const {error} = await db.from('launch_match_previews').delete().eq('match_id', matchId);
    if (error) redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('Match preview could not be removed.')}`);
  } else {
    const {error} = await db.from('launch_match_previews').upsert({
      match_id: matchId,
      excerpt,
      story_url: storyUrl || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }, {onConflict: 'match_id'});
    if (error) redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('Match preview could not be saved.')}`);
  }

  revalidatePath(`/matches/${matchId}`);
}

async function requireCommissioner(matchId: string) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect(`/account?error=${encodeURIComponent('Commissioner sign-in required.')}`);

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,role,status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') {
    redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('Commissioner access is required.')}`);
  }

  return {supabase, profile};
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
