import Link from 'next/link';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import styles from '../Account.module.css';

type CheckEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckEmailPage({searchParams}: CheckEmailPageProps) {
  const params = searchParams ? await searchParams : {};
  const email = readAccountParam(params.email);
  const error = readAccountParam(params.error);

  return (
    <AccountPageLayout
      description="Your account has been created, but you must confirm your email before registration can continue."
      error={error}
      narrow
      title="Check your email"
    >
      <article className={styles.panel}>
        <span className={styles.eyebrow}>One step left</span>
        <h2>Open the confirmation email we sent you</h2>
        <p className={styles.muted}>
          {email
            ? <>We sent a confirmation link to <strong>{email}</strong>. Open that email and click the confirmation link.</>
            : 'Open the confirmation email from Team Clash and click the confirmation link.'}
        </p>
        <p className={styles.linkingNote}>
          After you confirm your email, we will bring you back to finish your player record and team registration. Do not create another account.
        </p>
        <Link className={styles.secondaryActionLink} href="/account">Back to sign in</Link>
      </article>
    </AccountPageLayout>
  );
}
