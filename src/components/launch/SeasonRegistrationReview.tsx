import {
  commissionerChangeRejectedRegistrationTeam,
  commissionerDeleteRejectedRegistration,
  commissionerReopenRegistration,
} from '@/app/office/players/season-actions';
import styles from './LaunchPlayerManagement.module.css';

export type RejectedSeasonRegistration = {
  id: string;
  displayName: string;
  seasonName: string;
  teamId: string;
  teamName: string;
  playerType: string;
  gender: string;
};

type TeamOption = {id: string; name: string};

export function SeasonRegistrationReview({
  registrations,
  teams,
}: {
  registrations: RejectedSeasonRegistration[];
  teams: TeamOption[];
}) {
  if (!registrations.length) return null;

  return (
    <section className={styles.panel} aria-labelledby="season-review-title" style={{marginBottom: '1rem'}}>
      <header className={styles.panelHeader}>
        <span>Commissioner review</span>
        <h2 id="season-review-title">Captain rejections</h2>
        <p>Send the request back, route it to another team, or delete only this season registration.</p>
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
              <form action={commissionerReopenRegistration}>
                <input name="applicationId" type="hidden" value={registration.id} />
                <button className={styles.primaryButton} type="submit">Send back to captain</button>
              </form>
              <form action={commissionerChangeRejectedRegistrationTeam} style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                <input name="applicationId" type="hidden" value={registration.id} />
                <select name="requestedTeamId" defaultValue="" required aria-label="New team">
                  <option value="" disabled>Change team...</option>
                  {teams
                    .filter((team) => team.id !== registration.teamId)
                    .map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
                <button className={styles.secondaryButton} type="submit">Send to new captain</button>
              </form>
              <form action={commissionerDeleteRejectedRegistration}>
                <input name="applicationId" type="hidden" value={registration.id} />
                <button className={styles.secondaryButton} type="submit">Delete registration</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
