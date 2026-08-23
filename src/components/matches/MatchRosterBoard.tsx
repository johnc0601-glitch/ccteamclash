import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster, OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {TeamRosterColumn} from '@/components/matches/TeamRosterColumn';
import styles from '@/app/matches/[id]/Matchday.module.css';
import v1 from '@/app/matches/[id]/MatchdayV1.module.css';

export type PublicMatchAvailability = ReadonlyMap<string, TeamAttendanceMember[]>;

const PREVIEW_COUNT = 5;

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
    const awayAccent = matchday.awayTeam.team?.primaryColor;
    const homeAccent = matchday.homeTeam.team?.primaryColor;
    return (
      <RosterShell
        label="Official match roster"
        title="Locked roster"
        awayPreview={away.players.map((player) => player.playerNameSnapshot)}
        homePreview={home.players.map((player) => player.playerNameSnapshot)}
        awayName={away.teamNameSnapshot}
        homeName={home.teamNameSnapshot}
        awayLogo={matchday.awayTeam.logo}
        homeLogo={matchday.homeTeam.logo}
        awayAccent={awayAccent}
        homeAccent={homeAccent}
      >
        <OfficialRosterColumn roster={away} label="Away team" accent={awayAccent} />
        <OfficialRosterColumn roster={home} label="Home team" accent={homeAccent} />
      </RosterShell>
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
  awayLogo,
  homeLogo,
  awayAccent,
  homeAccent,
  children,
}: {
  label: string;
  title: string;
  awayPreview: string[];
  homePreview: string[];
  awayName: string;
  homeName: string;
  awayLogo?: string;
  homeLogo?: string;
  awayAccent?: string;
  homeAccent?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div><span>{label}</span><h2>{title}</h2></div>
      </header>

      <div className={v1.previewGrid}>
        <RosterPreview teamName={awayName} label="Away" names={awayPreview} logo={awayLogo} accent={awayAccent} />
        <RosterPreview teamName={homeName} label="Home" names={homePreview} logo={homeLogo} accent={homeAccent} />
      </div>

      <details className={v1.rosterDetails}>
        <summary>View full rosters</summary>
        <div className={v1.fullRosterGrid}>{children}</div>
      </details>
    </section>
  );
}

function RosterPreview({teamName, label, names, logo, accent}: {teamName: string; label: string; names: string[]; logo?: string; accent?: string}) {
  const visible = names.slice(0, PREVIEW_COUNT);
  const remaining = Math.max(0, names.length - visible.length);
  const colorStyle = accent ? {borderTop: `5px solid ${accent}`} : undefined;
  const headerStyle = accent ? {background: `linear-gradient(110deg, ${accent} 0%, ${accent} 55%, #071012 100%)`} : undefined;
  return (
    <article className={v1.previewTeam} style={colorStyle}>
      <div className={accent || logo ? `${v1.previewTeamHead} ${v1.previewTeamHeadColor}` : v1.previewTeamHead} style={headerStyle}>
        <div className={v1.previewTeamIdentity}>
          {logo ? <img src={logo} alt={`${teamName} logo`} className={v1.previewTeamLogo} /> : null}
          <span>{teamName}</span>
        </div>
        <span>{label}</span>
      </div>
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

function OfficialRosterColumn({roster, label, accent}: {roster: OfficialMatchRoster; label: string; accent?: string}) {
  const headerStyle = accent ? {background: `linear-gradient(110deg, ${accent} 0%, ${accent} 55%, #071012 100%)`} : undefined;
  return (
    <article className={styles.rosterTeam} style={accent ? {borderTop: `5px solid ${accent}`} : undefined}>
      <div className={styles.rosterTeamHeader} style={headerStyle}><div><span>{label}</span><h3>{roster.teamNameSnapshot}</h3></div></div>
      <div className={styles.rosterTitle}><span>Official players</span><span>{roster.players.length}</span></div>
      <div className={styles.playerList}>
        {roster.players.length ? roster.players.map((player) => (
          <div className={styles.playerRow} key={player.playerId}><b>{initials(player.playerNameSnapshot)}</b><strong>{player.playerNameSnapshot}</strong></div>
        )) : <p className={styles.empty}>No players are listed on this official roster.</p>}
      </div>
    </article>
  );
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
