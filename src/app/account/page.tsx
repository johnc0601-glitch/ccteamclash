import Link from 'next/link';
import {PlayerRecordSelect} from '@/components/launch/PlayerRecordSelect';
import {ThemeToggle} from '@/components/ThemeToggle';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {LaunchPlayer, LaunchProfile, PlayerClaim} from '@/domain/launch/LaunchData';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {
  createPendingProfile,
  signInWithPassword,
  signOut,
  submitPlayerClaim,
  submitSeasonApplication,
  updateProfileName,
} from './actions';
import {AccountPageLayout, readAccountParam} from './AccountPageLayout';
import {PasswordField, SubmitButton} from './AuthFormControls';
import styles from './Account.module.css';

type AccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RegistrationSeason = {id: string; name: string};
type RegistrationTeam = {id: string; name: string};
type RegistrationApplication = {
  status: string;
  requested_team_id: string;
  player_type: string;
  gender: string;
  played_before: boolean;
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
            <Link className={styles.secondaryActionLink} href="/account/create">Register</Link>
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

  let registrationSeason: RegistrationSeason | null = null;
  let registrationTeams: RegistrationTeam[] = [];
  let application: RegistrationApplication | null = null;

  if (profile) {
    const {data: openSeason} = await supabase
      .from('launch_seasons')
      .select('id, name')
      .eq('registration_open', true)
      .eq('active', true)
      .eq('published', true)
      .order('year', {ascending: false})
      .limit(1)
      .maybeSingle();
    registrationSeason = openSeason;

    if (registrationSeason) {
      // These launch tables exist in the live database, but the checked-in
      // generated Supabase types are behind the current launch schema.
      const launchSupabase = supabase as any;
      const [{data: existingApplication}, {data: seasonTeams}] = await Promise.all([
        launchSupabase
          .from('launch_player_applications')
          .select('status, requested_team_id, player_type, gender, played_before')
          .eq('profile_id', profile.id)
          .eq('season_id', registrationSeason.id)
          .maybeSingle(),
        launchSupabase
          .from('launch_season_teams')
          .select('team_id')
          .eq('season_id', registrationSeason.id),
      ]);
      application = existingApplication as RegistrationApplication | null;

      const teamIds = ((seasonTeams ?? []) as {team_id: string}[]).map((item) => item.team_id);
      if (teamIds.length) {
        const {data: teamRows} = await supabase
          .from('launch_teams')
          .select('id, name')
          .in('id', teamIds)
          .order('name');
        registrationTeams = teamRows ?? [];
      }
    }
  }

  return (
    <AccountPageLayout
      description="Manage your registration, profile, league history, and access."
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
            registrationSeason={registrationSeason}
            registrationTeams={registrationTeams}
            application={application}
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
  registrationSeason,
  registrationTeams,
  application,
}: {
  claims: PlayerClaim[];
  players: LaunchPlayer[];
  profile: LaunchProfile;
  registrationSeason: RegistrationSeason | null;
  registrationTeams: RegistrationTeam[];
  application: RegistrationApplication | null;
}) {
  const latestClaim = claims[0];
  const linkedPlayer = players.find((player) => player.id === profile.playerId);
  const canSubmitClaim = !latestClaim || ['Rejected', 'Cancelled'].includes(latestClaim.status);
  const requestedTeam = registrationTeams.find((team) => team.id === application?.requested_team_id);

  return (
    <section className={styles.grid}>
      {registrationSeason ? (
        <article className={styles.panel}>
          <span className={styles.eyebrow}>Season registration</span>
          <h2>{registrationSeason.name}</h2>
          {application ? (
            <div className={styles.connected}>
              <strong>{application.status}</strong>
              {requestedTeam?.name ?? application.requested_team_id} · {application.player_type} · {application.gender}
              {application.played_before ? ' · Returning player' : ' · New player'}
            </div>
          ) : (
            <>
              <p className={styles.linkingNote}>Complete this form to enter the commissioner approval queue.</p>
              <form className={styles.form} action={submitSeasonApplication}>
                <input name="seasonId" type="hidden" value={registrationSeason.id} />
                <label htmlFor="accountRequestedTeam">Requested team</label>
                <select id="accountRequestedTeam" name="requestedTeamId" required defaultValue="">
                  <option value="" disabled>Choose a team</option>
                  {registrationTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
                <label htmlFor="accountPlayerType">Player type</label>
                <select id="accountPlayerType" name="playerType" required defaultValue="Adult">
                  <option value="Adult">Adult</option>
                  <option value="Junior">Junior</option>
                </select>
                <label htmlFor="accountGender">Division</label>
                <select id="accountGender" name="gender" required defaultValue="">
                  <option value="" disabled>Choose division</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <label htmlFor="accountPlayedBefore">Have you played Coastal Clash before?</label>
                <select id="accountPlayedBefore" name="playedBefore" required defaultValue="">
                  <option value="" disabled>Choose one</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                <button className={styles.primaryButton} type="submit">Submit registration</button>
              </form>
            </>
          )}
        </article>
      ) : null}

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
        <form className={styles.form} action={updateProfileName}>
          <label htmlFor="profileDisplayName">Display name</label>
          <input
            id="profileDisplayName"
            name="displayName"
            defaultValue={profile.displayName}
            autoComplete="name"
            required
          />
          <button className={styles.secondaryButton} type="submit">Save profile</button>
        </form>
        {profile.role === 'Captain' ? (
          <Link className={styles.actionLink} href="/captain">Open Captain Home</Link>
        ) : null}
        {profile.role === 'Commissioner' ? (
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
            <p className={styles.muted}>First season? No action is needed here. Approval will create your player record.</p>
            {latestClaim ? (
              <p className={styles.claimState}>
                Your request to connect <strong>{latestClaim.submittedName}</strong> is {latestClaim.status}.
              </p>
            ) : null}
          </>
        )}
        {!linkedPlayer && canSubmitClaim ? (
          <form className={styles.form} action={submitPlayerClaim}>
            <label htmlFor="requestedPlayerId">What name did you play under before?</label>
            <PlayerRecordSelect
              emptyLabel="Choose your previous league name"
              id="requestedPlayerId"
              name="requestedPlayerId"
              players={players}
              searchLabel="Search previous league names"
              searchPlaceholder="Type your old name"
              required
            />
            <label htmlFor="submittedName">What name should we show now?</label>
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

function getDisplayName(email: string | undefined, metadataName: unknown): string {
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return email?.split('@')[0] ?? '';
}
