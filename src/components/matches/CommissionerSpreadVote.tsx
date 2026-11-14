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
    return <p>Clash Spread Challenge is temporarily unavailable.</p>;
  }

  // Frozen voting lines take precedence over subsequent changes to public estimates.
  const line = saved?.homeLine ?? roundHomeSpreadLine(props.currentHomeMargin);
  if (line === null) return null;
  const options = line === 0 ? null : getSpreadCoverOptions(line, props.homeName, props.awayName);
  const displayedLine = roundHomeSpreadLine(props.currentHomeMargin);
  const lockedLineDiffers = Boolean(props.embedded && saved && displayedLine !== null && displayedLine !== line);
  const open = isSpreadVoteOpen({date: props.matchDate, time: props.matchTime, status: props.matchStatus});
  const canVote = open && options !== null;
  // Legacy stored choices have stable meaning: low = favorite covers; high = underdog covers.
  const favoriteVotes = saved?.low ?? 0;
  const underdogVotes = saved?.high ?? 0;
  const total = favoriteVotes + underdogVotes;
  const favoritePercent = total ? Math.round(100 * favoriteVotes / total) : 0;
  const myPick = options && saved?.myVote
    ? saved.myVote === options.favorite.choice ? options.favorite.label : options.underdog.label
    : null;

  return <section id="commissioner-spread-vote" className={`${styles.card} ${props.embedded ? styles.embedded : ''}`} aria-label="Clash Spread Challenge">
    <p className={styles.kicker}>CLASH SPREAD CHALLENGE</p>
    <h3>Pick the Spread</h3>
    <p className={styles.scope}>Commissioner-only pilot · Your selection is saved with this matchup</p>

    {!props.embedded ? <>
      <p className={styles.lineTitle}>The Clash Line</p>
      <strong className={styles.line}>{spreadLineLabel(line, props.homeName, props.awayName)}</strong>
    </> : null}
    {lockedLineDiffers ? <p className={styles.lockedLine}>Voting uses the original locked line: {spreadLineLabel(line, props.homeName, props.awayName)}. The projected line above has since changed.</p> : null}
    {options ? <p className={styles.question}>Will {options.favorite.teamName} cover the spread?</p> : null}
    <p className={styles.hint}>{saved ? 'Voting line locked with the first pick.' : 'The line locks when the first pick is submitted.'}</p>

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
    ) : <p className={styles.hint}>{line === 0 ? 'No meaningful spread to pick yet.' : 'Voting has closed. Picks and totals remain saved.'}</p>}

    {options ? <p className={styles.rules}>If the final margin lands exactly on the line, it’s a push: neither side covers.</p> : null}
    {myPick ? <p className={styles.yourVote}>Your pick: <strong>{myPick}</strong>{canVote ? ' · Change your pick before match start.' : ''}</p> : null}

    {total && options ? <div className={styles.results}>
      <div className={styles.resultsHead}><span>Commissioner picks</span><span>{total} total</span></div>
      <div className={styles.track} role="img" aria-label={options.favorite.label + ': ' + favoritePercent + ' percent. ' + options.underdog.label + ': ' + (100 - favoritePercent) + ' percent'}>
        <span style={{width: favoritePercent + '%'}} />
      </div>
      <div className={styles.resultsHead}>
        <span>{options.favorite.label}: {favoriteVotes} ({favoritePercent}%)</span>
        <span>{options.underdog.label}: {underdogVotes} ({100 - favoritePercent}%)</span>
      </div>
    </div> : <p className={styles.hint}>No picks recorded yet.</p>}
  </section>;
}
