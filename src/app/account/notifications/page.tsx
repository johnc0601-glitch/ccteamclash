import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {PushPermissionCard} from '@/components/notifications/PushPermissionCard';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import {saveNotificationPreferences} from './actions';
import styles from '../Account.module.css';

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const DEFAULTS = {
  match_reminders: true,
  roster_deadline: true,
  matchday_open: true,
  results_ci: true,
  captain_announcements: true,
  league_stories: false,
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

  const [{data: preferences}, {count: activeDeviceCount}] = await Promise.all([
    (supabase as any)
      .from('launch_notification_preferences')
      .select('match_reminders,roster_deadline,matchday_open,results_ci,captain_announcements,league_stories')
      .eq('profile_id', profile.id)
      .maybeSingle(),
    (supabase as any)
      .from('launch_push_subscriptions')
      .select('id', {count:'exact', head:true})
      .eq('profile_id', profile.id)
      .eq('enabled', true),
  ]);

  const prefs = {...DEFAULTS, ...(preferences ?? {})};

  return (
    <AccountPageLayout
      title="Notifications"
      description="Choose the Team Clash events worth interrupting you for. Normal site activity stays quiet."
      notice={readAccountParam(params.notice)}
      error={readAccountParam(params.error)}
      narrow
    >
      <article className={styles.panel}>
        <span className={styles.eyebrow}>This device</span>
        <h2>Push alerts</h2>
        <PushPermissionCard activeDeviceCount={activeDeviceCount ?? 0} />
      </article>

      <article className={styles.panel} style={{marginTop:'16px'}}>
        <span className={styles.eyebrow}>Alert types</span>
        <h2>What matters</h2>
        <form className={styles.notificationForm} action={saveNotificationPreferences}>
          <NotificationToggle name="matchReminders" checked={prefs.match_reminders} title="Match reminder" detail="A useful reminder before your next Clash." />
          <NotificationToggle name="rosterDeadline" checked={prefs.roster_deadline} title="Roster deadline" detail="Availability or captain roster deadlines that need action." />
          <NotificationToggle name="matchdayOpen" checked={prefs.matchday_open} title="Matchday" detail="When the Matchday experience becomes current for your team." />
          <NotificationToggle name="resultsCi" checked={prefs.results_ci} title="Results & CI" detail="Published match results and meaningful CI updates." />
          <NotificationToggle name="captainAnnouncements" checked={prefs.captain_announcements} title="Captain announcements" detail="Important notices from your team captain." />
          <NotificationToggle name="leagueStories" checked={prefs.league_stories} title="League stories" detail="Optional new Team Clash stories." />
          <button className={styles.primaryButton} type="submit">Save notification preferences</button>
        </form>
        <Link className={styles.cancelLink} href="/account">Back to My Account</Link>
      </article>
    </AccountPageLayout>
  );
}

function NotificationToggle({
  name,
  checked,
  title,
  detail,
}: {
  name: string;
  checked: boolean;
  title: string;
  detail: string;
}) {
  return (
    <label className={styles.notificationToggle}>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <input type="checkbox" name={name} defaultChecked={checked} />
    </label>
  );
}
