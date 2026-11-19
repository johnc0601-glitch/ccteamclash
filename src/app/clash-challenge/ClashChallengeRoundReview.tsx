import Link from 'next/link';
import type {ChallengeHistoryMatch,ChallengeRoundState} from '@/services/teamStrength/ClashChallengeHistory';
import styles from './ClashChallenge.module.css';

type Props={
  matches:ChallengeHistoryMatch[];
  state:ChallengeRoundState;
  canPlay:boolean;
  heading?:string;
};

const score=(value:number)=>Number.isInteger(value)?String(value):value.toFixed(1);

function readableDate(date:string){
  const [year,month,day]=date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US',{
    month:'short',day:'numeric',timeZone:'UTC',
  }).format(new Date(Date.UTC(year,month-1,day)));
}

function outcomeLabel(outcome:ChallengeHistoryMatch['outcome']):string{
  switch(outcome){
    case 'correct':return 'Correct pick';
    case 'incorrect':return 'Incorrect pick';
    case 'push':return 'Push — no winner';
    case 'pending':return 'Awaiting final result';
    case 'not-offered':return 'Challenge not offered';
    default:return 'No pick';
  }
}

export function ClashChallengeRoundReview({matches,state,canPlay,heading}:Props){
  if(!matches.length)return <section className={styles.empty}>
    <p>No matchups are available for this round.</p>
  </section>;
  return <section className={styles.roundReview}>
    {heading?<h2 className={styles.reviewHeading}>{heading}</h2>:null}
    <div className={styles.reviewList}>
      {matches.map(match=>{
        const finalized=match.homeScore!=null&&match.awayScore!=null;
        const showProjections=state!=='future'&&match.homeLine!=null;
        const favorite=match.homeLine!=null
          ?match.homeLine>0?match.homeName:match.awayName:null;
        return <article key={match.matchId} className={styles.reviewCard}>
          <div className={styles.reviewTop}>
            <span>{readableDate(match.date)}</span>
            <span>{finalized?'Final':state==='future'?'Scheduled':'Awaiting result'}</span>
          </div>
          <div className={styles.reviewTeams}>
            <strong>{match.homeName}</strong>
            {finalized
              ?<span className={styles.reviewScore}>{score(match.homeScore!)}–{score(match.awayScore!)}</span>
              :<span className={styles.reviewVersus}>vs</span>}
            <strong>{match.awayName}</strong>
          </div>
          {showProjections
            ?<p className={styles.reviewProjection}>Original projection: {favorite} by {Math.abs(match.homeLine!).toFixed(1)}</p>
            :null}
          {state!=='future'?<div className={styles.reviewPickRow}>
            {canPlay?<span>{match.myChoice
              ?'Your locked pick: '+(match.selectedTeamName??'Recorded selection')
              :match.outcome==='not-offered'?'No Challenge was offered':'No pick recorded'}</span>
              :<span><Link href="/account">Sign in</Link> to review your picks</span>}
            {canPlay?<span className={styles.reviewOutcome} data-outcome={match.outcome}>
              {outcomeLabel(match.outcome)}
            </span>:null}
          </div>:<p className={styles.reviewUpcoming}>Projections and picks will appear when this round opens.</p>}
          <Link className={styles.matchLink} href={match.matchHref}>View match details</Link>
        </article>;
      })}
    </div>
  </section>;
}
