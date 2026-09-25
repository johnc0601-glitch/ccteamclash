import Image from 'next/image';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import type {TeamScheduleEvent} from '@/domain/schedule/ScheduleService';
import type {Team} from '@/models/Team';
import styles from './PwaTeamHub.module.css';

type Attendance = {
  yes: number;
  no: number;
  unknown: number;
  own: string | null;
} | null;

export function PwaTeamHub({
  team,
  nextMatch,
  rosterCount,
  record,
  pointsPercentage,
  isOwnTeam,
  canManage,
  attendance,
  announcement,
}: {
  team: Team;
  nextMatch?: TeamScheduleEvent;
  rosterCount: number;
  record: string;
  pointsPercentage: number;
  isOwnTeam: boolean;
  canManage: boolean;
  attendance: Attendance;
  announcement?: {id: string; title: string; body: string} | null;
}) {
  const brandStyle = {
    '--team-primary': team.primaryColor || '#c89b2b',
    '--team-secondary': team.secondaryColor || '#f4f0e6',
  } as CSSProperties;

  return (
    <section className={styles.hub} data-pwa-surface="team" style={brandStyle} aria-label={`${team.name} team hub`}>
      <header className={styles.hero}>
        <div className={styles.identity}>
          <div className={styles.logo}>
            {team.logo ? <Image src={team.logo} alt="" width={82} height={82} sizes="82px" /> : <span>{team.shortName.slice(0, 2)}</span>}
          </div>
          <div>
            <span>{isOwnTeam ? 'Your team' : 'Team'}</span>
            <h1>{team.name}</h1>
            <p>{team.captain ? `Captain · ${team.captain}` : 'Team Clash'}</p>
          </div>
        </div>
        <div className={styles.metrics}>
          <div><span>Record</span><strong>{record}</strong></div>
          <div><span>Points</span><strong>{pointsPercentage.toFixed(0)}%</strong></div>
          <div><span>Roster</span><strong>{rosterCount}</strong></div>
        </div>
      </header>

      {nextMatch ? (
        <article className={styles.nextMatch}>
          <div className={styles.nextCopy}>
            <span>Next match</span>
            <h2>{nextMatch.isHome ? 'vs' : 'at'} {nextMatch.opponent}</h2>
            <p>{nextMatch.date} · {nextMatch.time}</p>
            <p>{nextMatch.course}</p>
          </div>
          {isOwnTeam && attendance ? (
            <div className={styles.availability}>
              <div>
                <span>Your answer</span>
                <strong>{availabilityLabel(attendance.own)}</strong>
              </div>
              <div className={styles.counts}>
                <span><b>{attendance.yes}</b> Yes</span>
                <span><b>{attendance.no}</b> No</span>
                <span><b>{attendance.unknown}</b> ?</span>
              </div>
            </div>
          ) : null}
          <Link className={styles.matchLink} href={nextMatch.href}>Open Matchday</Link>
        </article>
      ) : null}

      {isOwnTeam && announcement ? (
        <Link className={styles.announcement} href={`/clubhouse#post-${announcement.id}`}>
          <span>Captain announcement</span>
          <strong>{announcement.title || 'Team update'}</strong>
          <p>{announcement.body}</p>
          <b>Open Clubhouse →</b>
        </Link>
      ) : null}

      <nav className={styles.actions} aria-label="Team shortcuts">
        {isOwnTeam ? <Link href="/clubhouse"><b>Clubhouse</b><span>Team discussion</span></Link> : null}
        {isOwnTeam && nextMatch ? <Link href={nextMatch.href}><b>Availability</b><span>Yes / No</span></Link> : null}
        <Link href="#roster"><b>Roster</b><span>{rosterCount} players</span></Link>
        <Link href="#schedule"><b>Schedule</b><span>Season matches</span></Link>
        <Link href="/stats"><b>Players</b><span>Clash Index & stats</span></Link>
        {canManage ? <Link href="/captain"><b>Captain</b><span>Manage team</span></Link> : null}
      </nav>
    </section>
  );
}

function availabilityLabel(status: string | null) {
  if (status === 'Playing') return 'Yes';
  if (status === 'NotPlaying') return 'No';
  return 'Not answered';
}
