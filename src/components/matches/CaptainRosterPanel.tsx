import {
  clearCaptainMatchAttendance,
  confirmCaptainMatchRoster,
  setCaptainMatchAttendance,
} from '@/app/matches/[id]/actions';
import styles from '@/app/matches/[id]/Matchday.module.css';
import type {ManagedTeamRoster} from '@/domain/match-roster/MatchAttendance';

export function CaptainRosterPanel({
  rosters,
  teamNames,
  notice,
  error,
}: {
  rosters: ManagedTeamRoster[];
  teamNames: Record<string, string>;
  notice?: string;
  error?: string;
}) {
  return (
    <section className={styles.captainPanel} aria-labelledby="captain-roster-heading">
      <header className={styles.sectionHeader}>
        <div>
          <span>Captain controls</span>
          <h2 id="captain-roster-heading">Manage match roster</h2>
        </div>
        <p>Set player availability and confirm each roster you are authorized to manage.</p>
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
              <button disabled={!roster.attendanceOpen} name="status" type="submit" value="Playing">Playing</button>
              <button disabled={!roster.attendanceOpen} name="status" type="submit" value="NotPlaying">Not playing</button>
              <button disabled={!roster.attendanceOpen} formAction={clearCaptainMatchAttendance} type="submit">Unconfirmed</button>
            </form>
          </div>
        ))}
      </div>
      <form action={confirmCaptainMatchRoster} className={styles.confirmRosterForm}>
        <input name="matchId" type="hidden" value={roster.matchId} />
        <input name="teamId" type="hidden" value={roster.teamId} />
        <button disabled={!roster.attendanceOpen} type="submit">
          {roster.rosterStatus === 'Confirmed' ? 'Update confirmed roster' : 'Confirm match roster'}
        </button>
      </form>
    </article>
  );
}

function formatStatus(status: ManagedTeamRoster['players'][number]['status']): string {
  if (status === 'NotPlaying') return 'Not playing';
  return status;
}
