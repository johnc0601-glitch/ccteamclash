import Link from 'next/link';
import {SiteHeader,Footer} from '@/components/SiteHeader';
import {createClient} from '@/lib/supabase/server';
import {canPlayClashChallenge} from '@/services/teamStrength/ClashChallengeBallot';
import {loadClashChallengeBoard} from '@/services/teamStrength/ClashChallengeBoard';
import {loadClashChallengeSeason} from '@/services/teamStrength/ClashChallengeSeason';
import {ClashChallengePicker} from './ClashChallengePicker';
import {ClashChallengeRoundSelect} from './ClashChallengeRoundSelect';
import {ClashChallengeRoundReview} from './ClashChallengeRoundReview';
import styles from './ClashChallenge.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'Clash Challenge | CCTeamClash'};

export default async function ClashChallengePage({
  searchParams,
}:{
  searchParams:Promise<{saved?:string;error?:string;round?:string}>;
}){
  const query=await searchParams;
  const requestedRound=typeof query.round==='string'&&/^\d{1,2}$/.test(query.round)
    ?Number(query.round):null;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=user?await supabase.from('launch_profiles')
    .select('id').eq('user_id',user.id).maybeSingle():{data:null};
  const canPlay=canPlayClashChallenge(user?.id,profile?.id);
  const profileId=canPlay&&profile?profile.id:null;
  const season=await loadClashChallengeSeason(profileId,requestedRound);
  // Only the genuinely active round can freeze a new projection or accept votes.
  const isActive=season.selectedState==='active'
    &&season.selectedRound===season.activeRound;
  const board=isActive?await loadClashChallengeBoard(profileId):null;
  const activeMatches=board?.matches??[];
  const finalized=season.matches.filter(match=>match.homeScore!=null&&match.awayScore!=null);
  const hasRecord=canPlay&&season.selectedState!=='future';
  return <>
    <SiteHeader/>
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroIcon} aria-hidden="true">🏆</div>
        <h1>Clash Challenge</h1>
        <p>Think you know the Clash? Each matchup has one fixed projection. Pick the team you think will outperform it — even if that team doesn’t win the match. Save your picks before tee-off and play for bragging rights!</p>
        {season.selectedRound!=null?<span className={styles.round}>
          Round {season.selectedRound}
          {season.selectedState==='active'?' · Make your picks!'
            :season.selectedState==='future'?' · Upcoming':' · Results'}
        </span>:null}
      </header>
      {query.saved?<p role="status" className={styles.message}>{query.saved}</p>:null}
      {query.error?<p role="alert" className={styles.message+' '+styles.error}>{query.error}</p>:null}
      {season.rounds.length?<ClashChallengeRoundSelect rounds={season.rounds} selectedRound={season.selectedRound}/>:null}
      {hasRecord?<section className={styles.challengeRecords} aria-label="Your Clash Challenge record">
        <strong>Your Challenge record</strong>
        <span>Round {season.selectedRound}: <b>{season.roundRecord.correct}–{season.roundRecord.incorrect}</b>
          {season.roundRecord.pushes?' · '+season.roundRecord.pushes+' pushes':''}
        </span>
        <span>Season: <b>{season.seasonRecord.correct}–{season.seasonRecord.incorrect}</b>
          {season.seasonRecord.pushes?' · '+season.seasonRecord.pushes+' pushes':''}
        </span>
      </section>:null}
      {isActive&&activeMatches.length
        ?<>
          <ClashChallengePicker matches={activeMatches} canPlay={canPlay}/>
          {finalized.length?<ClashChallengeRoundReview
            matches={finalized} state="active" canPlay={canPlay} heading="Completed matchups"
          />:null}
        </>
        :season.matches.length&&season.selectedState
          ?<ClashChallengeRoundReview matches={season.matches}
            state={season.selectedState} canPlay={canPlay}
          />
          :<section className={styles.empty}>
            <h2>No matchups available</h2>
            <p>Check back when the next Clash Challenge round is ready.</p>
            <Link href="/schedule">View league schedule</Link>
          </section>}
    </main>
    <Footer/>
  </>;
}
