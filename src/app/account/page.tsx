import Link from 'next/link';
import {PlayerApplicationForm} from '@/components/launch/PlayerApplicationForm';
import {PlayerRecordSelect} from '@/components/launch/PlayerRecordSelect';
import {ThemeToggle} from '@/components/ThemeToggle';
import {createServerPlayerApplicationService} from '@/core/createServerPlayerApplicationService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {LaunchPlayer, LaunchProfile, LaunchTeam, PlayerClaim} from '@/domain/launch/LaunchData';
import {
  resolveLaunchProfileState,
  type LaunchProfileState,
} from '@/domain/launch/LaunchProfileState';
import type {PlayerApplication} from '@/domain/player-application/PlayerApplication';
import {
  buildPlayerApplicationSummary,
  canStartPlayerApplication,
} from '@/domain/player-application/PlayerApplicationPresentation';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {SupabaseSeasonRosterRepository} from '@/domain/season-roster/SupabaseSeasonRosterRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {
  changePlayerApplicationRequestedTeam,
  createPendingProfile,
  signInWithPassword,
  signOut,
  submitPlayerClaim,
  submitPlayerApplication,
  updateProfileName,
} from './actions';
import {loadAccountDataWithJwtTimingRetry} from './accountDataRetry';
import {AccountPageLayout, readAccountParam} from './AccountPageLayout';
import {PasswordField, SubmitButton} from './AuthFormControls';
import {resolvePlayerApplicationSeasonContext} from './playerApplicationSeasonContext';
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
  const seasonRepository = new SupabaseSeasonRepository(supabase);

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

  const playerApplicationService = await createServerPlayerApplicationService();

  const [profile, claims, players, teams, activeSeason, applications] = await loadAccountDataWithJwtTimingRetry(
    () => Promise.all([
      repository.getProfileByUserId(user.id),
      repository.getPlayerClaims(),
      repository.getPlayers(),
      repository.getTeams(),
      seasonRepository.getActive(),
      playerApplicationService.listApplications(),
    ]),
  );
  const application = profile
    ? applications.find((candidate) => candidate.profileId === profile.id)
    : undefined;
  const applicationSeasonContext = resolvePlayerApplicationSeasonContext({
    activeSeason,
    application,
  });
  const seasonTeams = applicationSeasonContext.teamOptionsSeasonId
    ? await new SupabaseSeasonRosterRepository(supabase)
      .listSeasonTeams(applicationSeasonContext.teamOptionsSeasonId)
    : [];

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
            application={application}
            applicationSeasonId={applicationSeasonContext.newApplicationSeasonId}
            applicationTeamIds={seasonTeams.map((seasonTeam) => seasonTeam.teamId)}
            teams={teams}
          />
        ) : (
          <CreateProfileForm
            fallbackName={getDisplayName(user.email, user.user_metadata?.name)}
          />
        )}
    </AccountPageLayout>
  );
}

function CreateProfileForm({fallbackName}: {fallbackName: string}) {
  return (
    <article className={styles.panel}>
      <span className={styles.eyebrow}>Finish account setup</span>
      <h2>Create your player profile</h2>
      <p className={styles.linkingNote}>
        Start with your name. You can choose whether to connect previous Team Clash history in the next step.
      </p>
      <form className={styles.form} action={createPendingProfile}>
        <label htmlFor="displayName">First Name Last Name</label>
        <input id="displayName" name="displayName" defaultValue={fallbackName} autoComplete="name" required />
        <button className={styles.primaryButton} type="submit">Continue</button>
      </form>
    </article>
  );
}

function MemberProfile({
  application,
  applicationSeasonId,
  applicationTeamIds,
  claims,
  players,
  profile,
  teams,
}: {
  application?: PlayerApplication;
  applicationSeasonId?: string;
  applicationTeamIds: string[];
  claims: PlayerClaim[];
  players: LaunchPlayer[];
  profile: LaunchProfile;
  teams: LaunchTeam[];
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

      {profileState === 'pending_player' ? (
        <PlayerApplicationExperience
          application={application}
          applicationSeasonId={applicationSeasonId}
          applicationTeamIds={applicationTeamIds}
          claims={claims}
          players={players}
          profile={profile}
          teams={teams}
        />
      ) : <article className={styles.panel}>
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
      </article>}

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

function PlayerApplicationExperience({
  application,
  applicationSeasonId,
  applicationTeamIds,
  claims,
  players,
  profile,
  teams,
}: {
  application?: PlayerApplication;
  applicationSeasonId?: string;
  applicationTeamIds: string[];
  claims: PlayerClaim[];
  players: LaunchPlayer[];
  profile: LaunchProfile;
  teams: LaunchTeam[];
}) {
  const teamOptions = applicationTeamIds
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is LaunchTeam => Boolean(team?.active))
    .map(({id, name}) => ({id, name}));
  const availability = canStartPlayerApplication({
    profileState: resolveLaunchProfileState(profile),
    seasonAvailable: Boolean(applicationSeasonId),
    enrolledTeamCount: teamOptions.length,
  });

  if (!application) {
    return (
      <article className={styles.panel}>
        <span className={styles.eyebrow}>Finish your player application</span>
        <h2>Player application</h2>
        {availability.available && applicationSeasonId ? (
          <PlayerApplicationForm
            action={submitPlayerApplication}
            defaultName={profile.displayName}
            players={players.filter((player) => player.active)}
            seasonId={applicationSeasonId}
            teams={teamOptions}
          />
        ) : <p className={styles.claimState}>{availability.message}</p>}
      </article>
    );
  }

  const claim = claims[0];
  const previousPlayer = claim?.requestedPlayerId
    ? players.find((player) => player.id === claim.requestedPlayerId)
    : undefined;
  const requestedTeam = teams.find((team) => team.id === application.requestedTeamId);
  const summary = buildPlayerApplicationSummary({
    application,
    displayName: profile.displayName,
    requestedTeamName: requestedTeam?.name,
    claim,
    previousPlayerName: previousPlayer?.name,
  });

  return (
    <article className={styles.panel}>
      <span className={styles.eyebrow}>Application {summary.status}</span>
      <h2>{summary.displayName}</h2>
      <p className={styles.applicationIdentity}>{summary.identityLabel}</p>
      <dl className={styles.statusList}>
        <div><dt>Requested Team</dt><dd>{summary.requestedTeamName}</dd></div>
        <div><dt>Status</dt><dd>{summary.status}</dd></div>
      </dl>
      {summary.status === 'Pending' ? (
        <p className={styles.claimState}>Your application is awaiting league approval.</p>
      ) : (
        <p className={styles.claimState}>This application is read-only.</p>
      )}
      {summary.previousPlayerName ? (
        <div className={styles.historySummary}>
          <strong>Previous player: {summary.previousPlayerName}</strong>
          <span>History connection: {summary.historyConnectionStatus ?? 'Not submitted'}</span>
        </div>
      ) : null}
      {summary.canChangeRequestedTeam && teamOptions.length ? (
        <form className={styles.form} action={changePlayerApplicationRequestedTeam}>
          <input name="applicationId" type="hidden" value={application.id} />
          <label htmlFor="changeRequestedTeam">Change Requested Team</label>
          <select
            defaultValue={application.requestedTeamId}
            id="changeRequestedTeam"
            name="requestedTeamId"
            required
          >
            {teamOptions.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <SubmitButton pendingLabel="Updating team..." secondary>Change Requested Team</SubmitButton>
        </form>
      ) : summary.canChangeRequestedTeam ? (
        <p className={styles.claimState}>
          Requested-team changes are unavailable because this application&apos;s season teams could not be loaded.
        </p>
      ) : null}
    </article>
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
