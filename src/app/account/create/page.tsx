import Link from 'next/link';
import {redirect} from 'next/navigation';
import {AccountPageLayout, readAccountParam} from '../AccountPageLayout';
import {PasswordField, SubmitButton} from '../AuthFormControls';
import {createLeagueAccount} from '../actions';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import styles from '../Account.module.css';

type CreateAccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CreateAccountPage({searchParams}: CreateAccountPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = readAccountParam(params.error);
  const notice = readAccountParam(params.notice);

  let season: {id: string; name: string} | null = null;
  let teams: {id: string; name: string}[] = [];

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {data} = await supabase.auth.getUser();
    if (data.user) redirect('/account');

    const {data: openSeason} = await supabase
      .from('launch_seasons')
      .select('id, name')
      .eq('registration_open', true)
      .eq('active', true)
      .eq('published', true)
      .order('year', {ascending: false})
      .limit(1)
      .maybeSingle();
    season = openSeason;

    if (season) {
      const {data: seasonTeams} = await supabase
        .from('launch_season_teams')
        .select('team_id')
        .eq('season_id', season.id);
      const teamIds = (seasonTeams ?? []).map((item) => item.team_id);
      if (teamIds.length) {
        const {data: teamRows} = await supabase
          .from('launch_teams')
          .select('id, name')
          .in('id', teamIds)
          .order('name');
        teams = teamRows ?? [];
      }
    }
  }

  return (
    <AccountPageLayout
      description="Create your league login and submit your registration for commissioner approval."
      error={error}
      narrow
      notice={notice}
      title="Register"
    >
      <article className={styles.panel}>
        {!season ? (
          <p className={styles.muted}>Registration is not currently open.</p>
        ) : (
          <form className={styles.form} action={createLeagueAccount}>
            <input name="seasonId" type="hidden" value={season.id} />
            <p className={styles.linkingNote}><strong>{season.name}</strong></p>

            <label htmlFor="signupName">Your name</label>
            <input id="signupName" name="displayName" autoComplete="name" required />

            <label htmlFor="signupTeam">Requested team</label>
            <select id="signupTeam" name="requestedTeamId" required defaultValue="">
              <option value="" disabled>Choose a team</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>

            <label htmlFor="signupPlayerType">Player type</label>
            <select id="signupPlayerType" name="playerType" required defaultValue="Adult">
              <option value="Adult">Adult</option>
              <option value="Junior">Junior</option>
            </select>

            <label htmlFor="signupGender">Division</label>
            <select id="signupGender" name="gender" required defaultValue="">
              <option value="" disabled>Choose division</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <label htmlFor="signupPlayedBefore">Have you played Coastal Clash before?</label>
            <select id="signupPlayedBefore" name="playedBefore" required defaultValue="">
              <option value="" disabled>Choose one</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            <label htmlFor="signupEmail">Email address</label>
            <input id="signupEmail" name="email" type="email" autoComplete="email" required />
            <PasswordField
              autoComplete="new-password"
              id="signupPassword"
              label="Create password"
              minLength={8}
              name="password"
            />
            <PasswordField
              autoComplete="new-password"
              id="confirmPassword"
              label="Confirm password"
              minLength={8}
              name="confirmPassword"
            />
            <SubmitButton pendingLabel="Submitting registration...">Create account & register</SubmitButton>
          </form>
        )}
        <p className={styles.authAlternative}>
          Already have an account? <Link href="/account">Sign in</Link>
        </p>
      </article>
    </AccountPageLayout>
  );
}
