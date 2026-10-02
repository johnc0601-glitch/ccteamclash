import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import v1 from '@/app/matches/[id]/MatchdayV1.module.css';

// Locked rosters expand in place so the team cards remain the single source of truth.
type LockedRosterTeam = {
  name: string;
  label: 'Away' | 'Home';
  logo?: string;
  accent?: string;
  players: Array<Pick<TeamAttendanceMember, 'playerName' | 'status'>>;
};

export function LockedRosterPair({away, home}: {away: LockedRosterTeam; home: LockedRosterTeam}) {
  return (
    <div className={v1.previewGrid}>
      <LockedRosterCard team={away} />
      <LockedRosterCard team={home} />
    </div>
  );
}

function LockedRosterCard({team}: {team: LockedRosterTeam}) {
  const isAway = team.label === 'Away';
  const headerStyle = {
    background: isAway
      ? 'linear-gradient(110deg, var(--match-away, #0b2e59) 0%, var(--match-away, #113f72) 78%, #071012 100%)'
      : 'linear-gradient(110deg, var(--match-home, #481343) 0%, var(--match-home, #711f58) 78%, #071012 100%)',
    boxShadow: isAway
      ? 'inset 0 0 0 1px color-mix(in srgb, var(--match-away, #113f72) 62%, white)'
      : 'inset 0 0 0 1px color-mix(in srgb, var(--match-home, #711f58) 62%, white)',
  };

  return (
    <article className={v1.previewTeam}>
      <div className={`${v1.previewTeamHead} ${v1.previewTeamHeadColor}`} style={headerStyle}>
        <div className={v1.previewTeamIdentity}>
          {team.logo ? <img src={team.logo} alt={`${team.name} logo`} className={v1.previewTeamLogo} /> : null}
          <span>{team.name}</span>
        </div>
        <span>{team.label}</span>
      </div>
      <div className={v1.previewList}>
        {team.players.length ? team.players.map((player, index) => (
          <div className={v1.previewPlayer} key={`${player.playerName}-${index}`}>
            <span className={v1.playerStatusIdentity}>
              {player.status === 'Playing' || player.status === 'NotPlaying' ? (
                <span
                  className={`${v1.statusLight} ${player.status === 'Playing' ? v1.statusLightPlaying : v1.statusLightNotPlaying}`}
                  role="img"
                  aria-label={player.status === 'Playing' ? 'Coming' : 'Not coming'}
                  title={player.status === 'Playing' ? 'Coming' : 'Not coming'}
                />
              ) : <span className={v1.statusLightPlaceholder} aria-hidden="true" />}
              <strong>{player.playerName}</strong>
            </span>
          </div>
        )) : (
          <div className={v1.previewPlayer}><span className={v1.previewMore}>No players listed yet</span></div>
        )}
      </div>
    </article>
  );
}
