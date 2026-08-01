import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {TeamRosterColumn} from '@/components/matches/TeamRosterColumn';
import styles from '@/app/matches/[id]/Matchday.module.css';

export function MatchRosterBoard({matchday}: {matchday: PublicMatchday}) {
  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <span>Match roster</span>
          <h2>Active team rosters</h2>
        </div>
        <p>Attendance and captain confirmation arrive in Patch 2.</p>
      </header>
      <div className={styles.rosterGrid}>
        <TeamRosterColumn team={matchday.awayTeam} label="Away team" />
        <TeamRosterColumn team={matchday.homeTeam} label="Home team" />
      </div>
    </section>
  );
}
