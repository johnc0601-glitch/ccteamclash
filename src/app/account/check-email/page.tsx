import Link from 'next/link';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import styles from '../Account.module.css';
import {resendSignupConfirmation} from './actions';

type CheckEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckEmailPage({searchParams}: CheckEmailPageProps) {
  const params = searchParams ? await searchParams : {};
  const email = readAccountParam(params.email);
  const error = readAccountParam(params.error);
  const notice = readAccountParam(params.notice);

  return (
    <AccountPageLayout
      description="Your account has been created, but you must confirm your email before registration can continue."
      error={error}
      narrow
      notice={notice}
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
          After you open the email, you will see one final Confirm email address button. That extra click prevents email security scanners from using your confirmation link before you do.
        </p>
        {email ? (
          <form action={resendSignupConfirmation} className={styles.form}>
            <input name="email" type="hidden" value={email} />
            <button className={styles.primaryButton} type="submit">Send a new confirmation email</button>
          </form>
        ) : null}
        <Link className={styles.secondaryActionLink} href="/account">Back to sign in</Link>
      </article>
    </AccountPageLayout>
  );
}
