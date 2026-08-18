import Link from 'next/link';
import {PlayerRecordSelect} from '@/components/launch/PlayerRecordSelect';
import {ThemeToggle} from '@/components/ThemeToggle';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {LaunchPlayer, LaunchProfile} from '@/domain/launch/LaunchData';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {
  completePlayerSetup,
  signInWithPassword,
  signOut,
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

  const [profile, players] = await Promise.all([
    repository.getProfileByUserId(user.id),
    repository.getPlayers(),
  ]);

  let playedBefore: boolean | null = null;
  let registrationSeason: RegistrationSeason | null = null;
  let registrationTeams: RegistrationTeam[] = [];
  let application: RegistrationApplication | null = null;

  if (profile) {
    const launchSupabase = supabase as any;
    const {data: setupRow} = await launchSupabase
      .from('launch_profiles')
      .select('played_before')
      .eq('id', profile.id)
      .maybeSingle();
    playedBefore = typeof setupRow?.played_before === 'boolean' ? setupRow.played_before : null;

    if (profile.playerId && playedBefore !== null) {
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
        const [{data: existingApplication}, {data: seasonTeams}] = await Promise.all([
          launchSupabase
            .from('launch_player_applications')
            .select('status, requested_team_id, player_type, gender')
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
  }

  return (
    <AccountPageLayout
      description="Manage your player profile, season registration, league history, and access."
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
          players={players}
          playedBefore={playedBefore}
          registrationSeason={registrationSeason}
          registrationTeams={registrationTeams}
          application={application}
        />
      ) : (
        <article className={styles.panel}>
          <span className={styles.eyebrow}>Player setup</span>
          <h2>Profile is being created</h2>
          <p className={styles.muted}>Reload this page in a moment. Your verified account should receive its league profile automatically.</p>
        </article>
      )}
    </AccountPageLayout>
  );
}

function MemberProfile({
  players,
  profile,
  playedBefore,
  registrationSeason,
  registrationTeams,
  application,
}: {
  players: LaunchPlayer[];
  profile: LaunchProfile;
  playedBefore: boolean | null;
  registrationSeason: RegistrationSeason | null;
  registrationTeams: RegistrationTeam[];
  application: RegistrationApplication | null;
}) {
  const linkedPlayer = players.find((player) => player.id === profile.playerId);
  const playerSetupComplete = Boolean(linkedPlayer && playedBefore !== null);
  const requestedTeam = registrationTeams.find((team) => team.id === application?.requested_team_id);

  return (
    <section className={styles.grid}>
      {playerSetupComplete && registrationSeason ? (
        <article className={styles.panel}>
          <span className={styles.eyebrow}>Season registration</span>
          <h2>{registrationSeason.name}</h2>
          {application ? (
            <div className={styles.connected}>
              <strong>{application.status === 'Approved' ? 'Registered' : application.status}</strong>
              {requestedTeam?.name ?? application.requested_team_id} · {application.player_type} · {application.gender}
            </div>
          ) : (
            <>
              <p className={styles.linkingNote}>Choose your team and division for this season.</p>
              <form className={styles.form} action={submitSeasonApplication}>
                <input name="seasonId" type="hidden" value={registrationSeason.id} />
                <label htmlFor="accountRequestedTeam">Team</label>
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
                <button className={styles.primaryButton} type="submit">Register for season</button>
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
            <dd>{linkedPlayer?.name ?? 'Player Setup required'}</dd>
          </div>
        </dl>

        {!playerSetupComplete ? (
          <div style={{marginTop: '1rem'}}>
            <span className={styles.eyebrow}>One-time player setup</span>
            <h3>Have you played Coastal Clash before?</h3>
            <p className={styles.linkingNote}>Answer this once. It connects your account to the correct player history before season registration.</p>

            <form className={styles.form} action={completePlayerSetup}>
              <input name="playedBefore" type="hidden" value="false" />
              <button className={styles.secondaryButton} type="submit">No — I&apos;m a new Coastal Clash player</button>
            </form>

            <details style={{marginTop: '1rem'}}>
              <summary><strong>Yes — connect my previous player record</strong></summary>
              <form className={styles.form} action={completePlayerSetup} style={{marginTop: '0.75rem'}}>
                <input name="playedBefore" type="hidden" value="true" />
                <label htmlFor="setupRequestedPlayerId">Previous player record</label>
                <PlayerRecordSelect
                  emptyLabel="Choose your previous league name"
                  id="setupRequestedPlayerId"
                  name="requestedPlayerId"
                  players={players}
                  searchLabel="Search previous league names"
                  searchPlaceholder="Type your old name"
                  required
                />
                <button className={styles.primaryButton} type="submit">Connect previous history</button>
              </form>
            </details>
          </div>
        ) : null}

        <form className={styles.form} action={updateProfileName} style={{marginTop: '1rem'}}>
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

      {playerSetupComplete ? (
        <article className={styles.panel}>
          <span className={styles.eyebrow}>League history</span>
          <h2>{playedBefore ? 'History connected' : 'Player record ready'}</h2>
          <div className={styles.connected}>
            <strong>{linkedPlayer?.name}</strong>
            {playedBefore
              ? 'Your past results, rankings, and team history are connected to this account.'
              : 'This is your Coastal Clash player record. Future seasons will stay connected to this account.'}
          </div>
        </article>
      ) : null}

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
