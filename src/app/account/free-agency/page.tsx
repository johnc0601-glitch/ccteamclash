import Link from 'next/link';
import {redirect} from 'next/navigation';
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

export default async function FreeAgencyPage({searchParams}: FreeAgencyPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readAccountParam(params.notice);
  const error = readAccountParam(params.error);
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account?error=Sign in first to open Free Agency.');

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (!profile || profile.status !== 'Approved') {
    return (
      <AccountPageLayout
        description="Finish your league account before entering the player pool."
        error={error}
        notice={notice}
        title="Free Agency"
      >
        <article className={styles.panel}>
          <span className={styles.eyebrow}>Player setup</span>
          <h2>Account setup required</h2>
          <p className={styles.muted}>Connect and approve your player account first. Free Agency uses that same player record.</p>
          <Link className={styles.actionLink} href="/account">Open My Profile</Link>
        </article>
      </AccountPageLayout>
    );
  }

  const launchSupabase = supabase as any;
  const [{data: setupRow}, players, {data: openSeason}] = await Promise.all([
    launchSupabase
      .from('launch_profiles')
      .select('played_before')
      .eq('id', profile.id)
      .maybeSingle(),
    repository.getPlayers(),
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

  const linkedPlayer = players.find((player) => player.id === profile.playerId) ?? null;
  const playerSetupComplete = Boolean(linkedPlayer && typeof setupRow?.played_before === 'boolean');
  const season = openSeason as Season | null;

  if (!playerSetupComplete) {
    return (
      <AccountPageLayout
        description="Free Agency uses the same player record as season registration."
        error={error}
        notice={notice}
        title="Free Agency"
      >
        <article className={styles.panel}>
          <span className={styles.eyebrow}>Player setup</span>
          <h2>Connect your player record</h2>
          <p className={styles.muted}>Complete Player Setup in My Profile before joining the Free Agent Pool.</p>
          <Link className={styles.actionLink} href="/account">Finish Player Setup</Link>
        </article>
      </AccountPageLayout>
    );
  }

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

  const [{data: applicationData}, {data: genderLocked}] = await Promise.all([
    launchSupabase
      .from('launch_player_applications')
      .select('status, requested_team_id, player_type, gender')
      .eq('profile_id', profile.id)
      .eq('season_id', season.id)
      .maybeSingle(),
    launchSupabase.rpc('launch_player_gender_locked', {target_player_id: linkedPlayer!.id}),
  ]);
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
            <strong>{linkedPlayer!.name}</strong>
          </div>
          <dl className={styles.profileDetails}>
            <div><dt>Division</dt><dd>{application.gender}</dd></div>
            <div><dt>Player type</dt><dd>{application.player_type}</dd></div>
            <div><dt>Clash Index</dt><dd>{linkedPlayer!.clashIndex ?? '—'}</dd></div>
            <div><dt>PDGA rating</dt><dd>{linkedPlayer!.pdgaRating ?? '—'}</dd></div>
          </dl>
          <p className={styles.muted}>If a captain selects you, your application moves to that team&apos;s normal captain approval list.</p>
          <Link className={styles.secondaryActionLink} href="/account">Back to My Profile</Link>
        </article>
      </AccountPageLayout>
    );
  }

  const establishedGender = linkedPlayer!.gender === 'Male' || linkedPlayer!.gender === 'Female'
    ? linkedPlayer!.gender
    : null;
  const defaultGender = application?.gender === 'Male' || application?.gender === 'Female'
    ? application.gender
    : establishedGender ?? '';
  const defaultPlayerType = application?.player_type === 'Junior' ? 'Junior' : 'Adult';

  return (
    <AccountPageLayout
      description="No team yet? Put your existing season application into a captain-visible player pool."
      error={error}
      notice={notice}
      title="Free Agency"
    >
      <section className={styles.grid}>
        <article className={styles.panel}>
          <span className={styles.eyebrow}>{season.name}</span>
          <h2>Looking for a team</h2>
          <p className={styles.linkingNote}>
            Captains will see your player name, division, CI, PDGA information, and home area. Your account remains the single player record.
          </p>
          {application?.requested_team_id ? (
            <p className={styles.muted}>You currently have a pending request for {requestedTeamName}. Joining Free Agency will replace that pending team request.</p>
          ) : null}
          <form className={styles.form} action={joinFreeAgency}>
            <input name="seasonId" type="hidden" value={season.id} />
            <label style={{display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'none'}}>
              <input
                name="playerType"
                type="checkbox"
                value="Junior"
                defaultChecked={defaultPlayerType === 'Junior'}
                style={{width: 'auto', minHeight: 'auto'}}
              />
              <input name="playerType" type="hidden" value="Adult" />
              <span>Junior this season</span>
            </label>
            {genderLocked === true && establishedGender ? (
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
          <h2>{linkedPlayer!.name}</h2>
          <dl className={styles.profileDetails}>
            <div><dt>Clash Index</dt><dd>{linkedPlayer!.clashIndex ?? '—'}</dd></div>
            <div><dt>PDGA rating</dt><dd>{linkedPlayer!.pdgaRating ?? '—'}</dd></div>
            <div><dt>PDGA #</dt><dd>{linkedPlayer!.pdgaNumber || '—'}</dd></div>
            <div><dt>Home area</dt><dd>{linkedPlayer!.homeArea || '—'}</dd></div>
          </dl>
          <p className={styles.muted}>No email address or private account information is exposed in the captain list.</p>
        </article>
      </section>
    </AccountPageLayout>
  );
}
