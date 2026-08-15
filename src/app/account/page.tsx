import Link from 'next/link';
import {PlayerRecordSelect} from '@/components/launch/PlayerRecordSelect';
import {ThemeToggle} from '@/components/ThemeToggle';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {LaunchPlayer, LaunchProfile, PlayerClaim} from '@/domain/launch/LaunchData';
import {
  resolveLaunchProfileState,
  type LaunchProfileState,
} from '@/domain/launch/LaunchProfileState';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {
  createPendingProfile,
  signInWithPassword,
  signOut,
  submitPlayerClaim,
  updateProfileName,
} from './actions';
import {AccountPageLayout, readAccountParam} from './AccountPageLayout';
import {PasswordField, SubmitButton} from './AuthFormControls';
import styles from './Account.module.css';

type AccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountPage({searchParams}: AccountPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readAccountParam(params.notice);
  const error = readAccountParam(params.error);

  if (!hasSupabaseConfig()) {
    return (
      <AccountPageLayout
        description="Sign in to manage your Team Clash account."
        error="Supabase is not configured for this environment."
        narrow
        notice={notice}
        title="Sign in"
      >
        <p className={styles.muted}>Add the Team Clash Supabase URL and publishable key before using league accounts.</p>
      </AccountPageLayout>
    );
  }

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  const repository = new SupabaseLaunchRepository(supabase);

  if (!user) {
    return (
      <AccountPageLayout
        description="Use your email and password to open your league account."
        error={error}
        narrow
        notice={notice}
        title="Sign in"
      >
        <article className={styles.panel}>
          <form className={styles.form} action={signInWithPassword}>
            <label htmlFor="signinEmail">Email address</label>
            <input id="signinEmail" name="email" type="email" autoComplete="email" required />
            <PasswordField
              autoComplete="current-password"
              id="signinPassword"
              label="Password"
              name="password"
            />
            <Link className={styles.forgotLink} href="/account/forgot-password">Forgot password?</Link>
            <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
          </form>
          <div className={styles.accountPrompt}>
            <span>New to Team Clash?</span>
            <Link className={styles.secondaryActionLink} href="/account/create">Create an account</Link>
          </div>
        </article>
      </AccountPageLayout>
    );
  }

  const [profile, claims, players] = await Promise.all([
    repository.getProfileByUserId(user.id),
    repository.getPlayerClaims(),
    repository.getPlayers(),
  ]);

  return (
    <AccountPageLayout
      description="Manage your profile, league history, and access."
      error={error}
      notice={notice}
      title="My account"
    >
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
          <MemberProfile
            profile={profile}
            claims={claims.filter((claim) => claim.profileId === profile.id).slice().reverse()}
            players={players}
          />
        ) : (
          <CreateProfileForm
            fallbackName={getDisplayName(user.email, user.user_metadata?.name)}
            players={players}
          />
        )}
    </AccountPageLayout>
  );
}

function CreateProfileForm({fallbackName, players}: {fallbackName: string; players: LaunchPlayer[]}) {
  return (
    <article className={styles.panel}>
      <span className={styles.eyebrow}>Finish account setup</span>
      <h2>Connect your history</h2>
      <p className={styles.linkingNote}>
        Choose the name you used in previous seasons. This connects your wins, losses, rankings, and team history.
      </p>
      <form className={styles.form} action={createPendingProfile}>
        <label htmlFor="profileRequestedPlayerId">What name did you play under before?</label>
        <PlayerRecordSelect
          emptyLabel="Choose your previous league name"
          id="profileRequestedPlayerId"
          name="requestedPlayerId"
          players={players}
          searchLabel="Search previous league names"
          searchPlaceholder="Type your old name"
          required
        />
        <label htmlFor="displayName">What name should we show now?</label>
        <input id="displayName" name="displayName" defaultValue={fallbackName} autoComplete="name" required />
        <button className={styles.primaryButton} type="submit">Connect my league history</button>
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
  const profileState = resolveLaunchProfileState(profile);
  const canManageHistory = profileState === 'pending_player' || profileState === 'approved_player';
  const canSubmitClaim = canManageHistory
    && (!latestClaim || ['Rejected', 'Cancelled'].includes(latestClaim.status));

  return (
    <section className={styles.grid}>
      <article className={styles.panel}>
        <span className={styles.eyebrow}>Profile status</span>
        <h2>{profile.displayName}</h2>
        <ProfileStateMessage state={profileState} />
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
        <form className={styles.form} action={updateProfileName}>
          <label htmlFor="profileDisplayName">First Name Last Name</label>
          <input
            id="profileDisplayName"
            name="displayName"
            defaultValue={profile.displayName}
            placeholder="First Name Last Name"
            autoComplete="name"
            required
          />
          <button className={styles.secondaryButton} type="submit">Save profile</button>
        </form>
        {profileState === 'approved_captain' ? (
          <Link className={styles.actionLink} href="/captain">Open Captain Home</Link>
        ) : null}
        {profileState === 'approved_commissioner' ? (
          <Link className={styles.actionLink} href="/office">Open Commissioner Office</Link>
        ) : null}
      </article>

      <article className={styles.panel}>
        {linkedPlayer ? (
          <>
            <span className={styles.eyebrow}>League history</span>
            <h2>History connected</h2>
            <div className={styles.connected}>
              <strong>{linkedPlayer.name}</strong>
              Your past results, rankings, and team history are connected to this account.
            </div>
          </>
        ) : (
          <>
            <span className={styles.eyebrow}>Previous player</span>
            <h2>Connect your history</h2>
            <p className={styles.linkingNote}>
              Played in Team Clash before? Choose your previous name to restore your results, rankings, and team history.
            </p>
            <p className={styles.muted}>First season? No action is needed here. A commissioner can add you to the league directory.</p>
            {latestClaim ? (
              <p className={styles.claimState}>
                {latestClaim.status === 'Pending' ? (
                  <>Your claim for <strong>{latestClaim.submittedName}</strong> is awaiting approval.</>
                ) : (
                  <>Your request to connect <strong>{latestClaim.submittedName}</strong> is {latestClaim.status}.</>
                )}
              </p>
            ) : profileState === 'pending_player' ? (
              <p className={styles.claimState}>
                New player profile pending. No player claim is required; await league assignment and approval.
              </p>
            ) : null}
          </>
        )}
        {!linkedPlayer && canSubmitClaim ? (
          <form className={styles.form} action={submitPlayerClaim}>
            <label htmlFor="requestedPlayerId">First Name Last Name</label>
            <PlayerRecordSelect
              emptyLabel="Choose your previous league name"
              id="requestedPlayerId"
              name="requestedPlayerId"
              players={players}
              searchLabel="Search previous league names"
              searchPlaceholder="First Name Last Name"
              required
            />
            <label htmlFor="submittedName">First Name Last Name</label>
            <input id="submittedName" name="submittedName" defaultValue={profile.displayName} required />
            <label htmlFor="submittedPdgaNumber">PDGA number</label>
            <input id="submittedPdgaNumber" name="submittedPdgaNumber" inputMode="numeric" />
            <button className={styles.primaryButton} type="submit">Connect my league history</button>
          </form>
        ) : !linkedPlayer ? (
          <p className={styles.muted}>The commissioner needs to review this claim before another one is submitted.</p>
        ) : null}
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

function ProfileStateMessage({state}: {state: LaunchProfileState}) {
  const message = getProfileStateMessage(state);
  return message ? <p className={styles.claimState}>{message}</p> : null;
}

function getProfileStateMessage(state: LaunchProfileState): string | undefined {
  if (state === 'pending_player') return 'Your Player profile is pending league approval.';
  if (state === 'pending_captain') return 'Captain tools will become available after approval.';
  if (state === 'pending_commissioner') return 'Commissioner tools will become available after approval.';
  if (state === 'approved_player') return 'Your Player profile is approved.';
  if (state === 'approved_captain') return 'Your Captain profile is approved.';
  if (state === 'approved_commissioner') return 'Your Commissioner profile is approved.';
  if (state === 'rejected') return 'This profile was not approved. Privileged tools are unavailable.';
  if (state === 'suspended') return 'This profile is suspended. Privileged tools are unavailable.';
  return undefined;
}

function getDisplayName(email: string | undefined, metadataName: unknown): string {
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return email?.split('@')[0] ?? '';
}
