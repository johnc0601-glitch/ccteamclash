import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster, OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {TeamRosterColumn} from '@/components/matches/TeamRosterColumn';
import styles from '@/app/matches/[id]/Matchday.module.css';

export type PublicMatchAvailability = ReadonlyMap<string, TeamAttendanceMember[]>;

export function MatchRosterBoard({
  matchday,
  official,
  rosterUnavailable = false,
  availability,
  availabilityUnavailable = false,
}: {
  matchday: PublicMatchday;
  official?: OfficialSnapshotState;
  rosterUnavailable?: boolean;
  availability?: PublicMatchAvailability;
  availabilityUnavailable?: boolean;
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

  if (availabilityUnavailable) {
    return (
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div><span>Match availability</span><h2>Availability temporarily unavailable</h2></div>
        </header>
        <p className={styles.empty}>The team rosters are intact, but current player responses could not be loaded.</p>
      </section>
    );
  }

  if (availability) {
    return (
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div>
            <span>Match availability</span>
            <h2>Who&apos;s playing?</h2>
          </div>
          <p>Availability is live. Unconfirmed players still need to respond before the roster locks.</p>
        </header>
        <div className={styles.rosterGrid}>
          <AvailabilityRosterColumn
            players={availability.get(matchday.awayTeam.id) ?? []}
            teamName={matchday.awayTeam.name}
            label="Away team"
          />
          <AvailabilityRosterColumn
            players={availability.get(matchday.homeTeam.id) ?? []}
            teamName={matchday.homeTeam.name}
            label="Home team"
          />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div>
          <span>Potential roster</span>
          <h2>Active team rosters</h2>
        </div>
        <p>The full potential roster is shown until match availability opens Friday.</p>
      </header>
      <div className={styles.rosterGrid}>
        <TeamRosterColumn team={matchday.awayTeam} label="Away team" />
        <TeamRosterColumn team={matchday.homeTeam} label="Home team" />
      </div>
    </section>
  );
}

function AvailabilityRosterColumn({
  players,
  teamName,
  label,
}: {
  players: TeamAttendanceMember[];
  teamName: string;
  label: string;
}) {
  const playing = players.filter((player) => player.status === 'Playing');
  const unconfirmed = players.filter((player) => player.status === 'Unconfirmed');
  const notPlaying = players.filter((player) => player.status === 'NotPlaying');

  return (
    <article className={styles.rosterTeam}>
      <div className={styles.rosterTeamHeader}>
        <div><span>{label}</span><h3>{teamName}</h3></div>
      </div>
      <AvailabilityGroup title="Available" players={playing} empty="No players have confirmed yet." />
      <AvailabilityGroup title="Unconfirmed" players={unconfirmed} empty="Everyone has responded." />
      <details>
        <summary>Not playing · {notPlaying.length}</summary>
        <div className={styles.playerList}>
          {notPlaying.length
            ? notPlaying.map((player) => <AvailabilityPlayer key={player.playerId} player={player} />)
            : <p className={styles.empty}>No players are marked out.</p>}
        </div>
      </details>
    </article>
  );
}

function AvailabilityGroup({
  title,
  players,
  empty,
}: {
  title: string;
  players: TeamAttendanceMember[];
  empty: string;
}) {
  return (
    <>
      <div className={styles.rosterTitle}><span>{title}</span><span>{players.length}</span></div>
      <div className={styles.playerList}>
        {players.length
          ? players.map((player) => <AvailabilityPlayer key={player.playerId} player={player} />)
          : <p className={styles.empty}>{empty}</p>}
      </div>
    </>
  );
}

function AvailabilityPlayer({player}: {player: TeamAttendanceMember}) {
  return (
    <div className={styles.playerRow}>
      <b>{initials(player.playerName)}</b>
      <strong>{player.playerName}</strong>
    </div>
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
