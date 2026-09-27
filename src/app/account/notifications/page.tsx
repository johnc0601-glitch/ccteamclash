import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {PushPermissionCard} from '@/components/notifications/PushPermissionCard';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import {queueTestNotification} from './actions';
import styles from '../Account.module.css';

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NotificationsPage({searchParams}: Props) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile || profile.status !== 'Approved') redirect('/account');

  const {count: activeDeviceCount} = await (supabase as any)
    .from('launch_push_subscriptions')
    .select('id', {count:'exact', head:true})
    .eq('profile_id', profile.id)
    .eq('enabled', true);

  return (
    <AccountPageLayout
      appBackHref="/account"
      appBackLabel="Me"
      title="Notifications"
      description="One useful reminder for the first release."
      notice={readAccountParam(params.notice)}
      error={readAccountParam(params.error)}
      narrow
    >
      <article className={styles.panel}>
        <span className={styles.eyebrow}>This device</span>
        <h2>Push alerts</h2>
        <PushPermissionCard activeDeviceCount={activeDeviceCount ?? 0} />
        {(activeDeviceCount ?? 0) > 0 ? (
          <form action={queueTestNotification} className={styles.pushTestForm}>
            <button className={styles.secondaryButton} type="submit">Send test notification</button>
            <span>Sends a real push to confirm this device is ready.</span>
          </form>
        ) : null}
      </article>

      <article className={styles.panel} style={{marginTop:'16px'}}>
        <span className={styles.eyebrow}>First pass</span>
        <h2>Attendance reminder</h2>
        <p>
          Friday at 9:00 AM Eastern, Team Clash will send you a reminder only if you have not
          marked your attendance for that week&apos;s match.
        </p>
        <p className={styles.muted}>
          If you have already selected Playing or Not Playing, nothing is sent. Attendance still
          closes at noon Friday.
        </p>
        <Link className={styles.cancelLink} href="/account">Back to My Account</Link>
      </article>
    </AccountPageLayout>
  );
}
