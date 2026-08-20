import styles from '@/app/matches/[id]/Matchday.module.css';
import {CaptainRosterEditor} from '@/components/matches/CaptainRosterEditor';
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
        <p>Make your selections, then save all changes at once.</p>
      </header>
      {notice ? <p className={styles.attendanceNotice}>{notice}</p> : null}
      {error ? <p className={styles.attendanceError}>{error}</p> : null}
      <div className={styles.captainRosterGrid}>
        {rosters.map((roster) => (
          <CaptainRosterEditor
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
