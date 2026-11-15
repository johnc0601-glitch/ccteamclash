import Link from 'next/link';
import {SiteHeader,Footer} from '@/components/SiteHeader';
import {createClient} from '@/lib/supabase/server';
import {isRegisteredClashPlayer} from '@/services/teamStrength/ClashChallengeBallot';
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
    .select('id,role,status,player_id').eq('user_id',user.id).maybeSingle():{data:null};
  const canPlay=Boolean(user&&isRegisteredClashPlayer({
    role:profile?.role,status:profile?.status,playerId:profile?.player_id,
  }));
  const board=await loadClashChallengeBoard(canPlay&&profile?profile.id:null);
  const query=await searchParams;
  return <>
    <SiteHeader/>
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroIcon} aria-hidden="true">🏆</div>
        <h1>Clash Challenge</h1>
        <p>Pick the teams you think will outperform the projected match results.</p>
        {board.roundNumber!=null?<span className={styles.round}>Round {board.roundNumber} · Make your picks!</span>:null}
      </header>
      {board.nextOpenAt && board.matches.length ? <p className={styles.nextRoundNotice}>
        <strong>Next round unlocks </strong>
        {new Date(board.nextOpenAt).toLocaleString('en-US', {
          timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric',
          hour:'numeric',minute:'2-digit',
        })} Eastern. Only the current round’s remaining matchups are open today.
      </p> : null}
      {query.saved?<p role="status" className={styles.message}>{query.saved}</p>:null}
      {query.error?<p role="alert" className={styles.message+' '+styles.error}>{query.error}</p>:null}
      {board.matches.length
        ? <ClashChallengePicker matches={board.matches} canPlay={canPlay}/>
        : <section className={styles.empty}>
          <h2>{board.nextOpenAt?'Next round coming soon':'No open matchups right now'}</h2>
          {board.nextOpenAt?<p>Next round opens {new Date(board.nextOpenAt).toLocaleString('en-US',{
            timeZone:'America/New_York',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',
          })} Eastern.</p>
            :<p>The challenge will reopen when the next featured round is available.</p>}
          <Link href="/schedule">View league schedule</Link>
        </section>}
    </main>
    <Footer/>
  </>;
}
