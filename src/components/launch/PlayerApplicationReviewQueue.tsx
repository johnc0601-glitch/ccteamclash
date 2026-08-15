import {PendingSubmitButton} from '@/components/forms/PendingSubmitButton';
import type {PlayerApplicationReviewCard} from '@/domain/player-application/PlayerApplicationReview';
import {approvePlayerApplication, rejectPlayerApplication} from '@/app/office/applications/actions';
import styles from './PlayerApplicationReviewQueue.module.css';

export function PlayerApplicationReviewQueue({cards, error, notice}: {
  cards: PlayerApplicationReviewCard[];
  error?: string;
  notice?: string;
}) {
  const pending = cards.filter((card) => card.application.status === 'Pending');
  const reviewed = cards.filter((card) => card.application.status !== 'Pending');

  return <section className={styles.queue} aria-label="Player applications">
    {notice ? <p className={styles.notice}>{notice}</p> : null}
    {error ? <p className={styles.error}>{error}</p> : null}
    <header className={styles.intro}>
      <span>Identity review</span>
      <h2>Pending applications</h2>
      <p>Approval establishes the player identity only. Add approved players to a season roster separately.</p>
    </header>
    <div className={styles.list}>
      {pending.length ? pending.map((card) => <ApplicationCard card={card} key={card.application.id} />)
        : <p className={styles.empty}>No pending player applications.</p>}
    </div>
    {reviewed.length ? <details className={styles.reviewed}>
      <summary>Reviewed applications ({reviewed.length})</summary>
      <div className={styles.list}>{reviewed.map((card) => <ApplicationCard card={card} key={card.application.id} readOnly />)}</div>
    </details> : null}
  </section>;
}

function ApplicationCard({card, readOnly = false}: {card: PlayerApplicationReviewCard; readOnly?: boolean}) {
  const {application} = card;
  const claimReady = !application.playedBefore || (
    (card.claim?.status === 'Pending' || card.claim?.status === 'Approved') && Boolean(card.claimedPlayerName)
  );
  return <article className={styles.card}>
    <div className={styles.heading}>
      <div><span>{application.playedBefore ? 'Returning player' : 'New player'}</span><h3>{card.applicantName}</h3></div>
      <strong>{application.status}</strong>
    </div>
    <dl className={styles.details}>
      <div><dt>Application</dt><dd>{application.playerType} · {application.gender}</dd></div>
      <div><dt>Requested team</dt><dd>{card.requestedTeamName}</dd></div>
      <div><dt>Profile</dt><dd>{card.profileStatus}</dd></div>
      {application.playedBefore ? <div><dt>Previous player</dt><dd>{card.claimedPlayerName ?? 'No player selected'}{card.claim ? ` · ${card.claim.status}` : ' · Claim missing'}</dd></div> : null}
    </dl>
    {!readOnly ? <>
      {!claimReady ? <p className={styles.warning}>Resolve the returning-player claim before approval.</p> : null}
      <div className={styles.actions}>
        <form action={approvePlayerApplication}>
          <input type="hidden" name="applicationId" value={application.id} />
          <PendingSubmitButton disabled={!claimReady} pendingLabel="Approving…">Approve</PendingSubmitButton>
        </form>
        <form action={rejectPlayerApplication}>
          <input type="hidden" name="applicationId" value={application.id} />
          <PendingSubmitButton pendingLabel="Rejecting…">Reject</PendingSubmitButton>
        </form>
      </div>
    </> : null}
  </article>;
}
