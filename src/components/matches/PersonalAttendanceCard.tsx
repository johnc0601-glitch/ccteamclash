import type {PersonalAttendance} from '@/domain/match-roster/MatchAttendance';
import {setOwnMatchAttendance} from '@/app/matches/[id]/actions';
import styles from '@/app/matches/[id]/Matchday.module.css';

export function PersonalAttendanceCard({
  attendance,
  notice,
  error,
}: {
  attendance: PersonalAttendance;
  notice?: string;
  error?: string;
}) {
  return (
    <section className={styles.attendanceCard} aria-labelledby="personal-attendance-heading">
      <div>
        <span>Your availability</span>
        <h2 id="personal-attendance-heading">Are you playing?</h2>
        <p>
          {attendance.attendanceOpen
            ? `${attendance.playerName}, let your team know your match availability.`
            : 'Attendance opens Friday for this match.'}
        </p>
      </div>
      <div className={styles.attendanceControls}>
        <p className={styles.attendanceStatus} data-status={attendance.status}>
          Current response: <strong>{formatStatus(attendance.status)}</strong>
        </p>
        {notice ? <p className={styles.attendanceNotice}>{notice}</p> : null}
        {error ? <p className={styles.attendanceError}>{error}</p> : null}
        <form action={setOwnMatchAttendance} className={styles.attendanceActions}>
          <input name="matchId" type="hidden" value={attendance.matchId} />
          <button
            className={styles.playingButton}
            disabled={!attendance.attendanceOpen}
            name="status"
            type="submit"
            value="Playing"
          >
            I&apos;m playing
          </button>
          <button
            className={styles.notPlayingButton}
            disabled={!attendance.attendanceOpen}
            name="status"
            type="submit"
            value="NotPlaying"
          >
            I&apos;m not playing
          </button>
        </form>
      </div>
    </section>
  );
}

function formatStatus(status: PersonalAttendance['status']): string {
  if (status === 'NotPlaying') return 'Not playing';
  return status;
}
