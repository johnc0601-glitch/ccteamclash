import {
  addCommissionerSnapshotPlayer,
  removeCommissionerSnapshotPlayer,
} from '@/app/matches/[id]/actions';
import styles from '@/app/matches/[id]/Matchday.module.css';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import {PendingSubmitButton} from '@/components/forms/PendingSubmitButton';

export function CommissionerSnapshotPanel({
  rosters,
  activePlayers,
  notice,
  error,
}: {
  rosters: OfficialMatchRoster[];
  activePlayers: LaunchPlayer[];
  notice?: string;
  error?: string;
}) {
  return (
    <section className={styles.commissionerPanel} aria-labelledby="commissioner-snapshot-heading">
      <header className={styles.sectionHeader}>
        <div><span>Commissioner controls</span><h2 id="commissioner-snapshot-heading">Correct official roster</h2></div>
        <p>Corrections update only the locked historical snapshot.</p>
      </header>
      {notice ? <p className={styles.attendanceNotice}>{notice}</p> : null}
      {error ? <p className={styles.attendanceError}>{error}</p> : null}
      <div className={styles.captainRosterGrid}>
        {rosters.map((roster) => (
          <CommissionerTeam
            key={roster.teamId}
            roster={roster}
            activePlayers={activePlayers}
          />
        ))}
      </div>
    </section>
  );
}

function CommissionerTeam({
  roster,
  activePlayers,
}: {
  roster: OfficialMatchRoster;
  activePlayers: LaunchPlayer[];
}) {
  const listedIds = new Set(roster.players.map((player) => player.playerId));
  const candidates = activePlayers.filter((player) => !listedIds.has(player.id));
  const teamName = roster.teamNameSnapshot;
  return (
    <article className={styles.captainTeamRoster}>
      <header className={styles.captainTeamHeader}>
        <div><span>{roster.needsCommissionerReview ? 'Review needed' : 'Snapshot complete'}</span><h3>{teamName}</h3></div>
        <p>{roster.players.length} official players</p>
      </header>
      <div className={styles.captainPlayerList}>
        {roster.players.map((player) => (
          <div className={styles.captainPlayerRow} key={player.playerId}>
            <strong>{player.playerNameSnapshot}</strong>
            <form action={removeCommissionerSnapshotPlayer}>
              <input name="matchId" type="hidden" value={roster.matchId} />
              <input name="teamId" type="hidden" value={roster.teamId} />
              <input name="playerId" type="hidden" value={player.playerId} />
              <PendingSubmitButton className={styles.removeSnapshotButton} pendingLabel="Removing...">Remove</PendingSubmitButton>
            </form>
          </div>
        ))}
        {!roster.players.length ? <p className={styles.empty}>Official roster is empty.</p> : null}
      </div>
      <form action={addCommissionerSnapshotPlayer} className={styles.snapshotAddForm}>
        <input name="matchId" type="hidden" value={roster.matchId} />
        <input name="teamId" type="hidden" value={roster.teamId} />
        <select aria-label={`Add player to ${teamName}`} disabled={!candidates.length} name="playerId" required>
          <option value="">Select an active player</option>
          {candidates.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
        </select>
        <PendingSubmitButton disabled={!candidates.length} pendingLabel="Adding...">Add player</PendingSubmitButton>
      </form>
    </article>
  );
}
