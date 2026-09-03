import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createClient} from '@/lib/supabase/server';
import {claimFreeAgent} from './actions';
import styles from '../Captain.module.css';

export const dynamic = 'force-dynamic';

type FreeAgentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FreeAgent = {
  application_id: string;
  season_id: string;
  player_id: string;
  display_name: string;
  player_name: string;
  player_type: string;
  gender: string;
  pdga_number: string;
  pdga_rating: number | null;
  clash_index: number | null;
  home_area: string;
  created_at: string;
};

type FreeAgentListClient = {
  rpc: (
    fn: 'captain_list_launch_free_agents',
  ) => Promise<{data: FreeAgent[] | null; error: {message: string} | null}>;
};

export default async function FreeAgentsPage({searchParams}: FreeAgentsPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readParam(params.notice);
  const errorParam = readParam(params.error);
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  let freeAgents: FreeAgent[] = [];
  let accessError: string | undefined;

  if (!user) {
    accessError = 'Sign in with an approved captain account to view Free Agents.';
  } else {
    const {data, error} = await (supabase as unknown as FreeAgentListClient).rpc('captain_list_launch_free_agents');
    if (error) accessError = error.message;
    else freeAgents = data ?? [];
  }

  return (
    <main>
      <SiteHeader />
      <section className={styles.page}>
        <div className="shell">
          <header className={styles.header}>
            <span>Captain recruiting</span>
            <h1>Free Agents</h1>
            <p>Players here are registered for the active season but do not have a team yet.</p>
            <Link href="/captain">Back to Captain Home</Link>
          </header>

          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {errorParam ? <p className={styles.error}>{errorParam}</p> : null}

          {accessError ? (
            <section className={styles.alert}>
              <strong>{accessError}</strong>
              <p className={styles.muted}>Free Agent details are available only to approved captains and commissioners.</p>
              <Link href="/account">Open account page</Link>
            </section>
          ) : (
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <span>Available players</span>
                <h2>{freeAgents.length} in the pool</h2>
                <p className={styles.muted}>Select a player to move that application to your team&apos;s normal approval list.</p>
              </header>
              <div className={styles.list}>
                {freeAgents.length ? freeAgents.map((player) => (
                  <article className={styles.row} key={player.application_id}>
                    <strong>{player.player_name || player.display_name}</strong>
                    <span className={styles.rosterMeta}>
                      CI: {player.clash_index ?? '—'} · PDGA: {player.pdga_rating ?? '—'}
                      {player.pdga_number ? ` · #${player.pdga_number}` : ''}
                    </span>
                    <span className={styles.muted}>
                      {player.gender} · {player.player_type}
                      {player.home_area ? ` · ${player.home_area}` : ''}
                    </span>
                    <span className={styles.muted}>Entered Free Agency {formatDate(player.created_at)}</span>
                    <form action={claimFreeAgent}>
                      <input name="applicationId" type="hidden" value={player.application_id} />
                      <button className={styles.primaryButton} type="submit">Move to My Team</button>
                    </form>
                  </article>
                )) : <p className={styles.empty}>No players are in Free Agency right now.</p>}
              </div>
            </section>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}
