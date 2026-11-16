import Link from 'next/link';
import {SiteHeader,Footer} from '@/components/SiteHeader';
import {createClient} from '@/lib/supabase/server';
import {canPlayClashChallenge} from '@/services/teamStrength/ClashChallengeBallot';
import {loadClashChallengeBoard} from '@/services/teamStrength/ClashChallengeBoard';
import {ClashChallengePicker} from './ClashChallengePicker';
import styles from './ClashChallenge.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'Clash Challenge | CCTeamClash'};

export default async function ClashChallengePage({
  searchParams,
}:{
  searchParams:Promise<{saved?:string;error?:string}>;
}) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=user?await supabase.from('launch_profiles')
    .select('id').eq('user_id',user.id).maybeSingle():{data:null};
  const canPlay=canPlayClashChallenge(user?.id,profile?.id);
  const board=await loadClashChallengeBoard(canPlay&&profile?profile.id:null);
  const query=await searchParams;
  return <>
    <SiteHeader/>
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroIcon} aria-hidden="true">🏆</div>
        <h1>Clash Challenge</h1>
        <p>Think you know the Clash? Each matchup has one fixed projection. Pick the team you think will outperform it — even if that team doesn’t win the match. Save your picks before tee-off and play for bragging rights!</p>
        {board.roundNumber!=null?<span className={styles.round}>Round {board.roundNumber} · Make your picks!</span>:null}
      </header>
      {query.saved?<p role="status" className={styles.message}>{query.saved}</p>:null}
      {query.error?<p role="alert" className={styles.message+' '+styles.error}>{query.error}</p>:null}
      {board.matches.length
        ? <ClashChallengePicker matches={board.matches} canPlay={canPlay}/>
        : <section className={styles.empty}>
          <h2>No open matchups right now</h2>
          <p>Check back when the next matchups are ready.</p>
          <Link href="/schedule">View league schedule</Link>
        </section>}
    </main>
    <Footer/>
  </>;
}
