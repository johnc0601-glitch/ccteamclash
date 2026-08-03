import {
  confirmCaptainMatchRoster,
  setCaptainMatchAttendance,
} from '@/app/matches/[id]/actions';
import styles from '@/app/matches/[id]/Matchday.module.css';
import type {ManagedTeamRoster} from '@/domain/match-roster/MatchAttendance';
import {PendingSubmitButton} from '@/components/forms/PendingSubmitButton';

export function CaptainRosterPanel({
  rosters,
  teamNames,
  guidance,
  notice,
  error,
}: {
  rosters: ManagedTeamRoster[];
  teamNames: Record<string, string>;
  guidance: string;
  notice?: string;
  error?: string;
}) {
  return (
    <section className={styles.captainPanel} aria-labelledby="captain-roster-heading">
      <header className={styles.sectionHeader}>
        <div>
          <span>Team roster management</span>
          <h2 id="captain-roster-heading">Manage match roster</h2>
        </div>
        <p>{guidance}</p>
      </header>
      {notice ? <p className={styles.attendanceNotice}>{notice}</p> : null}
      {error ? <p className={styles.attendanceError}>{error}</p> : null}
      <div className={styles.captainRosterGrid}>
        {rosters.map((roster) => (
          <CaptainTeamRoster
            key={roster.teamId}
            roster={roster}
            teamName={teamNames[roster.teamId] ?? 'Team'}
          />
        ))}
      </div>
    </section>
  );
}

function CaptainTeamRoster({roster, teamName}: {roster: ManagedTeamRoster; teamName: string}) {
  const counts = roster.players.reduce((result, player) => {
    result[player.status] += 1;
    return result;
  }, {Playing: 0, NotPlaying: 0, Unconfirmed: 0});

  return (
    <article className={styles.captainTeamRoster}>
      <header className={styles.captainTeamHeader}>
        <div>
          <span>{roster.rosterStatus}</span>
          <h3>{teamName}</h3>
        </div>
        <p>{counts.Playing} playing · {counts.NotPlaying} not playing · {counts.Unconfirmed} unconfirmed</p>
      </header>
      <div className={styles.captainPlayerList}>
        {roster.players.map((player) => (
          <div className={styles.captainPlayerRow} key={player.playerId}>
            <div>
              <strong>{player.playerName}</strong>
              <span>{formatStatus(player.status)}</span>
            </div>
            <form action={setCaptainMatchAttendance} className={styles.captainPlayerActions}>
              <input name="matchId" type="hidden" value={roster.matchId} />
              <input name="playerId" type="hidden" value={player.playerId} />
              <PendingSubmitButton disabled={!roster.attendanceOpen} name="status" pendingLabel="Saving..." value="Playing">Playing</PendingSubmitButton>
              <PendingSubmitButton disabled={!roster.attendanceOpen} name="status" pendingLabel="Saving..." value="NotPlaying">Not playing</PendingSubmitButton>
            </form>
          </div>
        ))}
      </div>
      <form action={confirmCaptainMatchRoster} className={styles.confirmRosterForm}>
        <input name="matchId" type="hidden" value={roster.matchId} />
        <input name="teamId" type="hidden" value={roster.teamId} />
        <PendingSubmitButton disabled={!roster.attendanceOpen} pendingLabel="Confirming roster...">
          {roster.rosterStatus === 'Confirmed' ? 'Update confirmed roster' : 'Confirm match roster'}
        </PendingSubmitButton>
      </form>
    </article>
  );
}

function formatStatus(status: ManagedTeamRoster['players'][number]['status']): string {
  if (status === 'NotPlaying') return 'Not playing';
  return status;
}
