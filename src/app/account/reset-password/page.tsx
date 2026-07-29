import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import {PasswordField, SubmitButton} from '../AuthFormControls';
import {updatePassword} from '../actions';
import styles from '../Account.module.css';

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({searchParams}: ResetPasswordPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = readAccountParam(params.error);
  const notice = readAccountParam(params.notice);
  let hasSession = false;

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    hasSession = Boolean(data.user);
  }

  return (
    <AccountPageLayout
      description="Choose a new password for your Team Clash account."
      error={error}
      narrow
      notice={notice}
      title="New password"
    >
      <article className={styles.panel}>
        {hasSession ? (
          <form className={styles.form} action={updatePassword}>
            <PasswordField
              autoComplete="new-password"
              id="password"
              label="New password"
              minLength={8}
              name="password"
            />
            <PasswordField
              autoComplete="new-password"
              id="confirmPassword"
              label="Confirm password"
              minLength={8}
              name="confirmPassword"
            />
            <SubmitButton pendingLabel="Updating password...">Update password</SubmitButton>
          </form>
        ) : (
          <p className={styles.muted}>Request a new password reset link, then open it from your email.</p>
        )}
      </article>
    </AccountPageLayout>
  );
}
