import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import styles from './MatchFeedLab.module.css';

type MatchRow = {
  id: string;
  date: string | null;
  time: string | null;
  status: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

type TeamRow = {id: string; name: string};

export const dynamic = 'force-dynamic';

export default async function MatchFeedLabIndex() {
  const supabase = await createClient();
  const db = supabase as any;
  const [{data: matches}, {data: teams}] = await Promise.all([
    db.from('launch_schedule_matches').select('id,date,time,status,home_team_id,away_team_id').order('date', {ascending: false}).limit(30),
    db.from('launch_teams').select('id,name'),
  ]);

  const teamNames = new Map<string, string>((teams ?? []).map((team: TeamRow) => [team.id, team.name]));

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className={styles.meta}>Commissioner-only prototype</span>
        <h1>Match Feed Lab</h1>
        <p>Pick any existing match to test the compact post, photo, reaction, comment, and reply experience. Nothing here changes the public Matchday page.</p>
      </header>

      <div className={styles.matchList}>
        {(matches as MatchRow[] | null)?.map((match) => {
          const away = match.away_team_id ? teamNames.get(match.away_team_id) ?? match.away_team_id : 'TBD';
          const home = match.home_team_id ? teamNames.get(match.home_team_id) ?? match.home_team_id : 'TBD';
          return (
            <Link key={match.id} href={`/office/match-feed/${encodeURIComponent(match.id)}`} className={styles.matchLink}>
              <span>
                <strong>{away} @ {home}</strong>
                <span className={styles.matchMeta}> · {match.date ?? 'Date TBD'} {match.time ? `· ${match.time.slice(0, 5)}` : ''}</span>
              </span>
              <span className={styles.meta}>{match.status}</span>
            </Link>
          );
        })}
        {!matches?.length ? <div className={styles.empty}>No schedule matches are available in this environment.</div> : null}
      </div>
    </section>
  );
}
