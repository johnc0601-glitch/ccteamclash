'use client';

import {useState} from 'react';
import v1 from '@/app/matches/[id]/MatchdayV1.module.css';

const PREVIEW_COUNT = 5;

type LockedRosterTeam = {
  name: string;
  label: 'Away' | 'Home';
  logo?: string;
  accent?: string;
  players: string[];
};

export function LockedRosterPair({away, home}: {away: LockedRosterTeam; home: LockedRosterTeam}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className={v1.previewGrid}>
        <LockedRosterCard team={away} expanded={expanded} />
        <LockedRosterCard team={home} expanded={expanded} />
      </div>
      {(away.players.length > PREVIEW_COUNT || home.players.length > PREVIEW_COUNT) ? (
        <button className={v1.rosterToggle} type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? 'Show 5 players' : 'View full rosters'}
          <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
        </button>
      ) : null}
    </div>
  );
}

function LockedRosterCard({team, expanded}: {team: LockedRosterTeam; expanded: boolean}) {
  const visible = expanded ? team.players : team.players.slice(0, PREVIEW_COUNT);
  const remaining = Math.max(0, team.players.length - PREVIEW_COUNT);
  const headerStyle = team.accent
    ? {background: `linear-gradient(110deg, ${team.accent} 0%, #071012 78%)`}
    : undefined;

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
        {visible.length ? visible.map((name, index) => (
          <div className={v1.previewPlayer} key={`${name}-${index}`}><strong>{name}</strong></div>
        )) : (
          <div className={v1.previewPlayer}><span className={v1.previewMore}>No players listed yet</span></div>
        )}
        {!expanded && remaining > 0 ? (
          <div className={v1.previewPlayer}><span className={v1.previewMore}>+ {remaining} more</span></div>
        ) : null}
      </div>
    </article>
  );
}
