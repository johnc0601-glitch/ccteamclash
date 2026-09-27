'use server';

import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

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
    category: 'match_reminders',
    title: 'Team Clash notifications are working',
    body: 'Your Friday attendance reminder is ready.',
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
