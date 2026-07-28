import Link from 'next/link';
import {redirect} from 'next/navigation';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import {PasswordField, SubmitButton} from '../AuthFormControls';
import {createLeagueAccount} from '../actions';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import styles from '../Account.module.css';

type CreateAccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreateAccountPage({searchParams}: CreateAccountPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = readAccountParam(params.error);
  const notice = readAccountParam(params.notice);

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    if (data.user) redirect('/account');
  }

  return (
    <AccountPageLayout
      description="Create your league login. You can connect previous Team Clash history after confirming your email."
      error={error}
      narrow
      notice={notice}
      title="Create account"
    >
      <article className={styles.panel}>
        <form className={styles.form} action={createLeagueAccount}>
          <label htmlFor="signupName">Your name</label>
          <input id="signupName" name="displayName" autoComplete="name" required />
          <label htmlFor="signupEmail">Email address</label>
          <input id="signupEmail" name="email" type="email" autoComplete="email" required />
          <PasswordField
            autoComplete="new-password"
            id="signupPassword"
            label="Create password"
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
          <SubmitButton pendingLabel="Creating account...">Create account</SubmitButton>
        </form>
        <p className={styles.authAlternative}>
          Already have an account? <Link href="/account">Sign in</Link>
        </p>
      </article>
    </AccountPageLayout>
  );
}
