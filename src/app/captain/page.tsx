import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import type {LaunchPlayer, LaunchTeam} from '@/domain/launch/LaunchData';
import type {TeamScheduleEvent} from '@/domain/schedule/ScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {confirmTeamApplication, rejectTeamApplication} from './actions';
import styles from './Captain.module.css';

export const dynamic = 'force-dynamic';

type CaptainPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TeamApplication = {
  id: string;
  profileId: string;
  displayName: string;
  playerType: string;
  gender: string;
  createdAt: string;
};

type ApplicationRow = {
  id: string;
  profile_id: string;
  requested_team_id: string;
  player_type: string;
  gender: string;
  status: string;
  created_at: string;
};

type SeasonMembershipRow = {
  player_id: string;
};

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

          {!captainData.ok ? (
            <AccessMessage message={captainData.message} />
          ) : (
            <CaptainDashboard
              events={captainData.events}
              pendingApplications={captainData.pendingApplications}
              roster={captainData.roster}
              team={captainData.team}
            />
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function CaptainDashboard({
  events,
  pendingApplications,
  roster,
  team,
}: {
  events: TeamScheduleEvent[];
  pendingApplications: TeamApplication[];
  roster: LaunchPlayer[];
  team: LaunchTeam;
}) {
  const upcomingEvents = events.filter((event) => event.bucket === 'upcoming');

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
            <span>Captain confirmation</span>
            <h2>Season requests</h2>
            <p className={styles.muted}>Approve or reject players who selected {team.name} during season registration.</p>
          </header>
          <div className={styles.list}>
            {pendingApplications.length ? pendingApplications.map((application) => (
              <article className={styles.row} key={application.id}>
                <strong>{application.displayName}</strong>
                <span className={styles.muted}>
                  {application.playerType} · {application.gender}
                </span>
                <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                  <form action={confirmTeamApplication}>
                    <input name="applicationId" type="hidden" value={application.id} />
                    <button className={styles.primaryButton} type="submit">Approve</button>
                  </form>
                  <form action={rejectTeamApplication}>
                    <input name="applicationId" type="hidden" value={application.id} />
                    <button type="submit">Reject</button>
                  </form>
                </div>
              </article>
            )) : (
              <p className={styles.empty}>No season requests need captain confirmation.</p>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <span>Matchdays</span>
            <h2>Upcoming matches</h2>
            <p className={styles.muted}>Use this section to know where your team is playing next.</p>
          </header>
          <div className={styles.list}>
            {upcomingEvents.length ? upcomingEvents.map((event) => (
              <article className={styles.row} key={event.id}>
                <div className={styles.matchHeading}>
                  <strong>vs {event.opponent}</strong>
                  <span className={styles.sideLabel}>{event.isHome ? 'Home' : 'Away'}</span>
                </div>
                <span className={styles.muted}>{event.date} / {event.time}</span>
                <span className={styles.muted}>{event.course}</span>
                <Link href={`/matches/${event.id}?manage=roster`}>Manage Match Roster</Link>
              </article>
            )) : (
              <p className={styles.empty}>No upcoming matches are posted for your team yet.</p>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <span>Roster</span>
            <h2>{team.name}</h2>
            <p className={styles.muted}>Active players on your current season roster.</p>
          </header>
          <div className={styles.list}>
            {roster.length ? roster.map((player) => (
              <div className={styles.rosterRow} key={player.id}>
                <strong>{player.name}</strong>
                <span className={styles.rosterMeta}>{player.pdgaRating ? `Rating ${player.pdgaRating}` : 'Rating pending'}</span>
              </div>
            )) : (
              <p className={styles.empty}>No players are on this season roster yet.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function SummaryCard({label, value}: {label: string; value: string}) {
  return (
    <article className={styles.quickCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AccessMessage({message}: {message: string}) {
  return (
    <section className={styles.alert}>
      <strong>{message}</strong>
      <p className={styles.muted}>Sign in with the account your commissioner approved for captain access.</p>
      <Link href="/account">Open account page</Link>
    </section>
  );
}

async function getCaptainData(): Promise<
  | {ok: true; team: LaunchTeam; roster: LaunchPlayer[]; events: TeamScheduleEvent[]; pendingApplications: TeamApplication[]}
  | {ok: false; message: string}
> {
  if (!hasSupabaseConfig()) return {ok: false, message: 'League accounts are not configured yet.'};

  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return {ok: false, message: 'Sign in to open Captain Home.'};

    const repository = new SupabaseLaunchRepository(supabase);
    const profile = await repository.getProfileByUserId(user.id);
    if (!profile || profile.status !== 'Approved') return {ok: false, message: 'Captain access is not approved yet.'};
    if (profile.role !== 'Captain' && profile.role !== 'Commissioner') {
      return {ok: false, message: 'Captain access is required.'};
    }
    if (!profile.captainTeamId) return {ok: false, message: 'No captain team has been assigned yet.'};

    const scheduleService = await createServerScheduleService();
    const [team, players, events, activeSeason] = await Promise.all([
      repository.getTeam(profile.captainTeamId),
      repository.getPlayers(),
      scheduleService.getTeamEvents(profile.captainTeamId),
      supabase
        .from('launch_seasons')
        .select('id')
        .eq('active', true)
        .eq('published', true)
        .order('year', {ascending: false})
        .limit(1)
        .maybeSingle(),
    ]);

    if (!team) return {ok: false, message: 'Captain team could not be found.'};
    if (activeSeason.error) throw activeSeason.error;

    const launchSupabase = supabase as any;
    const seasonId = activeSeason.data?.id ?? null;

    const [{data: applicationRows, error: applicationError}, {data: membershipRows, error: membershipError}] = seasonId
      ? await Promise.all([
        launchSupabase
          .from('launch_player_applications')
          .select('id, profile_id, requested_team_id, player_type, gender, status, created_at')
          .eq('season_id', seasonId)
          .eq('requested_team_id', team.id)
          .eq('status', 'Pending')
          .order('created_at', {ascending: true}),
        launchSupabase
          .from('launch_season_roster_memberships')
          .select('player_id')
          .eq('season_id', seasonId)
          .eq('team_id', team.id)
          .eq('status', 'Active'),
      ])
      : [
        {data: [] as ApplicationRow[], error: null},
        {data: [] as SeasonMembershipRow[], error: null},
      ];

    if (applicationError) throw applicationError;
    if (membershipError) throw membershipError;

    const pendingRows = (applicationRows ?? []) as ApplicationRow[];
    const profileIds = [...new Set(pendingRows.map((application) => application.profile_id))];
    const profiles = profileIds.length
      ? (await supabase.from('launch_profiles').select('id, display_name').in('id', profileIds)).data ?? []
      : [];
    const profileNames = new Map(profiles.map((candidate) => [candidate.id, candidate.display_name]));

    const pendingApplications = pendingRows.map((application): TeamApplication => ({
      id: application.id,
      profileId: application.profile_id,
      displayName: profileNames.get(application.profile_id) ?? 'Unknown player',
      playerType: application.player_type,
      gender: application.gender,
      createdAt: application.created_at,
    }));

    const rosterPlayerIds = new Set(
      ((membershipRows ?? []) as SeasonMembershipRow[]).map((membership) => membership.player_id),
    );

    return {
      ok: true,
      team,
      roster: players.filter((player) => player.active && rosterPlayerIds.has(player.id)),
      events: events.filter((event) => event.homeTeamId === team.id || event.awayTeamId === team.id),
      pendingApplications,
    };
  } catch {
    return {ok: false, message: 'Captain Home could not load right now.'};
  }
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
