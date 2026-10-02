import Link from 'next/link';
import type {PersonalAttendance} from '@/domain/match-roster/MatchAttendance';
import {setOwnPlayerAvailability} from '@/app/matches/[id]/playerAvailabilityActions';
import styles from '@/app/matches/[id]/Matchday.module.css';

export function PersonalAttendanceCard({
  attendance,
  canManageRoster = false,
  notice,
  error,
}: {
  attendance: PersonalAttendance;
  canManageRoster?: boolean;
  notice?: string;
  error?: string;
}) {
  const current = attendance;
  const yesSelected = current.status === 'Playing';
  const noSelected = current.status === 'NotPlaying';
  const selectedBox = '0 0 0 3px var(--cc-heading)';

  return (
    <section
      className={styles.attendanceCard}
      aria-labelledby="personal-attendance-heading"
      style={{padding: '16px 18px', gap: '12px'}}
    >
      <div>
        <h2 id="personal-attendance-heading" style={{margin: 0, fontSize: '30px'}}>Can you play?</h2>
        <p style={{marginTop: '5px', fontSize: '13px', lineHeight: 1.35}}>
          {current.attendanceOpen
            ? 'Change your answer until Friday at noon.'
            : 'Player responses closed Friday at noon.'}
        </p>
      </div>
      <div className={styles.attendanceControls} style={{gap: '8px'}}>
        {notice ? <p className={styles.attendanceNotice}>{notice}</p> : null}
        {error ? <p className={styles.attendanceError}>{error}</p> : null}
        <form action={setOwnPlayerAvailability} className={styles.attendanceActions} style={{gap: '8px'}}>
          <input name="matchId" type="hidden" value={current.matchId} />
          <button
            aria-pressed={yesSelected}
            aria-label={yesSelected ? 'Yes, selected' : 'Yes'}
            className={styles.playingButton}
            disabled={!current.attendanceOpen}
            name="status"
            style={{
              boxShadow: yesSelected ? selectedBox : 'none',
              minHeight: '44px',
            }}
            type="submit"
            value="Playing"
          >
            {yesSelected ? '✓ Yes' : 'Yes'}
          </button>
          <button
            aria-pressed={noSelected}
            aria-label={noSelected ? 'No, selected' : 'No'}
            className={styles.notPlayingButton}
            disabled={!current.attendanceOpen}
            name="status"
            style={{
              boxShadow: noSelected ? selectedBox : 'none',
              minHeight: '44px',
            }}
            type="submit"
            value="NotPlaying"
          >
            {noSelected ? '✓ No' : 'No'}
          </button>
        </form>
        {canManageRoster ? (
          <Link
            href={`/captain/matches/${encodeURIComponent(current.matchId)}/roster`}
            prefetch={false}
            style={{
              alignItems: 'center',
              border: '1px solid var(--cc-teal)',
              borderRadius: '6px',
              color: 'var(--cc-heading)',
              display: 'flex',
              fontSize: '12px',
              fontWeight: 900,
              justifyContent: 'center',
              minHeight: '36px',
              padding: '7px 12px',
              textDecoration: 'none',
            }}
          >
            Manage roster
          </Link>
        ) : null}
      </div>
    </section>
  );
}
