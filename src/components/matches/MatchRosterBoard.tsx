import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster, OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {getStoredTeamById} from '@/services/teams/TeamStore';
import {TeamRosterColumn} from '@/components/matches/TeamRosterColumn';
import {LockedRosterPair} from '@/components/matches/LockedRosterPair';
import styles from '@/app/matches/[id]/Matchday.module.css';
import v1 from '@/app/matches/[id]/MatchdayV1.module.css';

export type PublicMatchAvailability = ReadonlyMap<string, TeamAttendanceMember[]>;

const PREVIEW_COUNT = 5;

export async function MatchRosterBoard({
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
    return <Unavailable title="Official roster temporarily unavailable" detail="The match page remains available while the official roster is recovered." />;
  }

  if (rosterUnavailable) {
    return <Unavailable title="Roster temporarily unavailable" detail="The match page remains available while the active season roster is recovered." />;
  }

  if (availabilityUnavailable) {
    return <Unavailable title="Availability temporarily unavailable" detail="The team rosters are intact, but current player responses could not be loaded." />;
  }

  if (official?.status === 'complete') {
    const away = findRoster(official.rosters, matchday.awayTeam.id);
    const home = findRoster(official.rosters, matchday.homeTeam.id);
    const [awayStoredTeam, homeStoredTeam] = await Promise.all([
      getStoredTeamById(matchday.awayTeam.id),
      getStoredTeamById(matchday.homeTeam.id),
    ]);

    return (
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div><span>Official match roster</span><h2>Locked roster</h2></div>
        </header>
        <LockedRosterPair
          away={{
            name: away.teamNameSnapshot,
            label: 'Away',
            logo: matchday.awayTeam.logo,
            accent: awayStoredTeam?.primaryColor,
            players: away.players.map((player) => player.playerNameSnapshot),
          }}
          home={{
            name: home.teamNameSnapshot,
            label: 'Home',
            logo: matchday.homeTeam.logo,
            accent: homeStoredTeam?.primaryColor,
            players: home.players.map((player) => player.playerNameSnapshot),
          }}
        />
      </section>
    );
  }

  if (availability) {
    const awayPlayers = availability.get(matchday.awayTeam.id) ?? [];
    const homePlayers = availability.get(matchday.homeTeam.id) ?? [];
    return (
      <RosterShell
        label="Match roster"
        title="Player availability"
        awayPreview={previewAvailability(awayPlayers)}
        homePreview={previewAvailability(homePlayers)}
        awayName={matchday.awayTeam.name}
        homeName={matchday.homeTeam.name}
      >
        <AvailabilityRosterColumn players={awayPlayers} teamName={matchday.awayTeam.name} label="Away team" />
        <AvailabilityRosterColumn players={homePlayers} teamName={matchday.homeTeam.name} label="Home team" />
      </RosterShell>
    );
  }

  return (
    <RosterShell
      label="Match roster"
      title="Active team rosters"
      awayPreview={matchday.awayTeam.roster.map((player) => player.name)}
      homePreview={matchday.homeTeam.roster.map((player) => player.name)}
      awayName={matchday.awayTeam.name}
      homeName={matchday.homeTeam.name}
    >
      <TeamRosterColumn team={matchday.awayTeam} label="Away team" />
      <TeamRosterColumn team={matchday.homeTeam} label="Home team" />
    </RosterShell>
  );
}

function RosterShell({
  label,
  title,
  awayPreview,
  homePreview,
  awayName,
  homeName,
  children,
}: {
  label: string;
  title: string;
  awayPreview: string[];
  homePreview: string[];
  awayName: string;
  homeName: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div><span>{label}</span><h2>{title}</h2></div>
      </header>

      <div className={v1.previewGrid}>
        <RosterPreview teamName={awayName} label="Away" names={awayPreview} />
        <RosterPreview teamName={homeName} label="Home" names={homePreview} />
      </div>

      <details className={v1.rosterDetails}>
        <summary>View full rosters</summary>
        <div className={v1.fullRosterGrid}>{children}</div>
      </details>
    </section>
  );
}

function RosterPreview({teamName, label, names}: {teamName: string; label: string; names: string[]}) {
  const visible = names.slice(0, PREVIEW_COUNT);
  const remaining = Math.max(0, names.length - visible.length);
  return (
    <article className={v1.previewTeam}>
      <div className={v1.previewTeamHead}><span>{teamName}</span><span>{label}</span></div>
      <div className={v1.previewList}>
        {visible.length ? visible.map((name) => <div className={v1.previewPlayer} key={name}><strong>{name}</strong></div>) : (
          <div className={v1.previewPlayer}><span className={v1.previewMore}>No players listed yet</span></div>
        )}
        {remaining > 0 ? <div className={v1.previewPlayer}><span className={v1.previewMore}>+ {remaining} more</span></div> : null}
      </div>
    </article>
  );
}

function AvailabilityRosterColumn({players, teamName, label}: {players: TeamAttendanceMember[]; teamName: string; label: string}) {
  const playing = players.filter((player) => player.status === 'Playing');
  const unconfirmed = players.filter((player) => player.status === 'Unconfirmed');
  const notPlaying = players.filter((player) => player.status === 'NotPlaying');

  return (
    <article className={styles.rosterTeam}>
      <div className={styles.rosterTeamHeader}><div><span>{label}</span><h3>{teamName}</h3></div></div>
      <AvailabilityGroup title="Available" players={playing} empty="No players have confirmed yet." />
      <AvailabilityGroup title="Unconfirmed" players={unconfirmed} empty="Everyone has responded." />
      <details>
        <summary>Not playing · {notPlaying.length}</summary>
        <div className={styles.playerList}>
          {notPlaying.length ? notPlaying.map((player) => <AvailabilityPlayer key={player.playerId} player={player} />) : <p className={styles.empty}>No players are marked out.</p>}
        </div>
      </details>
    </article>
  );
}

function AvailabilityGroup({title, players, empty}: {title: string; players: TeamAttendanceMember[]; empty: string}) {
  return (
    <>
      <div className={styles.rosterTitle}><span>{title}</span><span>{players.length}</span></div>
      <div className={styles.playerList}>
        {players.length ? players.map((player) => <AvailabilityPlayer key={player.playerId} player={player} />) : <p className={styles.empty}>{empty}</p>}
      </div>
    </>
  );
}

function AvailabilityPlayer({player}: {player: TeamAttendanceMember}) {
  return <div className={styles.playerRow}><b>{initials(player.playerName)}</b><strong>{player.playerName}</strong></div>;
}

function Unavailable({title, detail}: {title: string; detail: string}) {
  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}><div><span>Match roster</span><h2>{title}</h2></div></header>
      <p className={styles.empty}>{detail}</p>
    </section>
  );
}

function previewAvailability(players: TeamAttendanceMember[]): string[] {
  const playing = players.filter((player) => player.status === 'Playing');
  const unconfirmed = players.filter((player) => player.status === 'Unconfirmed');
  return [...playing, ...unconfirmed].map((player) => player.playerName);
}

function findRoster(rosters: OfficialMatchRoster[], teamId: string): OfficialMatchRoster {
  const roster = rosters.find((candidate) => candidate.teamId === teamId);
  if (!roster) throw new Error(`Official roster manifest missing for ${teamId}.`);
  return roster;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
