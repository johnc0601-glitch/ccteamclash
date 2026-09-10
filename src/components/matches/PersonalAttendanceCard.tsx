import Link from 'next/link';
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
  let canManageRoster = false;

  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (user) {
      const repository = new SeasonAwareMatchRosterRepository(supabase);
      const [refreshed, actor] = await Promise.all([
        new PlayerAvailabilityService(repository).getPersonalAttendance(user.id, attendance.matchId),
        repository.getAttendanceActor(user.id),
      ]);
      if (refreshed) current = refreshed;
      canManageRoster = Boolean(
        actor?.profileStatus === 'Approved'
        && actor.profileRole === 'Captain'
        && actor.captainTeamId
        && actor.captainTeamId === current.teamId
      );
    }
  } catch {
    // Keep the parent-provided status if the refresh is unavailable.
  }

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
              background: '#4f7f32',
              borderColor: '#4f7f32',
              boxShadow: yesSelected ? selectedBox : 'none',
              color: '#fff',
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
              background: '#b64040',
              borderColor: '#b64040',
              boxShadow: noSelected ? selectedBox : 'none',
              color: '#fff',
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
            href="?manage=roster"
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
