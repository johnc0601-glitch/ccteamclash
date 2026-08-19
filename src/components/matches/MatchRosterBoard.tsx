import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {TeamRosterColumn} from '@/components/matches/TeamRosterColumn';
import styles from '@/app/matches/[id]/Matchday.module.css';
import type {OfficialSnapshotState, OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

export function MatchRosterBoard({
  matchday,
  official,
  rosterUnavailable = false,
}: {
  matchday: PublicMatchday;
  official?: OfficialSnapshotState;
  rosterUnavailable?: boolean;
}) {
  if (official?.status === 'unavailable') {
    return (
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div><span>Official match roster</span><h2>Official roster temporarily unavailable</h2></div>
        </header>
        <p className={styles.empty}>The match page remains available while the official roster is recovered.</p>
      </section>
    );
  }

  if (official?.status === 'complete') {
    return (
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div><span>Official match roster</span><h2>Locked roster snapshot</h2></div>
          <p>These stored names and players are the permanent roster for this match.</p>
        </header>
        <div className={styles.rosterGrid}>
          <OfficialRosterColumn roster={findRoster(official.rosters, matchday.awayTeam.id)} label="Away team" />
          <OfficialRosterColumn roster={findRoster(official.rosters, matchday.homeTeam.id)} label="Home team" />
        </div>
      </section>
    );
  }

  if (rosterUnavailable) {
    return (
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div><span>Match roster</span><h2>Roster temporarily unavailable</h2></div>
        </header>
        <p className={styles.empty}>The match page remains available while the active season roster is recovered.</p>
      </section>
    );
  }

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <span>Match roster</span>
          <h2>Active team rosters</h2>
        </div>
        <p>Attendance and captain confirmation remain live until the match roster locks.</p>
      </header>
      <div className={styles.rosterGrid}>
        <TeamRosterColumn team={matchday.awayTeam} label="Away team" />
        <TeamRosterColumn team={matchday.homeTeam} label="Home team" />
      </div>
    </section>
  );
}

function OfficialRosterColumn({roster, label}: {roster: OfficialMatchRoster; label: string}) {
  const teamName = roster.teamNameSnapshot;
  return (
    <article className={styles.rosterTeam}>
      <div className={styles.rosterTeamHeader}>
        <div><span>{label}</span><h3>{teamName}</h3></div>
      </div>
      <div className={styles.rosterTitle}><span>Official players</span><span>{roster.players.length}</span></div>
      <div className={styles.playerList}>
        {roster.players.length ? roster.players.map((player) => (
          <div className={styles.playerRow} key={player.playerId}>
            <b>{initials(player.playerNameSnapshot)}</b>
            <strong>{player.playerNameSnapshot}</strong>
          </div>
        )) : <p className={styles.empty}>No players are listed on this official roster.</p>}
      </div>
    </article>
  );
}

function findRoster(rosters: OfficialMatchRoster[], teamId: string): OfficialMatchRoster {
  const roster = rosters.find((candidate) => candidate.teamId === teamId);
  if (!roster) throw new Error(`Official roster manifest missing for ${teamId}.`);
  return roster;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
