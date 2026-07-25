import {Footer, SiteHeader} from '@/components/SiteHeader';
import {ThemeToggle} from '@/components/ThemeToggle';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {LaunchPlayer, LaunchProfile, PlayerClaim} from '@/domain/launch/LaunchData';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {createPendingProfile, requestMagicLink, signOut, submitPlayerClaim} from './actions';
import styles from './Account.module.css';

type AccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountPage({searchParams}: AccountPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readParam(params.notice);
  const error = readParam(params.error);

  if (!hasSupabaseConfig()) {
    return (
      <main>
        <SiteHeader />
        <AccountShell notice={notice} error="Supabase is not configured for this environment.">
          <p className={styles.muted}>Add the Team Clash Supabase URL and publishable key before using league accounts.</p>
        </AccountShell>
        <Footer />
      </main>
    );
  }

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <SiteHeader />
        <AccountShell notice={notice} error={error}>
          <section className={styles.grid} aria-label="Sign in options">
            <article className={styles.panel}>
              <span className={styles.eyebrow}>Email link</span>
              <h2>Email</h2>
              <p>Yahoo, Outlook, and regular email addresses can sign in with a secure link.</p>
              <form className={styles.form} action={requestMagicLink}>
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" autoComplete="email" required />
                <button className={styles.primaryButton} type="submit">Send sign-in link</button>
              </form>
            </article>
          </section>
        </AccountShell>
        <Footer />
      </main>
    );
  }

  const repository = new SupabaseLaunchRepository(supabase);
  const [profile, claims, players] = await Promise.all([
    repository.getProfileByUserId(user.id),
    repository.getPlayerClaims(),
    repository.getPlayers(),
  ]);

  return (
    <main>
      <SiteHeader />
      <AccountShell notice={notice} error={error}>
        <section className={styles.accountBar} aria-label="Signed in account">
          <div>
            <span className={styles.eyebrow}>Signed in</span>
            <strong>{user.email}</strong>
          </div>
          <form action={signOut}>
            <button className={styles.secondaryButton} type="submit">Sign out</button>
          </form>
        </section>

        {profile ? (
          <MemberProfile profile={profile} claims={claims} players={players} />
        ) : (
          <CreateProfileForm fallbackName={getDisplayName(user.email, user.user_metadata?.name)} />
        )}
      </AccountShell>
      <Footer />
    </main>
  );
}

function AccountShell({
  children,
  error,
  notice,
}: {
  children: React.ReactNode;
  error?: string;
  notice?: string;
}) {
  return (
    <section className={styles.shell}>
      <div className="shell">
        <header className={styles.header}>
          <span className={styles.eyebrow}>League account</span>
          <h1>Join Team Clash</h1>
          <p>Sign in, create your league profile, and claim your player record for commissioner approval.</p>
        </header>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        {children}
      </div>
    </section>
  );
}

function CreateProfileForm({fallbackName}: {fallbackName: string}) {
  return (
    <article className={styles.panel}>
      <span className={styles.eyebrow}>Step 1</span>
      <h2>Create profile</h2>
      <p>This is your website account record. The commissioner will approve it before league tools unlock.</p>
      <form className={styles.form} action={createPendingProfile}>
        <label htmlFor="displayName">Your name</label>
        <input id="displayName" name="displayName" defaultValue={fallbackName} autoComplete="name" required />
        <button className={styles.primaryButton} type="submit">Create league profile</button>
      </form>
    </article>
  );
}

function MemberProfile({
  claims,
  players,
  profile,
}: {
  claims: PlayerClaim[];
  players: LaunchPlayer[];
  profile: LaunchProfile;
}) {
  const latestClaim = claims[0];
  const linkedPlayer = players.find((player) => player.id === profile.playerId);
  const canSubmitClaim = !latestClaim || ['Rejected', 'Cancelled'].includes(latestClaim.status);

  return (
    <section className={styles.grid}>
      <article className={styles.panel}>
        <span className={styles.eyebrow}>Profile status</span>
        <h2>{profile.displayName}</h2>
        <dl className={styles.statusList}>
          <div>
            <dt>Status</dt>
            <dd>{profile.status}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{profile.role}</dd>
          </div>
          <div>
            <dt>Player</dt>
            <dd>{linkedPlayer?.name ?? 'Not linked yet'}</dd>
          </div>
        </dl>
      </article>

      <article className={styles.panel}>
        <span className={styles.eyebrow}>Step 2</span>
        <h2>Claim player</h2>
        {latestClaim ? (
          <p className={styles.claimState}>Latest claim: <strong>{latestClaim.submittedName}</strong> is {latestClaim.status}.</p>
        ) : (
          <p>Choose your imported player record or send your name for commissioner matching.</p>
        )}
        {canSubmitClaim ? (
          <form className={styles.form} action={submitPlayerClaim}>
            <label htmlFor="requestedPlayerId">Imported player record</label>
            <select id="requestedPlayerId" name="requestedPlayerId" defaultValue="">
              <option value="">I do not see myself yet</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}{player.pdgaNumber ? ` - PDGA ${player.pdgaNumber}` : ''}
                </option>
              ))}
            </select>
            <label htmlFor="submittedName">Your player name</label>
            <input id="submittedName" name="submittedName" defaultValue={profile.displayName} required />
            <label htmlFor="submittedPdgaNumber">PDGA number</label>
            <input id="submittedPdgaNumber" name="submittedPdgaNumber" inputMode="numeric" />
            <button className={styles.primaryButton} type="submit">Send claim</button>
          </form>
        ) : (
          <p className={styles.muted}>The commissioner needs to review this claim before another one is submitted.</p>
        )}
      </article>

      <article className={styles.panel}>
        <span className={styles.eyebrow}>Display</span>
        <h2>Theme</h2>
        <p>Choose how Team Clash looks on this device.</p>
        <div className={styles.themeAction}>
          <ThemeToggle />
        </div>
      </article>
    </section>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getDisplayName(email: string | undefined, metadataName: unknown): string {
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return email?.split('@')[0] ?? '';
}
