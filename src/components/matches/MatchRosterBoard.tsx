import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster, OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {getStoredTeamById} from '@/services/teams/TeamStore';
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
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div><span>Match roster</span><h2>Player availability</h2></div>
        </header>
        <div className={v1.previewGrid}>
          <AvailabilityRosterCard teamName={matchday.awayTeam.name} label="Away" players={awayPlayers} />
          <AvailabilityRosterCard teamName={matchday.homeTeam.name} label="Home" players={homePlayers} />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div><span>Match roster</span><h2>Active team rosters</h2></div>
      </header>
      <div className={v1.previewGrid}>
        <ActiveRosterCard teamName={matchday.awayTeam.name} label="Away" players={matchday.awayTeam.roster} />
        <ActiveRosterCard teamName={matchday.homeTeam.name} label="Home" players={matchday.homeTeam.roster} />
      </div>
    </section>
  );
}

function ActiveRosterCard({teamName, label, players}: {teamName: string; label: string; players: LaunchPlayer[]}) {
  const visible = players.slice(0, PREVIEW_COUNT);
  const remaining = players.slice(PREVIEW_COUNT);

  return (
    <details className={v1.previewTeam}>
      <summary className={v1.previewTeamHead}>
        <span>{teamName}</span>
        <span>{label}</span>
      </summary>
      <div className={v1.previewList}>
        {visible.length ? visible.map((player) => <ActivePlayerRow key={player.id} player={player} />) : (
          <div className={v1.previewPlayer}><span className={v1.previewMore}>No players listed yet</span></div>
        )}
        {remaining.length ? (
          <>
            <div className={`${v1.previewPlayer} ${v1.moreCount}`}><span className={v1.previewMore}>+ {remaining.length} more</span></div>
            <div className={v1.expandedRoster}>
              {remaining.map((player) => <ActivePlayerRow key={player.id} player={player} />)}
            </div>
          </>
        ) : null}
      </div>
    </details>
  );
}

function ActivePlayerRow({player}: {player: LaunchPlayer}) {
  return (
    <div className={v1.previewPlayer}>
      <strong>{player.name}</strong>
      <span className={v1.playerMeta}>CI: {formatClashIndex(player)}</span>
    </div>
  );
}

function AvailabilityRosterCard({teamName, label, players}: {teamName: string; label: string; players: TeamAttendanceMember[]}) {
  const ordered = [
    ...players.filter((player) => player.status === 'Playing'),
    ...players.filter((player) => player.status === 'Unconfirmed'),
    ...players.filter((player) => player.status === 'NotPlaying'),
  ];
  const visible = ordered.slice(0, PREVIEW_COUNT);
  const remaining = ordered.slice(PREVIEW_COUNT);

  return (
    <details className={v1.previewTeam}>
      <summary className={v1.previewTeamHead}>
        <span>{teamName}</span>
        <span>{label}</span>
      </summary>
      <div className={v1.previewList}>
        {visible.length ? visible.map((player) => <AvailabilityPlayerRow key={player.playerId} player={player} />) : (
          <div className={v1.previewPlayer}><span className={v1.previewMore}>No players listed yet</span></div>
        )}
        {remaining.length ? (
          <>
            <div className={`${v1.previewPlayer} ${v1.moreCount}`}><span className={v1.previewMore}>+ {remaining.length} more</span></div>
            <div className={v1.expandedRoster}>
              {remaining.map((player) => <AvailabilityPlayerRow key={player.playerId} player={player} />)}
            </div>
          </>
        ) : null}
      </div>
    </details>
  );
}

function AvailabilityPlayerRow({player}: {player: TeamAttendanceMember}) {
  const status = player.status === 'Playing' ? 'Playing' : player.status === 'NotPlaying' ? 'Not playing' : 'Unconfirmed';
  return (
    <div className={v1.previewPlayer}>
      <strong>{player.playerName}</strong>
      <span className={v1.playerMeta}>{status}</span>
    </div>
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

function findRoster(rosters: OfficialMatchRoster[], teamId: string): OfficialMatchRoster {
  const roster = rosters.find((candidate) => candidate.teamId === teamId);
  if (!roster) throw new Error(`Official roster manifest missing for ${teamId}.`);
  return roster;
}

function formatClashIndex(player: LaunchPlayer): string {
  if (player.clashIndex == null) return '—';
  const ghost = player.clashIndexProvisional === true || (
    player.pdgaRating == null
    && ((player.gender === 'Female' && player.clashIndex === 725)
      || (player.gender === 'Male' && player.clashIndex === 850))
  );
  return `${player.clashIndex}${ghost ? '*' : ''}`;
}
