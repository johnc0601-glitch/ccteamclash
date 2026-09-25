'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

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
    match_reminders: false,
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


export async function queueTestNotification() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile || profile.status !== 'Approved') redirect('/account');

  const admin = createAdminClient() as any;
  const {count, error: subscriptionError} = await admin
    .from('launch_push_subscriptions')
    .select('id', {count: 'exact', head: true})
    .eq('profile_id', profile.id)
    .eq('enabled', true);

  if (subscriptionError || !count) {
    redirect('/account/notifications?error=' + encodeURIComponent('Enable notifications on this device before sending a test.'));
  }

  const sourceId = crypto.randomUUID();
  const {error} = await admin.from('launch_notification_outbox').insert({
    profile_id: profile.id,
    category: 'matchday_open',
    title: 'Team Clash notifications are working',
    body: 'This is a staging test from your installed Team Clash preview.',
    url: '/account/notifications',
    source_type: 'self_test',
    source_id: sourceId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  if (error) {
    console.error('Test notification could not be queued.', {
      profileId: profile.id,
      error: error.message,
    });
    redirect('/account/notifications?error=' + encodeURIComponent('Test notification could not be queued.'));
  }

  redirect('/account/notifications?notice=' + encodeURIComponent('Test notification queued. It should arrive within about two minutes.'));
}
