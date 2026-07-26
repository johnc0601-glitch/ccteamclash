import {Footer, SiteHeader} from '@/components/SiteHeader';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {updatePassword} from '../actions';
import styles from '../Account.module.css';

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({searchParams}: ResetPasswordPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = readParam(params.error);
  const notice = readParam(params.notice);
  let hasSession = false;

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    hasSession = Boolean(data.user);
  }

  return (
    <main>
      <SiteHeader />
      <section className={styles.shell}>
        <div className="shell">
          <header className={styles.header}>
            <span className={styles.eyebrow}>League account</span>
            <h1>Reset password</h1>
            <p>Choose a new password for your Team Clash account.</p>
          </header>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <section className={styles.grid} aria-label="Password reset">
            <article className={styles.panel}>
              <span className={styles.eyebrow}>New password</span>
              <h2>Password</h2>
              {hasSession ? (
                <form className={styles.form} action={updatePassword}>
                  <label htmlFor="password">New password</label>
                  <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button className={styles.primaryButton} type="submit">Update password</button>
                </form>
              ) : (
                <p className={styles.muted}>Request a password reset from the Account page, then open the email link.</p>
              )}
            </article>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
