'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import type {Match} from '@/shared/types';
import {createSlug} from '@/shared/utils';

type RotatingMatchCardProps = {
  matches: Match[];
};

export function RotatingMatchCard({matches}: RotatingMatchCardProps) {
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
          <span className="team-shield">{match.home.slice(0, 2)}</span>
          <strong>{match.home}</strong>
        </Link>
        <b>VS</b>
        <Link className="match-team-link" href={`/teams/${createSlug(match.away)}`}>
          <span className="team-shield">{match.away.slice(0, 2)}</span>
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
