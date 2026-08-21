import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import type {LaunchPlayer, LaunchTeam} from '@/domain/launch/LaunchData';
import type {TeamScheduleEvent} from '@/domain/schedule/ScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {confirmTeamApplication, rejectTeamApplication, returnRosteredPlayerToCommissioner, saveTeamAppearance} from './actions';
import styles from './Captain.module.css';

export const dynamic = 'force-dynamic';

type CaptainPageProps = {searchParams?: Promise<Record<string, string | string[] | undefined>>};
type TeamApplication = {id: string; profileId: string; displayName: string; playerType: string; gender: string; createdAt: string};
type ApplicationRow = {id: string; profile_id: string; requested_team_id: string; player_type: string; gender: string; status: string; created_at: string};
type SeasonMembershipRow = {player_id: string};

export default async function CaptainPage({searchParams}: CaptainPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readParam(params.notice);
  const error = readParam(params.error);
  const captainData = await getCaptainData();

  return (
    <main>
      <SiteHeader />
      <section className={styles.page}>
        <div className="shell">
          <header className={styles.header}>
            <span>Captain home</span>
            <h1>Team control</h1>
            <p>See your roster and match schedule from one simple captain screen.</p>
          </header>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {!captainData.ok ? <AccessMessage message={captainData.message} /> : (
            <CaptainDashboard events={captainData.events} pendingApplications={captainData.pendingApplications} roster={captainData.roster} team={captainData.team} />
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function CaptainDashboard({events, pendingApplications, roster, team}: {events: TeamScheduleEvent[]; pendingApplications: TeamApplication[]; roster: LaunchPlayer[]; team: LaunchTeam}) {
  const upcomingEvents = events.filter((event) => event.bucket === 'upcoming');
  const primaryColor = team.primaryColor || '#006f71';
  const secondaryColor = team.secondaryColor || '#f4f6f2';

  return (
    <>
      <div className={styles.summaryGrid}>
        <SummaryCard label="Team" value={team.name} />
        <SummaryCard label="Roster" value={`${roster.length} players`} />
        <SummaryCard label="Confirm" value={`${pendingApplications.length} pending`} />
        <SummaryCard label="Upcoming" value={`${upcomingEvents.length} matches`} />
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <span>Team appearance</span>
            <h2>Brand your team</h2>
            <p className={styles.muted}>Your logo and colors are used on Teams and Rankings.</p>
          </header>
          <form action={saveTeamAppearance} className={styles.appearanceForm}>
            <div className={styles.brandPreview} style={{borderColor: primaryColor, background: secondaryColor}}>
              {team.logo ? <img src={team.logo} alt={`${team.name} logo`} /> : <div className={styles.logoPlaceholder}>{team.shortName}</div>}
              <div><strong>{team.name}</strong><span>Live team preview</span></div>
            </div>
            <label className={styles.fileField}>
              <span>Team logo</span>
              <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
              <small>PNG, JPG, WebP or SVG. Uploading replaces the current logo.</small>
            </label>
            <div className={styles.colorGrid}>
              <label><span>Primary color</span><input name="primaryColor" type="color" defaultValue={primaryColor} /></label>
              <label><span>Secondary color</span><input name="secondaryColor" type="color" defaultValue={secondaryColor} /></label>
            </div>
            <button className={styles.primaryButton} type="submit">Save appearance</button>
          </form>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}><span>Matchdays</span><h2>Upcoming matches</h2><p className={styles.muted}>Use this section to know where your team is playing next.</p></header>
          <div className={styles.list}>{upcomingEvents.length ? upcomingEvents.map((event) => (
            <article className={styles.row} key={event.id}>
              <div className={styles.matchHeading}><strong>vs {event.opponent}</strong><span className={styles.sideLabel}>{event.isHome ? 'Home' : 'Away'}</span></div>
              <span className={styles.muted}>{event.date} / {event.time}</span><span className={styles.muted}>{event.course}</span>
              <Link href={`/matches/${event.id}?manage=roster`}>Manage Match Roster</Link>
            </article>
          )) : <p className={styles.empty}>No upcoming matches are posted for your team yet.</p>}</div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}><span>Captain confirmation</span><h2>Season requests</h2><p className={styles.muted}>Confirm Male/Female and Junior status before approving players for {team.name}.</p></header>
          <div className={styles.list}>{pendingApplications.length ? pendingApplications.map((application) => (
            <article className={styles.row} key={application.id}>
              <strong>{application.displayName}</strong>
              <form action={confirmTeamApplication} style={{display: 'grid', gap: '10px'}}>
                <input name="applicationId" type="hidden" value={application.id} />
                <label style={{display: 'grid', gap: '4px'}}><span className={styles.muted}>Male / Female</span><select name="gender" required defaultValue={application.gender === 'Male' || application.gender === 'Female' ? application.gender : ''}><option value="" disabled>Choose</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}><input name="playerType" type="checkbox" value="Junior" defaultChecked={application.playerType === 'Junior'} style={{width: 'auto', minHeight: 'auto'}} /><input name="playerType" type="hidden" value="Adult" /><span className={styles.muted}>Junior</span></label>
                <button className={styles.primaryButton} type="submit">Approve</button>
              </form>
              <form action={rejectTeamApplication}><input name="applicationId" type="hidden" value={application.id} /><button type="submit">Reject</button></form>
            </article>
          )) : <p className={styles.empty}>No season requests need captain confirmation.</p>}</div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}><span>Roster</span><h2>{team.name}</h2><p className={styles.muted}>Remove sends a player to the commissioner for removal or reassignment.</p></header>
          <div className={styles.list}>{roster.length ? roster.map((player) => (
            <div className={styles.rosterRow} key={player.id}>
              <div><strong>{player.name}</strong><span className={styles.rosterMeta}>CI: {formatClashIndex(player)}</span></div>
              <form action={returnRosteredPlayerToCommissioner}>
                <input name="playerId" type="hidden" value={player.id} />
                <button type="submit">Remove</button>
              </form>
            </div>
          )) : <p className={styles.empty}>No players are on this season roster yet.</p>}</div>
        </section>
      </div>
    </>
  );
}

function formatClashIndex(player: LaunchPlayer): string {
  if (player.clashIndex == null) return '—';
  const ghost = player.clashIndexProvisional === true || (
    player.pdgaRating == null
    && ((player.gender === 'Female' && player.clashIndex === 725)
      || (player.gender === 'Male' && player.clashIndex === 850))
  );
  return `${player.clashIndex}${ghost ? '*' : ''}`;
}

function SummaryCard({label, value}: {label: string; value: string}) {return <article className={styles.quickCard}><span>{label}</span><strong>{value}</strong></article>;}
function AccessMessage({message}: {message: string}) {return <section className={styles.alert}><strong>{message}</strong><p className={styles.muted}>Sign in with the account your commissioner approved for captain access.</p><Link href="/account">Open account page</Link></section>;}

async function getCaptainData(): Promise<{ok: true; team: LaunchTeam; roster: LaunchPlayer[]; events: TeamScheduleEvent[]; pendingApplications: TeamApplication[]} | {ok: false; message: string}> {
  if (!hasSupabaseConfig()) return {ok: false, message: 'League accounts are not configured yet.'};
  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return {ok: false, message: 'Sign in to open Captain Home.'};
    const repository = new SupabaseLaunchRepository(supabase);
    const profile = await repository.getProfileByUserId(user.id);
    if (!profile || profile.status !== 'Approved') return {ok: false, message: 'Captain access is not approved yet.'};
    if (profile.role !== 'Captain' && profile.role !== 'Commissioner') return {ok: false, message: 'Captain access is required.'};
    if (!profile.captainTeamId) return {ok: false, message: 'No captain team has been assigned yet.'};

    const scheduleService = await createServerScheduleService();
    const [baseTeam, players, events, activeSeason, branding] = await Promise.all([
      repository.getTeam(profile.captainTeamId), repository.getPlayers(), scheduleService.getTeamEvents(profile.captainTeamId),
      supabase.from('launch_seasons').select('id').eq('active', true).eq('published', true).order('year', {ascending: false}).limit(1).maybeSingle(),
      (supabase as any).from('launch_teams').select('logo, primary_color, secondary_color').eq('id', profile.captainTeamId).maybeSingle(),
    ]);
    if (!baseTeam) return {ok: false, message: 'Captain team could not be found.'};
    if (activeSeason.error) throw activeSeason.error;
    if (branding.error) throw branding.error;
    const team: LaunchTeam = {...baseTeam, logo: branding.data?.logo || baseTeam.logo, primaryColor: branding.data?.primary_color || '#006f71', secondaryColor: branding.data?.secondary_color || '#f4f6f2'};
    const launchSupabase = supabase as any;
    const seasonId = activeSeason.data?.id ?? null;
    const [{data: applicationRows, error: applicationError}, {data: membershipRows, error: membershipError}] = seasonId ? await Promise.all([
      launchSupabase.from('launch_player_applications').select('id, profile_id, requested_team_id, player_type, gender, status, created_at').eq('season_id', seasonId).eq('requested_team_id', team.id).eq('status', 'Pending').order('created_at', {ascending: true}),
      launchSupabase.from('launch_season_roster_memberships').select('player_id').eq('season_id', seasonId).eq('team_id', team.id).eq('status', 'Active'),
    ]) : [{data: [] as ApplicationRow[], error: null}, {data: [] as SeasonMembershipRow[], error: null}];
    if (applicationError) throw applicationError;
    if (membershipError) throw membershipError;
    const pendingRows = (applicationRows ?? []) as ApplicationRow[];
    const profileIds = [...new Set(pendingRows.map((application) => application.profile_id))];
    const profiles = profileIds.length ? (await supabase.from('launch_profiles').select('id, display_name').in('id', profileIds)).data ?? [] : [];
    const profileNames = new Map(profiles.map((candidate) => [candidate.id, candidate.display_name]));
    const pendingApplications = pendingRows.map((application): TeamApplication => ({id: application.id, profileId: application.profile_id, displayName: profileNames.get(application.profile_id) ?? 'Unknown player', playerType: application.player_type, gender: application.gender, createdAt: application.created_at}));
    const rosterPlayerIds = new Set(((membershipRows ?? []) as SeasonMembershipRow[]).map((membership) => membership.player_id));
    return {ok: true, team, roster: players.filter((player) => player.active && rosterPlayerIds.has(player.id)), events: events.filter((event) => event.homeTeamId === team.id || event.awayTeamId === team.id), pendingApplications};
  } catch {return {ok: false, message: 'Captain Home could not load right now.'};}
}

function readParam(value: string | string[] | undefined): string | undefined {return Array.isArray(value) ? value[0] : value;}
