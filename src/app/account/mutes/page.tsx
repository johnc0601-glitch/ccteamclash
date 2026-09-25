import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {unmuteMember} from '@/app/social/muteActions';
import {AccountPageLayout} from '../AccountPageLayout';
import styles from '../Account.module.css';

export default async function MutedMembersPage() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || profile.status !== 'Approved') redirect('/account');

  const {data: muteRows} = await (supabase as any)
    .from('launch_profile_mutes')
    .select('muted_profile_id,created_at')
    .eq('muter_profile_id', profile.id)
    .order('created_at', {ascending: false});

  const ids = (muteRows ?? []).map((row: {muted_profile_id: string}) => row.muted_profile_id);
  const {data: profiles} = ids.length
    ? await supabase.from('launch_profiles').select('id,display_name').in('id', ids)
    : {data: []};

  const names = new Map((profiles ?? []).map((row) => [row.id, row.display_name || 'Member']));

  return (
    <AccountPageLayout
      title="Muted members"
      description="Muted members are hidden only from your social conversations. They remain visible in official rosters, CI, results, and league history."
      narrow
    >
      <article className={styles.panel}>
        <span className={styles.eyebrow}>Social preferences</span>
        <h2>{ids.length ? ids.length + ' muted ' + (ids.length === 1 ? 'member' : 'members') : 'No muted members'}</h2>

        {ids.length ? (
          <div className={styles.muteList}>
            {(muteRows ?? []).map((row: {muted_profile_id: string; created_at: string}) => (
              <div key={row.muted_profile_id}>
                <div>
                  <strong>{names.get(row.muted_profile_id) ?? 'Member'}</strong>
                  <span>Social posts and comments hidden</span>
                </div>
                <form action={unmuteMember}>
                  <input type="hidden" name="targetProfileId" value={row.muted_profile_id} />
                  <input type="hidden" name="returnTo" value="/account/mutes" />
                  <button className={styles.secondaryButton} type="submit">Unmute</button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.muted}>Use Mute beside another member's Clubhouse, Matchday, or story content to hide their social activity from your view.</p>
        )}

        <Link className={styles.cancelLink} href="/account">Back to My Account</Link>
      </article>
    </AccountPageLayout>
  );
}
