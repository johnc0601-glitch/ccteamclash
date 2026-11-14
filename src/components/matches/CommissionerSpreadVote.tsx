import {castCommissionerSpreadVote} from '@/app/matches/[id]/spreadVoteActions';
import {getSpreadCoverOptions, isSpreadVoteOpen, roundHomeSpreadLine, spreadLineLabel} from '@/services/teamStrength/SpreadVote';
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
  /** Renders the commissioner controls inside the public Clash Line card. */
  embedded?: boolean;
};

export async function CommissionerSpreadVote(props: Props) {
  let saved: Awaited<ReturnType<typeof loadCommissionerSpreadVote>> = null;
  try {
    saved = await loadCommissionerSpreadVote(props.matchId, props.profileId);
  } catch (error) {
    console.error('Commissioner spread challenge unavailable.', {matchId: props.matchId, error});
    return <p>Clash Challenge is temporarily unavailable.</p>;
  }

  // Frozen voting lines take precedence over subsequent changes to public estimates.
  const line = saved?.currentHomeLine ?? roundHomeSpreadLine(props.currentHomeMargin);
  if (line === null) return null;
  const options = line === 0 ? null : getSpreadCoverOptions(line, props.homeName, props.awayName);
  const openingLine = saved?.openingHomeLine ?? line;
  const open = isSpreadVoteOpen({date: props.matchDate, time: props.matchTime, status: props.matchStatus});
  const canVote = open && options !== null;
  // Legacy stored choices retain their meaning: low = favorite covers; high = underdog covers.
  const myPick = options && saved?.myVote
    ? saved.myVote === options.favorite.choice ? options.favorite.label : options.underdog.label
    : null;

  return <section id="commissioner-spread-vote" className={`${styles.card} ${props.embedded ? styles.embedded : ''}`} aria-label="Clash Challenge — beat expectations">
    <p className={styles.kicker}>MAKE YOUR PICK</p>

    {!props.embedded ? <>
      <p className={styles.lineTitle}>Current match projection</p>
      <strong className={styles.line}>{spreadLineLabel(line, props.homeName, props.awayName)}</strong>
    </> : null}
    {!props.embedded && saved && openingLine !== line ? <p className={styles.lockedLine}>Original projection: {spreadLineLabel(openingLine, props.homeName, props.awayName)}.</p> : null}
    {options ? <p className={styles.question}>Which team will perform better than our projection?</p> : null}

    {props.notice ? <p className={styles.notice} role="status">{props.notice}</p> : null}
    {props.error ? <p className={styles.error} role="alert">{props.error}</p> : null}

    {canVote && options ? (
      <form action={castCommissionerSpreadVote} className={styles.buttons}>
        <input type="hidden" name="matchId" value={props.matchId} />
        <input type="hidden" name="lineToken" value={signSpreadVoteLine(props.matchId, line)} />
        <button type="submit" name="choice" value={options.favorite.choice} className={saved?.myVote === options.favorite.choice ? styles.selected : ''} aria-pressed={saved?.myVote === options.favorite.choice}>
          <strong>{options.favorite.label}</strong>
          <span>{options.favorite.explanation}</span>
        </button>
        <button type="submit" name="choice" value={options.underdog.choice} className={saved?.myVote === options.underdog.choice ? styles.selected : ''} aria-pressed={saved?.myVote === options.underdog.choice}>
          <strong>{options.underdog.label}</strong>
          <span>{options.underdog.explanation}</span>
        </button>
      </form>
    ) : <p className={styles.hint}>{line === 0 ? 'No meaningful projection to compare yet.' : 'Picks are closed. The final projection and your pick remain saved.'}</p>}

    {options ? <p className={styles.rules}>If the final margin matches the projection exactly, neither team beats expectations.</p> : null}
    {myPick ? <p className={styles.yourVote}>Your pick: <strong>{myPick}</strong>{saved?.myAcceptedHomeLine != null ? <span> · Your original projection: {spreadLineLabel(saved.myAcceptedHomeLine, props.homeName, props.awayName)}</span> : null}{canVote ? ' · You can change it before match start.' : ''}</p> : null}
  </section>;
}
