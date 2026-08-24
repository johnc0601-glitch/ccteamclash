import {cancelCaptainRosterUnlock, unlockCaptainRoster} from '@/app/matches/[id]/rosterUnlockActions';
import styles from './CommissionerRosterUnlockPanel.module.css';

export function CommissionerRosterUnlockPanel({matchId, teams, openTeamIds}: {
  matchId: string;
  teams: Array<{id: string; name: string}>;
  openTeamIds: ReadonlySet<string>;
}) {
  return (
    <section className={styles.unlockPanel}>
      <div>
        <span>Commissioner</span>
        <h2>Roster correction</h2>
        <p>Unlock a team for its captain. The roster locks again as soon as the captain saves the correction.</p>
      </div>
      <div className={styles.unlockActions}>
        {teams.map((team) => openTeamIds.has(team.id) ? (
          <form action={cancelCaptainRosterUnlock} key={team.id}>
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="teamId" value={team.id} />
            <button type="submit" data-open="true">{team.name} unlocked · Cancel</button>
          </form>
        ) : (
          <form action={unlockCaptainRoster} key={team.id}>
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="teamId" value={team.id} />
            <button type="submit">Unlock {team.name}</button>
          </form>
        ))}
      </div>
    </section>
  );
}
