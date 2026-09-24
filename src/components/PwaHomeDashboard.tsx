'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useHeaderAccess} from '@/components/HeaderAccessProvider';
import {createClient} from '@/lib/supabase/client';
import styles from './PwaHomeDashboard.module.css';

export type PwaHomeMatch = {
  id: string;
  href: string;
  date: string;
  time: string;
  course: string;
  home: string;
  away: string;
  homeTeamId: string;
  awayTeamId: string;
};

export type PwaHomeTeam = {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
};

export type PwaHomeStanding = {
  rank: number;
  teamId: string;
  shortName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
};

export type PwaHomeStory = {
  slug: string;
  title: string;
  preview: string;
} | null;

export type PwaHomePulse = {
  id: string;
  category: string;
  text: string;
};

type AttendanceSummary = {
  yes: number;
  no: number;
  unknown: number;
  own: string | null;
};

export function PwaHomeDashboard({
  matches,
  teams,
  standings,
  story,
  pulse,
}: {
  matches: PwaHomeMatch[];
  teams: PwaHomeTeam[];
  standings: PwaHomeStanding[];
  story: PwaHomeStory;
  pulse: PwaHomePulse[];
}) {
  const {isSignedIn, activeTeamId, playerId, clubhouseHasUnread} = useHeaderAccess();
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [pulseIndex, setPulseIndex] = useState(0);

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const ownTeam = activeTeamId ? teamsById.get(activeTeamId) ?? null : null;
  const ownMatch = activeTeamId
    ? matches.find((match) => match.homeTeamId === activeTeamId || match.awayTeamId === activeTeamId) ?? null
    : null;
  const featuredMatch = ownMatch ?? matches[0] ?? null;
  const currentPulse = pulse.length ? pulse[pulseIndex % pulse.length] : null;

  useEffect(() => {
    if (pulse.length < 2) return;
    const timer = window.setInterval(() => setPulseIndex((value) => (value + 1) % pulse.length), 9000);
    return () => window.clearInterval(timer);
  }, [pulse.length]);

  useEffect(() => {
    if (!ownMatch || !activeTeamId) {
      setAttendance(null);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    void (supabase as any)
      .from('launch_match_attendance')
      .select('player_id,status')
      .eq('match_id', ownMatch.id)
      .eq('team_id', activeTeamId)
      .then(({data}: {data: Array<{player_id: string; status: string}> | null}) => {
        if (cancelled) return;
        const rows = data ?? [];
        setAttendance({
          yes: rows.filter((row) => row.status === 'Playing').length,
          no: rows.filter((row) => row.status === 'NotPlaying').length,
          unknown: rows.filter((row) => row.status === 'Unconfirmed').length,
          own: playerId ? rows.find((row) => row.player_id === playerId)?.status ?? null : null,
        });
      });
    return () => { cancelled = true; };
  }, [activeTeamId, ownMatch?.id, playerId]);

  const homeTeam = featuredMatch ? teamsById.get(featuredMatch.homeTeamId) ?? null : null;
  const awayTeam = featuredMatch ? teamsById.get(featuredMatch.awayTeamId) ?? null : null;
  const played = standings.some((entry) => entry.gamesPlayed > 0);

  return (
    <section className={styles.dashboard} aria-label="Team Clash app home">
      <div className={styles.topline}>
        <div>
          <span className={styles.eyebrow}>{ownMatch ? 'Your next match' : 'Next in Team Clash'}</span>
          {ownTeam ? <strong>{ownTeam.name}</strong> : <strong>{isSignedIn ? 'Team Clash' : 'Welcome to Team Clash'}</strong>}
        </div>
        {clubhouseHasUnread && activeTeamId ? <Link className={styles.unread} href="/clubhouse">Clubhouse · New</Link> : null}
      </div>

      {featuredMatch ? (
        <article
          className={styles.matchHero}
          style={ownTeam ? {'--team-accent': ownTeam.primaryColor} as React.CSSProperties : undefined}
        >
          <div className={styles.matchTeams}>
            <TeamIdentity team={awayTeam} fallback={featuredMatch.away} />
            <div className={styles.versus}><span>VS</span><small>{featuredMatch.date}</small></div>
            <TeamIdentity team={homeTeam} fallback={featuredMatch.home} />
          </div>
          <div className={styles.matchMeta}>
            <span>{featuredMatch.time}</span>
            <span>{featuredMatch.course}</span>
          </div>

          {ownMatch && attendance ? (
            <div className={styles.availability}>
              <div>
                <span>Your availability</span>
                <strong>{availabilityLabel(attendance.own)}</strong>
              </div>
              <div className={styles.availabilityCounts} aria-label="Team availability counts">
                <span><b>{attendance.yes}</b> Yes</span>
                <span><b>{attendance.no}</b> No</span>
                <span><b>{attendance.unknown}</b> ?</span>
              </div>
            </div>
          ) : null}

          <div className={styles.actions}>
            <Link className={styles.primaryAction} href={featuredMatch.href}>Open Matchday</Link>
            {activeTeamId ? <Link className={styles.secondaryAction} href={`/teams/${activeTeamId}`}>Open team</Link> : null}
          </div>
        </article>
      ) : (
        <article className={styles.emptyCard}>
          <strong>No upcoming match is posted yet.</strong>
          <Link href="/schedule">Open schedule</Link>
        </article>
      )}

      <div className={styles.grid}>
        <article className={styles.card}>
          <header><span>Clash Pulse</span><Link href="/league">League</Link></header>
          {currentPulse ? (
            <div className={styles.pulse}>
              <small>{currentPulse.category}</small>
              <strong>{currentPulse.text}</strong>
            </div>
          ) : <p>League facts and movement will appear here.</p>}
        </article>

        <article className={styles.card}>
          <header><span>Standings</span><Link href="/standings">View all</Link></header>
          {played ? (
            <ol className={styles.standings}>
              {standings.slice(0, 4).map((entry) => (
                <li key={entry.teamId}>
                  <b>{entry.rank}</b><span>{entry.shortName}</span><strong>{entry.wins}-{entry.losses}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.preseason}>
              <strong>Season opens October 3</strong>
              <span>Standings populate after Matchday results are published.</span>
            </div>
          )}
        </article>
      </div>

      {story ? (
        <article className={styles.story}>
          <div>
            <span>Latest from Team Clash</span>
            <h2>{story.title}</h2>
            <p>{story.preview}</p>
          </div>
          <Link href={`/stories/${story.slug}`}>Read story →</Link>
        </article>
      ) : null}

      {!isSignedIn ? (
        <aside className={styles.signIn}>
          <strong>Make Team Clash yours.</strong>
          <span>Sign in to see your team, Matchday, availability, and Clubhouse first.</span>
          <Link href="/account">Sign in</Link>
        </aside>
      ) : null}
    </section>
  );
}

function TeamIdentity({team, fallback}: {team: PwaHomeTeam | null; fallback: string}) {
  return (
    <div className={styles.teamIdentity}>
      <div className={styles.logo}>
        {team?.logo ? <Image src={team.logo} alt="" width={72} height={72} sizes="72px" /> : <span>{fallback.slice(0, 2).toUpperCase()}</span>}
      </div>
      <strong>{team?.shortName || fallback}</strong>
    </div>
  );
}

function availabilityLabel(status: string | null) {
  if (status === 'Playing') return 'Yes';
  if (status === 'NotPlaying') return 'No';
  return 'Not answered';
}
