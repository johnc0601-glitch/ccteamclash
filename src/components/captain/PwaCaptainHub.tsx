import Link from 'next/link';
import type {CSSProperties} from 'react';
import type {LaunchTeam} from '@/domain/launch/LaunchData';
import type {TeamScheduleEvent} from '@/domain/schedule/ScheduleService';
import {getCaptainRosterHref} from '@/services/matches/CaptainRosterNavigation';
import styles from './PwaCaptainHub.module.css';

export function PwaCaptainHub({
  team,
  nextMatch,
  rosterCount,
  women,
  men,
  junior,
  pendingCount,
  rosterConfirmed,
}: {
  team: LaunchTeam;
  nextMatch: TeamScheduleEvent | null;
  rosterCount: number;
  women: number;
  men: number;
  junior: number;
  pendingCount: number;
  rosterConfirmed: boolean;
}) {
  const brandStyle = {
    '--captain-primary': team.primaryColor || '#c89b2b',
    '--captain-secondary': team.secondaryColor || '#f4f0e6',
  } as CSSProperties;

  return (
    <section
      className={styles.hub}
      data-pwa-surface="captain"
      style={brandStyle}
      aria-label="Captain tools"
    >
      <header className={styles.hero}>
        <div className={styles.identity}>
          <div className={styles.logo}>
            {team.logo ? <img src={team.logo} alt="" /> : <span>{team.shortName.slice(0, 2)}</span>}
          </div>
          <div>
            <span>Captain tools</span>
            <h1>{team.name}</h1>
            <p>{rosterCount} players · {women} Women · {men} Men{junior ? ` · ${junior} Junior` : ''}</p>
          </div>
        </div>

        <div className={styles.status}>
          <div>
            <span>Requests</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>Roster</span>
            <strong>{rosterCount}</strong>
          </div>
        </div>
      </header>

      {nextMatch ? (
        <article className={styles.nextMatch}>
          <div>
            <span>Next Matchday</span>
            <h2>{nextMatch.isHome ? 'vs' : 'at'} {nextMatch.opponent}</h2>
            <p>{nextMatch.date} · {nextMatch.time}</p>
            <p>{nextMatch.course}</p>
            <strong className={rosterConfirmed ? styles.confirmed : styles.needsConfirmation}>
              {rosterConfirmed ? 'Roster confirmed' : 'Roster not confirmed'}
            </strong>
          </div>
          <Link className={styles.primaryAction} href={getCaptainRosterHref(nextMatch.href)}>
            {rosterConfirmed ? 'Review match roster' : 'Manage match roster'}
          </Link>
        </article>
      ) : (
        <article className={styles.empty}>
          <strong>No upcoming match is posted.</strong>
          <Link href="/schedule">Open league schedule</Link>
        </article>
      )}

      <nav className={styles.actions} aria-label="Captain shortcuts">
        <Link href="#season-requests">
          <b>Player requests</b>
          <span>{pendingCount ? `${pendingCount} waiting` : 'Nothing pending'}</span>
        </Link>
        <Link href="#team-roster">
          <b>Team roster</b>
          <span>{rosterCount} active players</span>
        </Link>
        <Link href="/clubhouse">
          <b>Clubhouse</b>
          <span>Announcements & team chat</span>
        </Link>
        <Link href="#team-appearance">
          <b>Team settings</b>
          <span>Logo & colors</span>
        </Link>
      </nav>
    </section>
  );
}
