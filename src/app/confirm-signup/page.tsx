import {AccountPageLayout, readAccountParam} from '@/app/account/AccountPageLayout';
import {SubmitButton} from '@/app/account/AuthFormControls';
import styles from '@/app/account/Account.module.css';
import {confirmSignupEmail} from './actions';
import {requiredConfirmationProjectRef, validateSignupConfirmationUrl} from './confirmationUrl';

type ConfirmSignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfirmSignupPage({searchParams}: ConfirmSignupPageProps) {
  const params = searchParams ? await searchParams : {};
  const confirmationUrl = readAccountParam(params.confirmation_url) ?? '';
  const suppliedError = readAccountParam(params.error);
  const validation = validateSignupConfirmationUrl({
    confirmationUrl,
    requiredProjectRef: requiredConfirmationProjectRef(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  const error = suppliedError ?? (validation.ok ? undefined : validation.message);

  return (
    <AccountPageLayout
      description="Complete one final step to activate your Team Clash account."
      error={error}
      narrow
      title="Confirm your email"
    >
      <article className={styles.panel}>
        {validation.ok ? (
          <>
            <span className={styles.eyebrow}>Email ready</span>
            <h2>Confirm your address</h2>
            <p>
              Click the button below to confirm your email address. The secure confirmation is used only after
              you choose to continue.
            </p>
            <form className={styles.form} action={confirmSignupEmail}>
              <input name="confirmationUrl" type="hidden" value={validation.url} />
              <SubmitButton pendingLabel="Confirming email...">Confirm Email</SubmitButton>
            </form>
          </>
        ) : (
          <p className={styles.muted}>Request a new confirmation email from the Team Clash account page.</p>
        )}
      </article>
    </AccountPageLayout>
  );
}
