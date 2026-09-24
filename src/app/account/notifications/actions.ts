'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export async function saveNotificationPreferences(formData: FormData) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile || profile.status !== 'Approved') redirect('/account');

  const payload = {
    profile_id: profile.id,
    match_reminders: formData.has('matchReminders'),
    roster_deadline: formData.has('rosterDeadline'),
    matchday_open: formData.has('matchdayOpen'),
    results_ci: formData.has('resultsCi'),
    captain_announcements: formData.has('captainAnnouncements'),
    league_stories: formData.has('leagueStories'),
    updated_at: new Date().toISOString(),
  };

  const {error} = await (supabase as any)
    .from('launch_notification_preferences')
    .upsert(payload, {onConflict: 'profile_id'});

  if (error) {
    redirect('/account/notifications?error=' + encodeURIComponent('Notification preferences could not be saved.'));
  }

  revalidatePath('/account/notifications');
  redirect('/account/notifications?notice=' + encodeURIComponent('Notification preferences saved.'));
}
