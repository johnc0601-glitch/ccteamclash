import type {PersonalAttendance} from '@/domain/match-roster/MatchAttendance';
import {PlayerAvailabilityService} from '@/domain/match-roster/PlayerAvailabilityService';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {setOwnPlayerAvailability} from '@/app/matches/[id]/playerAvailabilityActions';
import {createClient} from '@/lib/supabase/server';
import styles from '@/app/matches/[id]/Matchday.module.css';

export async function PersonalAttendanceCard({
  attendance,
  notice,
  error,
}: {
  attendance: PersonalAttendance;
  notice?: string;
  error?: string;
}) {
  let current = attendance;

  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (user) {
      const refreshed = await new PlayerAvailabilityService(
        new SeasonAwareMatchRosterRepository(supabase),
      ).getPersonalAttendance(user.id, attendance.matchId);
      if (refreshed) current = refreshed;
    }
  } catch {
    // Keep the parent-provided status if the refresh is unavailable.
  }

  const yesSelected = current.status === 'Playing';
  const noSelected = current.status === 'NotPlaying';
  const selectedBox = '0 0 0 3px var(--cc-heading)';

  return (
    <section className={styles.attendanceCard} aria-labelledby="personal-attendance-heading">
      <div>
        <span>Your availability</span>
        <h2 id="personal-attendance-heading">Can you play?</h2>
        <p>
          {current.attendanceOpen
            ? `${current.playerName}, choose Yes or No. You can change this until Friday at 12:00 PM.`
            : 'Player responses closed Friday at 12:00 PM.'}
        </p>
      </div>
      <div className={styles.attendanceControls}>
        <p className={styles.attendanceStatus} data-status={current.status}>
          Current answer: <strong>{formatStatus(current.status)}</strong>
        </p>
        {notice ? <p className={styles.attendanceNotice}>{notice}</p> : null}
        {error ? <p className={styles.attendanceError}>{error}</p> : null}
        <form action={setOwnPlayerAvailability} className={styles.attendanceActions}>
          <input name="matchId" type="hidden" value={current.matchId} />
          <button
            aria-pressed={yesSelected}
            className={styles.playingButton}
            disabled={!current.attendanceOpen}
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
            className={styles.notPlayingButton}
            disabled={!current.attendanceOpen}
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
        </form>
      </div>
    </section>
  );
}

function formatStatus(status: PersonalAttendance['status']): string {
  if (status === 'Playing') return 'Yes';
  if (status === 'NotPlaying') return 'No';
  return 'Unconfirmed';
}
