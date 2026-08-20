import {
  clearCaptainRosterAvailability,
  confirmCaptainManagedRoster,
  setCaptainRosterAvailability,
} from '@/app/matches/[id]/captainRosterManagementActions';
import {emailCaptainUnconfirmed} from '@/app/matches/[id]/captainReminderActions';
import styles from '@/app/matches/[id]/Matchday.module.css';
import type {ManagedTeamRoster} from '@/domain/match-roster/MatchAttendance';
import {isResendConfigured} from '@/lib/email/resend';

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
  const emailConfigured = isResendConfigured();

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
            emailConfigured={emailConfigured}
            key={roster.teamId}
            roster={roster}
            teamName={teamNames[roster.teamId] ?? 'Team'}
          />
        ))}
      </div>
    </section>
  );
}

function CaptainTeamRoster({
  roster,
  teamName,
  emailConfigured,
}: {
  roster: ManagedTeamRoster;
  teamName: string;
  emailConfigured: boolean;
}) {
  const counts = roster.players.reduce((result, player) => {
    result[player.status] += 1;
    return result;
  }, {Playing: 0, NotPlaying: 0, Unconfirmed: 0});
  const canEmailUnconfirmed = Boolean(
    emailConfigured
    && roster.emailReminderOpen
    && roster.attendanceOpen
    && counts.Unconfirmed > 0
  );
  const selectedBox = '0 0 0 3px var(--cc-heading)';

  return (
    <article className={styles.captainTeamRoster}>
      <header className={styles.captainTeamHeader}>
        <div>
          <span>{roster.rosterStatus}</span>
          <h3>{teamName}</h3>
        </div>
        <p>{counts.Playing} yes · {counts.NotPlaying} no · {counts.Unconfirmed} unconfirmed</p>
      </header>
      {canEmailUnconfirmed ? (
        <form action={emailCaptainUnconfirmed} className={styles.confirmRosterForm}>
          <input name="matchId" type="hidden" value={roster.matchId} />
          <button type="submit">Email {counts.Unconfirmed} unconfirmed</button>
        </form>
      ) : null}
      <div className={styles.captainPlayerList}>
        {roster.players.map((player) => {
          const yesSelected = player.status === 'Playing';
          const noSelected = player.status === 'NotPlaying';
          const unconfirmedSelected = player.status === 'Unconfirmed';

          return (
            <div className={styles.captainPlayerRow} key={player.playerId}>
              <div>
                <strong>{player.playerName}</strong>
                <span>{formatStatus(player.status)}</span>
              </div>
              <form action={setCaptainRosterAvailability} className={styles.captainPlayerActions}>
                <input name="matchId" type="hidden" value={roster.matchId} />
                <input name="playerId" type="hidden" value={player.playerId} />
                <button
                  aria-pressed={yesSelected}
                  name="status"
                  style={{
                    background: '#4f7f32',
                    borderColor: '#4f7f32',
                    boxShadow: yesSelected ? selectedBox : 'none',
                    color: '#fff',
                  }}
                  type="submit"
                  value="Playing"
                >
                  Yes
                </button>
                <button
                  aria-pressed={noSelected}
                  name="status"
                  style={{
                    background: '#b64040',
                    borderColor: '#b64040',
                    boxShadow: noSelected ? selectedBox : 'none',
                    color: '#fff',
                  }}
                  type="submit"
                  value="NotPlaying"
                >
                  No
                </button>
                <button
                  aria-pressed={unconfirmedSelected}
                  formAction={clearCaptainRosterAvailability}
                  style={{boxShadow: unconfirmedSelected ? selectedBox : 'none'}}
                  type="submit"
                >
                  Unconfirmed
                </button>
              </form>
            </div>
          );
        })}
      </div>
      <form action={confirmCaptainManagedRoster} className={styles.confirmRosterForm}>
        <input name="matchId" type="hidden" value={roster.matchId} />
        <input name="teamId" type="hidden" value={roster.teamId} />
        <button type="submit">
          {roster.rosterStatus === 'Confirmed' ? 'Update confirmed roster' : 'Confirm match roster'}
        </button>
      </form>
    </article>
  );
}

function formatStatus(status: ManagedTeamRoster['players'][number]['status']): string {
  if (status === 'Playing') return 'Yes';
  if (status === 'NotPlaying') return 'No';
  return 'Unconfirmed';
}
