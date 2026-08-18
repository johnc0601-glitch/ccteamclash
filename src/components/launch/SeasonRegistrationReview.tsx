import {
  commissionerApproveRejectedRegistration,
  commissionerReopenRegistration,
} from '@/app/office/players/season-actions';
import styles from './LaunchPlayerManagement.module.css';

export type RejectedSeasonRegistration = {
  id: string;
  displayName: string;
  seasonName: string;
  teamName: string;
  playerType: string;
  gender: string;
};

export function SeasonRegistrationReview({registrations}: {registrations: RejectedSeasonRegistration[]}) {
  if (!registrations.length) return null;

  return (
    <section className={styles.panel} aria-labelledby="season-review-title" style={{marginBottom: '1rem'}}>
      <header className={styles.panelHeader}>
        <span>Commissioner review</span>
        <h2 id="season-review-title">Captain rejections</h2>
        <p>Registrations rejected by a captain come here instead of disappearing.</p>
      </header>
      <div className={styles.playerList}>
        {registrations.map((registration) => (
          <article className={styles.playerRow} key={registration.id}>
            <div className={styles.playerPrimary}>
              <div>
                <strong>{registration.displayName}</strong>
                <span>{registration.seasonName}</span>
              </div>
            </div>
            <p className={styles.muted}>
              Requested team: {registration.teamName} / {registration.playerType} / {registration.gender}
            </p>
            <div className={styles.accountActions}>
              <form action={commissionerApproveRejectedRegistration}>
                <input name="applicationId" type="hidden" value={registration.id} />
                <button className={styles.primaryButton} type="submit">Approve override</button>
              </form>
              <form action={commissionerReopenRegistration}>
                <input name="applicationId" type="hidden" value={registration.id} />
                <button className={styles.secondaryButton} type="submit">Return to captain</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
