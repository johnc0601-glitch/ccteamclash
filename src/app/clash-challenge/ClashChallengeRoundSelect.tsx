'use client';

import {useRouter} from 'next/navigation';
import type {ChallengeRoundOption} from '@/services/teamStrength/ClashChallengeHistory';
import styles from './ClashChallenge.module.css';

type Props={rounds:ChallengeRoundOption[];selectedRound:number|null};

export function ClashChallengeRoundSelect({rounds,selectedRound}:Props){
  const router=useRouter();
  return <div className={styles.roundSelectRow}>
    <label htmlFor="clash-round-select">Choose round</label>
    <select
      id="clash-round-select"
      className={styles.roundSelect}
      value={selectedRound??''}
      onChange={event=>router.push('/clash-challenge?round='+encodeURIComponent(event.target.value))}
    >
      {rounds.map(round=><option key={round.number} value={round.number}>
        Round {round.number}{round.state==='active'?' · Current':round.state==='future'?' · Upcoming':' · Completed'}
      </option>)}
    </select>
  </div>;
}
