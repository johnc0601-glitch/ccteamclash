import {castCommissionerSpreadVote} from '@/app/matches/[id]/spreadVoteActions';
import {isSpreadVoteOpen, roundHomeSpreadLine, spreadLineLabel} from '@/services/teamStrength/SpreadVote';
import {loadCommissionerSpreadVote, signSpreadVoteLine} from '@/services/teamStrength/SpreadVoteStore';
import styles from './CommissionerSpreadVote.module.css';

type Props = {
  matchId: string;
  matchDate: string | null;
  matchTime: string | null;
  matchStatus: string;
  homeName: string;
  awayName: string;
  profileId: string;
  currentHomeMargin: number | null | undefined;
  notice?: string;
  error?: string;
};

export async function CommissionerSpreadVote(props: Props) {
  let saved: Awaited<ReturnType<typeof loadCommissionerSpreadVote>> = null;
  try {
    saved = await loadCommissionerSpreadVote(props.matchId, props.profileId);
  } catch (error) {
    console.error('Commissioner spread vote unavailable.', {matchId: props.matchId, error});
    return <p>Spread voting is temporarily unavailable.</p>;
  }
  const line = saved?.homeLine ?? roundHomeSpreadLine(props.currentHomeMargin);
  if (line === null) return null;
  const open = isSpreadVoteOpen({date: props.matchDate, time: props.matchTime, status: props.matchStatus});
  const canVote = open && line !== 0;
  const total = (saved?.high ?? 0) + (saved?.low ?? 0);
  const highPercent = total ? Math.round(100 * (saved?.high ?? 0) / total) : 0;

  return <section id="commissioner-spread-vote" className={styles.card} aria-label="Commissioner point spread vote">
    <h3>Too High or Too Low?</h3>
    <p className={styles.scope}>Commissioner-only pilot · votes are saved with this match</p>
    <strong className={styles.line}>{spreadLineLabel(line, props.homeName, props.awayName)}</strong>
    <p className={styles.hint}>{saved ? 'Spread locked with the first vote.' : 'Spread locks when the first vote is cast.'}</p>
    {props.notice ? <p className={styles.notice} role="status">{props.notice}</p> : null}
    {props.error ? <p className={styles.error} role="alert">{props.error}</p> : null}
    {canVote ? <form action={castCommissionerSpreadVote} className={styles.buttons}>
      <input type="hidden" name="matchId" value={props.matchId} />
      <input type="hidden" name="lineToken" value={signSpreadVoteLine(props.matchId, line)} />
      <button type="submit" name="choice" value="high" className={saved?.myVote === 'high' ? styles.selected : ''} aria-pressed={saved?.myVote === 'high'}>Too High</button>
      <button type="submit" name="choice" value="low" className={saved?.myVote === 'low' ? styles.selected : ''} aria-pressed={saved?.myVote === 'low'}>Too Low</button>
    </form> : <p className={styles.hint}>{line === 0 ? 'No meaningful spread to vote on yet.' : 'Voting is closed. The selections remain saved.'}</p>}
    {saved?.myVote ? <p className={styles.yourVote}>Your pick: <strong>{saved.myVote === 'high' ? 'Too High' : 'Too Low'}</strong>{canVote ? ' · Change it before match start.' : ''}</p> : null}
    {total ? <div className={styles.results}>
      <div className={styles.resultsHead}><span>Commissioner votes</span><span>{total} total</span></div>
      <div className={styles.track} aria-label={'Too High ' + highPercent + ' percent, Too Low ' + (100 - highPercent) + ' percent'}><span style={{width: highPercent + '%'}} /></div>
      <div className={styles.resultsHead}><span>Too High: {saved?.high} ({highPercent}%)</span><span>Too Low: {saved?.low} ({100 - highPercent}%)</span></div>
    </div> : <p className={styles.hint}>No votes recorded yet.</p>}
  </section>;
}
