'use client';

import Image from 'next/image';
import Link from 'next/link';
import type {Team} from '@/models/Team';
import {createSlug} from '@/shared/utils';
import type {PublicEvent} from '@/services/matches/EventService';

type MatchCardProps = {
  match: PublicEvent;
  teams: Team[];
};

export function MatchCard({match, teams}: MatchCardProps) {
  const homeTeam = findTeam(teams, match?.home);
  const awayTeam = findTeam(teams, match?.away);

  return (
    <article className="dark-panel story-home-card home-match-card">
      <div className="story-matchup">
        <Link className="match-team-link" href={`/teams/${createSlug(match.home)}`}>
          <TeamMatchLogo name={match.home} logo={homeTeam?.logo} />
          <strong>{match.home}</strong>
        </Link>
        <b>VS</b>
        <Link className="match-team-link" href={`/teams/${createSlug(match.away)}`}>
          <TeamMatchLogo name={match.away} logo={awayTeam?.logo} />
          <strong>{match.away}</strong>
        </Link>
      </div>
      <div className="match-details">
        <p><span>DATE</span>{match.date}</p>
        <p><span>TIME</span>{match.time}</p>
        <p><span>COURSE</span>{match.course}</p>
      </div>
      <div className="match-card-footer">
        <Link href={match.href} className="gold-link">View match -&gt;</Link>
      </div>
    </article>
  );
}

function TeamMatchLogo({name, logo}: {name: string; logo?: string}) {
  return (
    <span className="team-shield match-logo-frame">
      {logo ? (
        <Image
          src={logo}
          alt={`${name} logo`}
          width={88}
          height={88}
          className="match-team-logo"
        />
      ) : initials(name)}
    </span>
  );
}

function findTeam(teams: Team[], name?: string): Team | undefined {
  if (!name) return undefined;
  const slug = createSlug(name);
  return teams.find((team) => team.id === slug || createSlug(team.name) === slug);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
