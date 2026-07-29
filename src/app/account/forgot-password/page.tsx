import Link from 'next/link';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import {SubmitButton} from '../AuthFormControls';
import {requestPasswordReset} from '../actions';
import styles from '../Account.module.css';

type ForgotPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({searchParams}: ForgotPasswordPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = readAccountParam(params.error);
  const notice = readAccountParam(params.notice);

  return (
    <AccountPageLayout
      description="Enter your account email and we will send a secure password reset link."
      error={error}
      narrow
      notice={notice}
      title="Reset password"
    >
      <article className={styles.panel}>
        <form className={styles.form} action={requestPasswordReset}>
          <label htmlFor="resetEmail">Email address</label>
          <input id="resetEmail" name="email" type="email" autoComplete="email" required />
          <SubmitButton pendingLabel="Sending reset link...">Send reset link</SubmitButton>
        </form>
        <p className={styles.authAlternative}>
          <Link href="/account">Back to sign in</Link>
        </p>
      </article>
    </AccountPageLayout>
  );
}
