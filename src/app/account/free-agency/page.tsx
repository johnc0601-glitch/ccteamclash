import Link from 'next/link';
import {redirect} from 'next/navigation';
import {ensureLaunchSignupProfile} from '@/domain/launch/LaunchAccountSetup';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {joinFreeAgency} from './actions';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import styles from '../Account.module.css';

export const dynamic = 'force-dynamic';

type FreeAgencyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type Season = {id: string; name: string; start_date: string};
type Application = {
  status: string;
  requested_team_id: string | null;
  player_type: string;
  gender: string;
};
type LinkedPlayer = {
  id: string;
  name: string;
  gender: string;
  pdga_number: string;
  pdga_rating: number | null;
  clash_index: number | null;
  home_area: string;
};

export default async function FreeAgencyPage({searchParams}: FreeAgencyPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readAccountParam(params.notice);
  const error = readAccountParam(params.error);
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account?error=Sign in first to open Free Agency.');

  const repository = new SupabaseLaunchRepository(supabase);
  let profile = await repository.getProfileByUserId(user.id);
  if (!profile) {
    await ensureLaunchSignupProfile(supabase, user);
    profile = await repository.getProfileByUserId(user.id);
  }

  if (!profile || profile.status === 'Rejected' || profile.status === 'Suspended') {
    return (
      <AccountPageLayout
        description="A signed-in league account is all you need to use Free Agency."
        error={error}
        notice={notice}
        title="Free Agency"
      >
        <article className={styles.panel}>
          <span className={styles.eyebrow}>League account</span>
          <h2>Account review required</h2>
          <p className={styles.muted}>This account cannot enter Free Agency while it is suspended, rejected, or missing its league profile.</p>
          <Link className={styles.actionLink} href="/account">Open My Profile</Link>
        </article>
      </AccountPageLayout>
    );
  }

  const launchSupabase = supabase as any;
  const [{data: setupRow}, {data: openSeason}, linkedPlayerResult] = await Promise.all([
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
    profile.playerId
      ? launchSupabase
          .from('launch_players')
          .select('id, name, gender, pdga_number, pdga_rating, clash_index, home_area')
          .eq('id', profile.playerId)
          .maybeSingle()
      : Promise.resolve({data: null}),
  ]);

  const linkedPlayer = (linkedPlayerResult.data ?? null) as LinkedPlayer | null;
  const playerSetupComplete = Boolean(linkedPlayer && typeof setupRow?.played_before === 'boolean');
  const season = openSeason as Season | null;

  if (!season) {
    return (
      <AccountPageLayout
        description="The Free Agent Pool opens with season registration."
        error={error}
        notice={notice}
        title="Free Agency"
      >
        <article className={styles.panel}>
          <span className={styles.eyebrow}>Player pool</span>
          <h2>Free Agency is closed</h2>
          <p className={styles.muted}>There is no active season accepting registrations right now.</p>
          <Link className={styles.secondaryActionLink} href="/account">Back to My Profile</Link>
        </article>
      </AccountPageLayout>
    );
  }

  const {data: applicationData} = await launchSupabase
    .from('launch_player_applications')
    .select('status, requested_team_id, player_type, gender')
    .eq('profile_id', profile.id)
    .eq('season_id', season.id)
    .maybeSingle();
  const application = applicationData as Application | null;

  let requestedTeamName: string | null = null;
  if (application?.requested_team_id) {
    const {data: team} = await launchSupabase
      .from('launch_teams')
      .select('name')
      .eq('id', application.requested_team_id)
      .maybeSingle();
    requestedTeamName = typeof team?.name === 'string' ? team.name : application.requested_team_id;
  }

  if (application?.status === 'Approved') {
    return (
      <AccountPageLayout
        description="Your current season registration is already complete."
        error={error}
        notice={notice}
        title="Free Agency"
      >
        <article className={styles.panel}>
          <span className={styles.eyebrow}>{season.name}</span>
          <h2>You are already rostered</h2>
          <div className={styles.connected}>
            <strong>{requestedTeamName ?? 'Current team'}</strong>
            Your season registration has already been approved, so you are not listed as a free agent.
          </div>
          <Link className={styles.secondaryActionLink} href="/account">Back to My Profile</Link>
        </article>
      </AccountPageLayout>
    );
  }

  if (application?.status === 'Rejected') {
    return (
      <AccountPageLayout
        description="Your current season application needs commissioner review before it can be changed."
        error={error}
        notice={notice}
        title="Free Agency"
      >
        <article className={styles.panel}>
          <span className={styles.eyebrow}>{season.name}</span>
          <h2>Registration needs review</h2>
          <p className={styles.muted}>Your season application is finalized as rejected. Ask the commissioner to reopen or route it before entering Free Agency.</p>
          <Link className={styles.secondaryActionLink} href="/account">Back to My Profile</Link>
        </article>
      </AccountPageLayout>
    );
  }

  if (application?.status === 'Pending' && application.requested_team_id === null) {
    return (
      <AccountPageLayout
        description="Captains can now find you while building their rosters."
        error={error}
        notice={notice}
        title="Free Agency"
      >
        <article className={styles.panel}>
          <span className={styles.eyebrow}>{season.name}</span>
          <h2>You are in the Free Agent Pool</h2>
          <div className={styles.registrationStatus}>
            <span>Available</span>
            <strong>{linkedPlayer?.name || profile.displayName}</strong>
          </div>
          <dl className={styles.profileDetails}>
            <div><dt>Division</dt><dd>{application.gender}</dd></div>
            <div><dt>Player type</dt><dd>{application.player_type}</dd></div>
            <div><dt>Clash Index</dt><dd>{linkedPlayer?.clash_index ?? '—'}</dd></div>
            <div><dt>PDGA rating</dt><dd>{linkedPlayer?.pdga_rating ?? '—'}</dd></div>
          </dl>
          <p className={styles.muted}>Player Setup is not required while you are waiting in Free Agency. If a captain selects you, you can finish any remaining registration details then.</p>
          <Link className={styles.secondaryActionLink} href="/account">Back to My Profile</Link>
        </article>
      </AccountPageLayout>
    );
  }

  if (application?.status === 'Pending' && application.requested_team_id) {
    return (
      <AccountPageLayout
        description="A captain has selected you from the Free Agent Pool."
        error={error}
        notice={notice}
        title="Free Agency"
      >
        <article className={styles.panel}>
          <span className={styles.eyebrow}>{season.name}</span>
          <h2>{requestedTeamName ?? 'A team'} selected you</h2>
          <div className={styles.connected}>
            <strong>{requestedTeamName ?? 'Team selected'}</strong>
            You are no longer visible in the Free Agent Pool.
          </div>
          {playerSetupComplete ? (
            <p className={styles.muted}>Your player setup is complete. Your captain can now finish the normal roster approval.</p>
          ) : (
            <>
              <p className={styles.muted}>Now complete Player Setup so your captain can finish adding you to the roster.</p>
              <Link className={styles.actionLink} href="/account">Finish Player Setup</Link>
            </>
          )}
        </article>
      </AccountPageLayout>
    );
  }

  const establishedGender = linkedPlayer?.gender === 'Male' || linkedPlayer?.gender === 'Female'
    ? linkedPlayer.gender
    : null;
  let genderLocked = false;
  if (linkedPlayer) {
    const {data} = await launchSupabase.rpc('launch_player_gender_locked', {target_player_id: linkedPlayer.id});
    genderLocked = data === true;
  }
  const defaultGender = establishedGender ?? '';

  return (
    <AccountPageLayout
      description="No team yet? Join the captain-visible player pool with your league account."
      error={error}
      notice={notice}
      title="Free Agency"
    >
      <section className={styles.grid}>
        <article className={styles.panel}>
          <span className={styles.eyebrow}>{season.name}</span>
          <h2>Looking for a team</h2>
          <p className={styles.linkingNote}>
            You do not need to connect a player record to enter Free Agency. Captains can find you using your account name, division, and player type.
          </p>
          <form className={styles.form} action={joinFreeAgency}>
            <input name="seasonId" type="hidden" value={season.id} />
            <label style={{display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'none'}}>
              <input
                name="playerType"
                type="checkbox"
                value="Junior"
                style={{width: 'auto', minHeight: 'auto'}}
              />
              <input name="playerType" type="hidden" value="Adult" />
              <span>Junior this season</span>
            </label>
            {genderLocked && establishedGender ? (
              <>
                <input name="gender" type="hidden" value={establishedGender} />
                <label>Division</label>
                <div className={styles.connected}><strong>{establishedGender}</strong><span>Permanent</span></div>
              </>
            ) : (
              <>
                <label htmlFor="freeAgencyGender">Division</label>
                <select id="freeAgencyGender" name="gender" required defaultValue={defaultGender}>
                  <option value="" disabled>Choose division</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </>
            )}
            <button className={styles.primaryButton} type="submit">Join Free Agent Pool</button>
          </form>
        </article>

        <article className={styles.panel}>
          <span className={styles.eyebrow}>What captains see</span>
          <h2>{linkedPlayer?.name || profile.displayName}</h2>
          <dl className={styles.profileDetails}>
            <div><dt>Clash Index</dt><dd>{linkedPlayer?.clash_index ?? '—'}</dd></div>
            <div><dt>PDGA rating</dt><dd>{linkedPlayer?.pdga_rating ?? '—'}</dd></div>
            <div><dt>PDGA #</dt><dd>{linkedPlayer?.pdga_number || '—'}</dd></div>
            <div><dt>Home area</dt><dd>{linkedPlayer?.home_area || '—'}</dd></div>
          </dl>
          <p className={styles.muted}>If you already have linked player history, those details are shown automatically. No email address or private account information is exposed.</p>
        </article>
      </section>
    </AccountPageLayout>
  );
}
