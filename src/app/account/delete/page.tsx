import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {deleteOwnAccount} from '../actions';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import styles from '../Account.module.css';

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DeleteAccountPage({searchParams}: Props) {
  const params = searchParams ? await searchParams : {};
  const error = readAccountParam(params.error);
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account?error=Sign in before deleting your account.');

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('display_name,role,status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) redirect('/account?error=Your account profile could not be found.');

  return (
    <AccountPageLayout
      title="Delete account"
      description="Permanently remove your Team Clash website login and disconnect it from your league player record."
      error={error}
      narrow
    >
      <article className={`${styles.panel} ${styles.dangerPanel}`}>
        <span className={styles.eyebrow}>Permanent account action</span>
        <h2>What gets deleted</h2>
        <p>
          Your sign-in identity is deleted. Your account name is anonymized, captain/commissioner access is removed,
          and the account is disconnected from your player record.
        </p>

        <ul className={styles.dangerList}>
          <li><strong>Deleted:</strong> login/email identity and account access.</li>
          <li><strong>Anonymized:</strong> account display name and social author-name snapshots.</li>
          <li><strong>Cleared:</strong> pending registration identity details and personal reaction/read preferences.</li>
          <li><strong>Preserved:</strong> official player record, PDGA/CI history, rosters, match results, and league history.</li>
          <li><strong>Preserved:</strong> league media already used by Team Clash, with account ownership removed.</li>
        </ul>

        {profile.role === 'Commissioner' ? (
          <p className={styles.linkingNote}>
            Commissioner access will also be removed. Team Clash will block deletion only if this is the last approved commissioner account.
          </p>
        ) : null}

        <form className={styles.form} action={deleteOwnAccount}>
          <label htmlFor="deleteConfirmation">Type DELETE to confirm</label>
          <input
            id="deleteConfirmation"
            name="confirmation"
            autoComplete="off"
            spellCheck={false}
            required
            placeholder="DELETE"
          />
          <button className={styles.dangerButton} type="submit">Permanently delete my account</button>
        </form>

        <Link className={styles.cancelLink} href="/account">Cancel and return to My Account</Link>
      </article>
    </AccountPageLayout>
  );
}
