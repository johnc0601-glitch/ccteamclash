'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import type {Team} from '@/models/Team';
import type {Match} from '@/shared/types';
import {createSlug} from '@/shared/utils';

type RotatingMatchCardProps = {
  matches: Match[];
  teams: Team[];
};

export function RotatingMatchCard({matches, teams}: RotatingMatchCardProps) {
  const [matchIndex, setMatchIndex] = useState(0);

  useEffect(() => {
    if (matches.length < 2) return undefined;
    const firstPick = window.setTimeout(() => {
      setMatchIndex(Math.floor(Math.random() * matches.length));
    }, 0);
    const timer = window.setInterval(() => {
      setMatchIndex((current) => (current + 1) % matches.length);
    }, 7000);
    return () => {
      window.clearTimeout(firstPick);
      window.clearInterval(timer);
    };
  }, [matches.length]);

  const match = matches[matchIndex] ?? matches[0];
  const homeTeam = findTeam(teams, match?.home);
  const awayTeam = findTeam(teams, match?.away);

  if (!match) {
    return (
      <article className="dark-panel story-home-card next-match-card">
        <div>
          <span className="panel-title">Upcoming</span>
          <h2>Next match</h2>
        </div>
        <p>No upcoming matches have been posted yet.</p>
        <Link href="/schedule" className="gold-link">Full schedule -&gt;</Link>
      </article>
    );
  }

  return (
    <article className="dark-panel story-home-card next-match-card">
      <div>
        <span className="panel-title">Upcoming</span>
        <h2>Next match</h2>
      </div>
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
        <Link href="/schedule" className="gold-link">Full schedule -&gt;</Link>
        {matches.length > 1 ? <span>{matchIndex + 1} / {matches.length}</span> : null}
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
