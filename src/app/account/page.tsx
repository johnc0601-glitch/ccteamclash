import Link from 'next/link';
import {PlayerRecordSelect} from '@/components/launch/PlayerRecordSelect';
import {ThemeToggle} from '@/components/ThemeToggle';
import {createServerPublicPlayerService} from '@/core/createServerPublicPlayerService';
import {ensureLaunchSignupProfile} from '@/domain/launch/LaunchAccountSetup';
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

const FREE_AGENT_TEAM_VALUE = '__free_agent__';

type AccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RegistrationSeason = {id: string; name: string; start_date: string};
type RegistrationTeam = {id: string; name: string};
type RegistrationApplication = {
  status: string;
  requested_team_id: string | null;
  player_type: string;
  gender: string;
  submitted_pdga_number: string;
  submitted_pdga_rating: number | null;
};
type EstablishedRegistration = {
  playerType: 'Adult' | 'Junior';
  gender: 'Male' | 'Female';
} | null;
type RecordSummary = {wins: number; losses: number; ties: number};
type AccountPlayerStats = {
  teamName: string;
  seasonsPlayed: number;
  careerMatchesPlayed: number;
  careerRecord: RecordSummary;
  singlesRecord: RecordSummary;
  doublesRecord: RecordSummary;
  currentMatchesPlayed: number;
  currentRecord: RecordSummary;
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

  let profile = await repository.getProfileByUserId(user.id);
  let profileSetupError: string | undefined;
  if (!profile) {
    const setupError = await ensureLaunchSignupProfile(supabase, user);
    if (setupError) {
      profileSetupError = setupError;
    } else {
      profile = await repository.getProfileByUserId(user.id);
      if (!profile) {
        profileSetupError = 'Your account is verified, but its league profile could not be created automatically. Ask a commissioner to review the account.';
      }
    }
  }

  const players = await repository.getPlayers();
  let playedBefore: boolean | null = null;
  let registrationSeason: RegistrationSeason | null = null;
  let registrationTeams: RegistrationTeam[] = [];
  let application: RegistrationApplication | null = null;
  let establishedRegistration: EstablishedRegistration = null;

  if (profile) {
    const launchSupabase = supabase as any;
    const [{data: setupRow}, {data: openSeason}] = await Promise.all([
      launchSupabase
        .from('launch_profiles')
        .select('played_before')
        .eq('id', profile.id)
        .maybeSingle(),
      launchSupabase
        .from('launch_seasons')
        .select('id, name, start_date')
        .eq('registration_open', true)
        .eq('active', true)
        .eq('published', true)
        .eq('archived', false)
        .order('year', {ascending: false})
        .limit(1)
        .maybeSingle(),
    ]);

    playedBefore = typeof setupRow?.played_before === 'boolean' ? setupRow.played_before : null;
    registrationSeason = openSeason as RegistrationSeason | null;

    if (registrationSeason) {
      const applicationPromise = launchSupabase
        .from('launch_player_applications')
        .select('status, requested_team_id, player_type, gender, submitted_pdga_number, submitted_pdga_rating')
        .eq('profile_id', profile.id)
        .eq('season_id', registrationSeason.id)
        .maybeSingle();
      const teamsPromise = launchSupabase
        .from('launch_season_teams')
        .select('team_id')
        .eq('season_id', registrationSeason.id);
      const priorApplicationPromise = launchSupabase
        .from('launch_player_applications')
        .select('player_type, gender, created_at')
        .eq('profile_id', profile.id)
        .eq('status', 'Approved')
        .neq('season_id', registrationSeason.id)
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle();
      const genderLockPromise = profile.playerId
        ? launchSupabase.rpc('launch_player_gender_locked', {target_player_id: profile.playerId})
        : Promise.resolve({data: false});

      const [
        {data: existingApplication},
        {data: seasonTeams},
        {data: priorApplication},
        {data: genderLocked},
      ] = await Promise.all([
        applicationPromise,
        teamsPromise,
        priorApplicationPromise,
        genderLockPromise,
      ]);

      application = existingApplication as RegistrationApplication | null;

      const teamIds = ((seasonTeams ?? []) as {team_id: string}[]).map((item) => item.team_id);
      if (teamIds.length) {
        const {data: teamRows} = await launchSupabase
          .from('launch_teams')
          .select('id, name')
          .in('id', teamIds)
          .order('name');
        registrationTeams = teamRows ?? [];
      }

      if (profile.playerId) {
        const linkedPlayer = players.find((player) => player.id === profile?.playerId);
        const previousPlayerType = priorApplication?.player_type === 'Adult' || priorApplication?.player_type === 'Junior'
          ? priorApplication.player_type
          : 'Adult';
        const establishedGender = linkedPlayer?.gender === 'Male' || linkedPlayer?.gender === 'Female'
          ? linkedPlayer.gender
          : priorApplication?.gender === 'Male' || priorApplication?.gender === 'Female'
            ? priorApplication.gender
            : null;

        if (genderLocked === true && establishedGender) {
          establishedRegistration = {
            playerType: previousPlayerType,
            gender: establishedGender,
          };
        }
      }
    }
  }

  const linkedPlayer = profile ? players.find((player) => player.id === profile.playerId) : null;
  let playerStats: AccountPlayerStats | null = null;
  if (linkedPlayer) {
    try {
      const publicPlayerService = await createServerPublicPlayerService();
      const [playerViews, completeHistory] = await Promise.all([
        publicPlayerService.getAll(),
        publicPlayerService.getHistory(linkedPlayer.id),
      ]);
      const playerView = playerViews.find((entry) => entry.player.id === linkedPlayer.id);
      if (playerView) {
        const current = playerView.currentStatistics;
        const career = playerView.careerStatistics;
        playerStats = {
          teamName: playerView.teamName,
          seasonsPlayed: new Set(completeHistory.map((entry) => entry.seasonName)).size,
          careerMatchesPlayed: career.matchesPlayed,
          careerRecord: career.overallRecord,
          singlesRecord: career.singlesRecord,
          doublesRecord: career.doublesRecord,
          currentMatchesPlayed: current?.matchesPlayed ?? 0,
          currentRecord: current?.overallRecord ?? {wins: 0, losses: 0, ties: 0},
        };
      }
    } catch {
      playerStats = null;
    }
  }

  const registrationIncomplete = Boolean(profile && registrationSeason && !application);

  return (
    <AccountPageLayout
      description={registrationIncomplete
        ? 'Choose your team, or choose Free Agent if you are looking for one.'
        : 'Manage your player profile, season registration, league history, and access.'}
      error={error ?? profileSetupError}
      notice={notice}
      title={registrationIncomplete ? 'Finish registration' : 'My account'}
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
          establishedRegistration={establishedRegistration}
          playerStats={playerStats}
        />
      ) : (
        <article className={styles.panel}>
          <span className={styles.eyebrow}>Registration</span>
          <h2>Profile setup needs attention</h2>
          <p className={styles.muted}>{profileSetupError ?? 'Your verified account does not have a league profile yet.'}</p>
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
  establishedRegistration,
  playerStats,
}: {
  players: LaunchPlayer[];
  profile: LaunchProfile;
  playedBefore: boolean | null;
  registrationSeason: RegistrationSeason | null;
  registrationTeams: RegistrationTeam[];
  application: RegistrationApplication | null;
  establishedRegistration: EstablishedRegistration;
  playerStats: AccountPlayerStats | null;
}) {
  const linkedPlayer = players.find((player) => player.id === profile.playerId);
  const playerSetupComplete = Boolean(linkedPlayer && playedBefore !== null);
  const requestedTeam = registrationTeams.find((team) => team.id === application?.requested_team_id);
  const applicationTeamLabel = application?.requested_team_id
    ? requestedTeam?.name ?? application.requested_team_id
    : 'Free Agent — Looking for a team';

  if (registrationSeason && !application) {
    return (
      <section className={styles.grid}>
        <RegistrationForm
          season={registrationSeason}
          teams={registrationTeams}
          establishedRegistration={establishedRegistration}
          linkedPlayer={linkedPlayer}
          playerSetupComplete={playerSetupComplete}
        />
        {!playerSetupComplete ? <PlayerSetupPanel players={players} freeAgentOptional /> : null}
      </section>
    );
  }

  if (!playerSetupComplete && application) {
    const isFreeAgent = application.requested_team_id === null;
    return (
      <section className={styles.grid}>
        <article className={`${styles.panel} ${styles.registrationPanel}`}>
          <span className={styles.eyebrow}>Season registration</span>
          <h2>{registrationSeason?.name ?? 'Current season'}</h2>
          <div className={styles.registrationStatus}>
            <span>{isFreeAgent ? 'Free Agent' : application.status}</span>
            <strong>{applicationTeamLabel}</strong>
          </div>
          <dl className={styles.profileDetails}>
            <div><dt>Team</dt><dd>{applicationTeamLabel}</dd></div>
            <div><dt>Player type</dt><dd>{application.player_type}</dd></div>
            <div><dt>Division</dt><dd>{application.gender}</dd></div>
            {isFreeAgent ? <div><dt>PDGA #</dt><dd>{application.submitted_pdga_number || '—'}</dd></div> : null}
            {isFreeAgent ? <div><dt>PDGA rating</dt><dd>{application.submitted_pdga_rating ?? '—'}</dd></div> : null}
          </dl>
          {isFreeAgent ? (
            <p className={styles.muted}>Player Setup is not required while you are in Free Agency. If a captain selects you, complete it before final roster approval.</p>
          ) : (
            <p className={styles.muted}>Complete Player Setup so your captain can finish adding you to the roster.</p>
          )}
        </article>
        <PlayerSetupPanel players={players} freeAgentOptional={isFreeAgent} />
      </section>
    );
  }

  if (!playerSetupComplete) {
    return (
      <section className={styles.grid}>
        <PlayerSetupPanel players={players} />
      </section>
    );
  }

  const teamName = application
    ? applicationTeamLabel
    : playerStats?.teamName || 'Unassigned';
  const playerType = application?.player_type || establishedRegistration?.playerType || 'Adult';
  const gender = application?.gender || linkedPlayer?.gender || establishedRegistration?.gender || '—';

  return (
    <section className={styles.grid}>
      <article className={`${styles.panel} ${styles.profilePanel}`}>
        <div className={styles.profileHeading}>
          <div>
            <span className={styles.eyebrow}>Player profile</span>
            <h2>{linkedPlayer?.name ?? profile.displayName}</h2>
            <p className={styles.profileSubhead}>{teamName} · {profile.role}</p>
          </div>
          {profile.role === 'Captain' ? <Link className={styles.compactAction} href="/captain">Captain Home</Link> : null}
          {profile.role === 'Commissioner' ? <Link className={styles.compactAction} href="/office">Commissioner Office</Link> : null}
        </div>

        <div className={styles.playerHeroStats}>
          <div><span>Clash Index</span><strong>{linkedPlayer?.clashIndex ?? '—'}</strong></div>
          <div><span>PDGA rating</span><strong>{linkedPlayer?.pdgaRating ?? '—'}</strong></div>
        </div>

        <dl className={styles.profileDetails}>
          <div><dt>PDGA #</dt><dd>{linkedPlayer?.pdgaNumber || '—'}</dd></div>
          <div><dt>Division</dt><dd>{gender}</dd></div>
          <div><dt>Player type</dt><dd>{playerType}</dd></div>
          <div><dt>Status</dt><dd>{profile.status}</dd></div>
        </dl>

        <form className={styles.form} action={updateProfileName}>
          <label htmlFor="profileDisplayName">Display name</label>
          <input id="profileDisplayName" name="displayName" defaultValue={profile.displayName} autoComplete="name" required />
          <button className={styles.secondaryButton} type="submit">Save profile</button>
        </form>
      </article>

      {registrationSeason && application ? (
        <article className={`${styles.panel} ${styles.registrationPanel}`}>
          <span className={styles.eyebrow}>Season registration</span>
          <h2>{registrationSeason.name}</h2>
          <div className={styles.registrationStatus}>
            <span>{application.requested_team_id === null ? 'Free Agent' : application.status === 'Approved' ? 'Registered' : application.status}</span>
            <strong>{applicationTeamLabel}</strong>
          </div>
          <dl className={styles.profileDetails}>
            <div><dt>Team</dt><dd>{applicationTeamLabel}</dd></div>
            <div><dt>Player type</dt><dd>{application.player_type}</dd></div>
            <div><dt>Division</dt><dd>{application.gender}</dd></div>
            <div><dt>Season starts</dt><dd>{formatDate(registrationSeason.start_date)}</dd></div>
            {application.requested_team_id === null ? <div><dt>PDGA #</dt><dd>{application.submitted_pdga_number || linkedPlayer?.pdgaNumber || '—'}</dd></div> : null}
            {application.requested_team_id === null ? <div><dt>PDGA rating</dt><dd>{application.submitted_pdga_rating ?? linkedPlayer?.pdgaRating ?? '—'}</dd></div> : null}
          </dl>
        </article>
      ) : null}

      <article className={`${styles.panel} ${styles.historyPanel}`}>
        <span className={styles.eyebrow}>League history</span>
        <h2>{playedBefore ? 'Career record' : 'Player record ready'}</h2>
        {playerStats ? (
          <>
            <div className={styles.historyStats}>
              <Stat label="Seasons" value={String(playerStats.seasonsPlayed)} />
              <Stat label="Matches" value={String(playerStats.careerMatchesPlayed)} />
              <Stat label="Singles" value={formatRecord(playerStats.singlesRecord)} />
              <Stat label="Doubles" value={formatRecord(playerStats.doublesRecord)} />
            </div>
            <div className={styles.currentSeasonStrip}>
              <span>Current season</span>
              <strong>{playerStats.currentMatchesPlayed ? `${formatRecord(playerStats.currentRecord)} · ${playerStats.currentMatchesPlayed} played` : 'No results yet'}</strong>
            </div>
            {linkedPlayer ? <Link className={styles.historyLink} href={`/players?search=${encodeURIComponent(linkedPlayer.name)}`}>View full player history</Link> : null}
          </>
        ) : (
          <div className={styles.connected}>
            <strong>{linkedPlayer?.name}</strong>
            {playedBefore
              ? 'Your past results, rankings, and team history are connected to this account.'
              : 'This is your Coastal Clash player record. Future seasons will stay connected to this account.'}
          </div>
        )}
      </article>

      <article className={`${styles.panel} ${styles.themePanel}`}>
        <span className={styles.eyebrow}>Display</span>
        <h2>Theme</h2>
        <p>Choose how Team Clash looks on this device.</p>
        <div className={styles.themeAction}><ThemeToggle /></div>
      </article>
    </section>
  );
}

function RegistrationForm({
  season,
  teams,
  establishedRegistration,
  linkedPlayer,
  playerSetupComplete,
}: {
  season: RegistrationSeason;
  teams: RegistrationTeam[];
  establishedRegistration: EstablishedRegistration;
  linkedPlayer: LaunchPlayer | undefined;
  playerSetupComplete: boolean;
}) {
  return (
    <article className={styles.panel}>
      <span className={styles.eyebrow}>Season registration</span>
      <h2>{season.name}</h2>
      <p className={styles.linkingNote}>
        {playerSetupComplete
          ? 'Choose your team, or choose Free Agent if you are looking for one.'
          : 'Choose Free Agent now without Player Setup. If you are registering directly to a team, connect your player record below first.'}
      </p>
      <form className={styles.form} action={submitSeasonApplication}>
        <input name="seasonId" type="hidden" value={season.id} />
        <label htmlFor="accountRequestedTeam">Team</label>
        <select id="accountRequestedTeam" name="requestedTeamId" required defaultValue="">
          <option value="" disabled>Choose your team</option>
          <option value={FREE_AGENT_TEAM_VALUE}>Free Agent — Looking for a team</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
        <label style={{display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'none'}}>
          <input
            name="playerType"
            type="checkbox"
            value="Junior"
            defaultChecked={establishedRegistration?.playerType === 'Junior'}
            style={{width: 'auto', minHeight: 'auto'}}
          />
          <input name="playerType" type="hidden" value="Adult" />
          <span>Junior this season</span>
        </label>
        {establishedRegistration ? (
          <>
            <input name="gender" type="hidden" value={establishedRegistration.gender} />
            <label>Division</label>
            <div className={styles.connected}><strong>{establishedRegistration.gender}</strong><span>Permanent</span></div>
          </>
        ) : (
          <>
            <label htmlFor="accountGender">Division</label>
            <select id="accountGender" name="gender" required defaultValue={linkedPlayer?.gender === 'Male' || linkedPlayer?.gender === 'Female' ? linkedPlayer.gender : ''}>
              <option value="" disabled>Choose division</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </>
        )}
        <label htmlFor="accountPdgaNumber">PDGA #</label>
        <input
          id="accountPdgaNumber"
          name="pdgaNumber"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          defaultValue={linkedPlayer?.pdgaNumber || ''}
          placeholder="Optional for Free Agents"
        />
        <label htmlFor="accountPdgaRating">PDGA rating</label>
        <input
          id="accountPdgaRating"
          name="pdgaRating"
          type="number"
          min={1}
          max={2000}
          step={1}
          defaultValue={linkedPlayer?.pdgaRating ?? ''}
          placeholder="Optional for Free Agents"
        />
        <p className={styles.muted}>PDGA information is optional and is used to help captains evaluate Free Agent listings.</p>
        <button className={styles.primaryButton} type="submit">Submit registration</button>
      </form>
    </article>
  );
}

function PlayerSetupPanel({players, freeAgentOptional = false}: {players: LaunchPlayer[]; freeAgentOptional?: boolean}) {
  return (
    <article className={styles.panel}>
      <span className={styles.eyebrow}>Player record</span>
      <h2>Find your Coastal Clash player record</h2>
      <p className={styles.linkingNote}>
        {freeAgentOptional
          ? 'This is not required while you are a Free Agent. Connect it before final roster approval so your history, ratings, and team records stay together.'
          : 'Connect your player record before registering directly to a team so your history, rankings, and team records stay connected.'}
      </p>
      <form className={styles.form} action={completePlayerSetup}>
        <input name="playedBefore" type="hidden" value="true" />
        <label htmlFor="setupRequestedPlayerId">Your player record</label>
        <PlayerRecordSelect
          emptyLabel="Choose your previous league name"
          id="setupRequestedPlayerId"
          name="requestedPlayerId"
          players={players}
          searchLabel="Search player names"
          searchPlaceholder="Type your name"
          required
        />
        <button className={styles.primaryButton} type="submit">Connect player record</button>
      </form>
      <details style={{marginTop: '1rem'}}>
        <summary><strong>I have never played Coastal Clash before</strong></summary>
        <p className={styles.linkingNote}>Only use this if you do not have an existing Coastal Clash player record. This creates a new player with no previous league history.</p>
        <form className={styles.form} action={completePlayerSetup}>
          <input name="playedBefore" type="hidden" value="false" />
          <input name="confirmNewPlayer" type="hidden" value="yes" />
          <button className={styles.secondaryButton} type="submit">Create new player record</button>
        </form>
      </details>
    </article>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatRecord(record: RecordSummary): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}
