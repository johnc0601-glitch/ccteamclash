import type { Team } from '../../lib/teams/team';
import React from 'react';

export default function TeamBanner({ team, height = 120 }: { team: Team; height?: number }){
  const style: React.CSSProperties = {
    backgroundImage: `url(${team.banner || `/team-banners/${team.id}.jpg`})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height,
  };
  return <div className="team-banner" style={style} aria-hidden />;
}
