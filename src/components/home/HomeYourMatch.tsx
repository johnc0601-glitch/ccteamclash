'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import styles from './HomeYourMatch.module.css';

type MatchTeam = {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
};

type YourMatch = {
  id: string;
  href: string;
  date: string;
  time: string;
  course: string;
  isHome: boolean;
  team: MatchTeam;
  opponent: MatchTeam;
  attendance: {
    status: 'Playing' | 'NotPlaying' | 'Unconfirmed';
    open: boolean;
  } | null;
  captain: {
    going: number;
    notGoing: number;
    undecided: number;
    rosterStatus: 'Draft' | 'Confirmed';
  } | null;
};

export function HomeYourMatch() {
  const [match, setMatch] = useState<YourMatch | null>(null);

  useEffect(() => {
    let active = true;
    void fetch('/api/home/your-match', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {'Accept': 'application/json'},
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (active) setMatch(payload?.match ?? null);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  if (!match) return null;

  const attendanceLabel = match.attendance
    ? match.attendance.status === 'Playing'
      ? 'Going'
      : match.attendance.status === 'NotPlaying'
        ? 'Not going'
        : 'Undecided'
    : null;
  const teamLabel = match.team.shortName || match.team.name;
  const opponentLabel = match.opponent.shortName || match.opponent.name;

  return (
    <section className={styles.wrap} aria-label="Your next Team Clash match">
      <article className={styles.card}>
        <div className={styles.heading}>
          <div>
            <span>Your match</span>
            <h2>{teamLabel} {match.isHome ? 'vs' : '@'} {opponentLabel}</h2>
          </div>
          {attendanceLabel ? (
            <span className={styles.status} data-status={match.attendance?.status}>
              {attendanceLabel}
            </span>
          ) : null}
        </div>

        <div className={styles.matchup}>
          <TeamMark team={match.team} />
          <b>{match.isHome ? 'VS' : '@'}</b>
          <TeamMark team={match.opponent} />
        </div>

        <div className={styles.meta}>
          <span><small>When</small>{match.date} · {match.time}</span>
          <span><small>Course</small>{match.course}</span>
          {match.captain ? (
            <span className={styles.captainCue}>
              <small>Team status</small>
              {match.captain.going} going · {match.captain.undecided} undecided
            </span>
          ) : null}
        </div>

        <div className={styles.actions}>
          {match.attendance?.open ? (
            <Link className={styles.secondary} href={`${match.href}#availability`}>
              Availability
            </Link>
          ) : null}
          <Link className={styles.primary} href={match.href}>Matchday</Link>
        </div>
      </article>
    </section>
  );
}

function TeamMark({team}: {team: MatchTeam}) {
  return (
    <div className={styles.team}>
      <span className={styles.logo}>
        {team.logo ? <img src={team.logo} alt="" /> : <b>{initials(team.shortName || team.name)}</b>}
      </span>
      <strong>{team.shortName || team.name}</strong>
    </div>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
