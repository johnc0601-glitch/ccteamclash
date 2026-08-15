import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import type {LaunchPlayer, LaunchTeam, PlayerClaim} from '@/domain/launch/LaunchData';
import type {TeamScheduleEvent} from '@/domain/schedule/ScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {confirmTeamClaim} from './actions';
import {PendingSubmitButton} from '@/components/forms/PendingSubmitButton';
import {SeasonRosterManagement} from '@/components/season-rosters/SeasonRosterManagement';
import type {Season} from '@/domain/season/Season';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {SeasonRosterService} from '@/domain/season-roster/SeasonRosterService';
import {SupabaseSeasonRosterRepository} from '@/domain/season-roster/SupabaseSeasonRosterRepository';
import {
  buildSeasonRosterTeamViews,
  type SeasonRosterTeamView,
} from '@/domain/season-roster/SeasonRosterPresentation';
import styles from './Captain.module.css';

export const dynamic = 'force-dynamic';

type CaptainPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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
            <>
              <CaptainDashboard
                events={captainData.events}
                pendingClaims={captainData.pendingClaims}
                roster={captainData.roster}
                team={captainData.team}
              />
              {captainData.seasonRoster ? (
                <div className={styles.seasonRoster}>
                  <SeasonRosterManagement
                    season={captainData.seasonRoster.season}
                    teamViews={captainData.seasonRoster.teamViews}
                    returnPath="/captain"
                    notice={readParam(params.rosterNotice)}
                    error={readParam(params.rosterError)}
                  />
                </div>
              ) : (
                <section className={styles.alert}>
                  <strong>No active season roster is available.</strong>
                </section>
              )}
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function CaptainDashboard({
  events,
  pendingClaims,
  roster,
  team,
}: {
  events: TeamScheduleEvent[];
  pendingClaims: PlayerClaim[];
  roster: LaunchPlayer[];
  team: LaunchTeam;
}) {
  const upcomingEvents = events.filter((event) => event.bucket === 'upcoming');

  return (
    <>
      <div className={styles.summaryGrid}>
        <SummaryCard label="Team" value={team.name} />
        <SummaryCard label="Directory" value={`${roster.length} assigned`} />
        <SummaryCard label="Confirm" value={`${pendingClaims.length} pending`} />
        <SummaryCard label="Upcoming" value={`${upcomingEvents.length} matches`} />
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <span>Captain confirmation</span>
            <h2>Roster requests</h2>
            <p className={styles.muted}>Approve players who claimed a record already assigned to your team.</p>
          </header>
          <div className={styles.list}>
            {pendingClaims.length ? pendingClaims.map((claim) => (
              <article className={styles.row} key={claim.id}>
                <strong>{claim.submittedName}</strong>
                <span className={styles.muted}>{claim.submittedPdgaNumber ? `PDGA #${claim.submittedPdgaNumber}` : 'No PDGA number submitted'}</span>
                <form action={confirmTeamClaim}>
                  <input name="claimId" type="hidden" value={claim.id} />
                  <PendingSubmitButton className={styles.primaryButton} pendingLabel="Confirming player...">Confirm player</PendingSubmitButton>
                </form>
              </article>
            )) : (
              <p className={styles.empty}>No player requests need captain confirmation.</p>
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
            <span>Player directory</span>
            <h2>{team.name}</h2>
            <p className={styles.muted}>Current directory assignments. Season roster membership is managed below.</p>
          </header>
          <div className={styles.list}>
            {roster.length ? roster.map((player) => (
              <div className={styles.rosterRow} key={player.id}>
                <strong>{player.name}</strong>
                <span className={styles.rosterMeta}>{player.pdgaRating ? `Rating ${player.pdgaRating}` : 'Rating pending'}</span>
              </div>
            )) : (
              <p className={styles.empty}>No players are assigned to this team yet.</p>
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
  | {
    ok: true;
    team: LaunchTeam;
    roster: LaunchPlayer[];
    events: TeamScheduleEvent[];
    pendingClaims: PlayerClaim[];
    seasonRoster?: {season: Season; teamViews: SeasonRosterTeamView[]};
  }
  | {ok: false; message: string}
> {
  if (!hasSupabaseConfig()) return {ok: false, message: 'League accounts are not configured yet.'};

  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return {ok: false, message: 'Sign in to open Captain Home.'};

    const repository = new SupabaseLaunchRepository(supabase);
    const seasonRepository = new SupabaseSeasonRepository(supabase);
    const seasonRosterService = new SeasonRosterService(new SupabaseSeasonRosterRepository(supabase));
    const profile = await repository.getProfileByUserId(user.id);
    if (!profile || profile.status !== 'Approved') return {ok: false, message: 'Captain access is not approved yet.'};
    if (profile.role !== 'Captain' && profile.role !== 'Commissioner') {
      return {ok: false, message: 'Captain access is required.'};
    }
    if (!profile.captainTeamId) return {ok: false, message: 'No captain team has been assigned yet.'};

    const scheduleService = await createServerScheduleService();
    const [team, players, events, claims, activeSeason] = await Promise.all([
      repository.getTeam(profile.captainTeamId),
      repository.getPlayers(),
      scheduleService.getTeamEvents(profile.captainTeamId),
      repository.getPlayerClaims(),
      seasonRepository.getActive(),
    ]);

    if (!team) return {ok: false, message: 'Captain team could not be found.'};
    const teamPlayerIds = new Set(players.filter((player) => player.currentTeamId === team.id).map((player) => player.id));

    let seasonRoster: {season: Season; teamViews: SeasonRosterTeamView[]} | undefined;
    if (activeSeason) {
      const [seasonTeams, memberships, teams] = await Promise.all([
        seasonRosterService.listSeasonTeams(activeSeason.id),
        seasonRosterService.listMemberships(activeSeason.id),
        repository.getTeams(),
      ]);
      seasonRoster = {
        season: activeSeason,
        teamViews: buildSeasonRosterTeamViews({
          season: activeSeason,
          seasonTeams,
          memberships,
          teams,
          players,
          viewer: {role: 'Captain', teamId: team.id},
        }),
      };
    }

    return {
      ok: true,
      team,
      roster: players.filter((player) => player.active && player.currentTeamId === team.id),
      events: events.filter((event) => event.homeTeamId === team.id || event.awayTeamId === team.id),
      pendingClaims: claims.filter((claim) => claim.status === 'Pending' && claim.requestedPlayerId && teamPlayerIds.has(claim.requestedPlayerId)),
      seasonRoster,
    };
  } catch {
    return {ok: false, message: 'Captain Home could not load right now.'};
  }
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
