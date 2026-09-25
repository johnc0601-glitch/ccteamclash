import Link from 'next/link';
import styles from './PwaMeHub.module.css';

export function PwaMeHub({
  displayName,
  email,
  role,
  teamName,
  teamId,
  clashIndex,
  pdgaRating,
  captainTeamId,
}: {
  displayName: string;
  email: string;
  role: 'Player' | 'Captain' | 'Commissioner';
  teamName: string;
  teamId: string | null;
  clashIndex: number | null | undefined;
  pdgaRating: number | null | undefined;
  captainTeamId: string | null;
}) {
  const canCaptainManage = role === 'Captain' || Boolean(captainTeamId);

  return (
    <section className={styles.hub} data-pwa-surface="me" aria-label="Team Clash app profile">
      <header className={styles.identity}>
        <div>
          <span>Me</span>
          <h1>{displayName}</h1>
          <p>{teamName} · {role}</p>
        </div>
        <div className={styles.ratings}>
          <div><span>CI</span><strong>{clashIndex ?? '—'}</strong></div>
          <div><span>PDGA</span><strong>{pdgaRating ?? '—'}</strong></div>
        </div>
      </header>

      <nav className={styles.primary} aria-label="Profile shortcuts">
        {teamId ? <Link href={`/teams/${teamId}`}><b>My Team</b><span>{teamName}</span></Link> : null}
        <Link href="/matchday"><b>Matchday</b><span>Your next Clash</span></Link>
        {canCaptainManage ? <Link href="/captain"><b>Captain tools</b><span>Roster & team controls</span></Link> : null}
        {role === 'Commissioner' ? <Link href="/office"><b>Commissioner Office</b><span>League administration</span></Link> : null}
      </nav>

      <section className={styles.settings} aria-label="Account and preference shortcuts">
        <header>
          <span>Settings</span>
          <strong>Account & preferences</strong>
        </header>
        <nav>
          <Link href="/account/notifications">
            <span><b>Notifications</b><small>Matchday and Clubhouse alerts</small></span>
            <i aria-hidden="true">›</i>
          </Link>
          <Link href="/account/mutes">
            <span><b>Muted members</b><small>Social-content preferences</small></span>
            <i aria-hidden="true">›</i>
          </Link>
          <Link href="/account?manage=1">
            <span><b>Account settings</b><small>{email}</small></span>
            <i aria-hidden="true">›</i>
          </Link>
        </nav>
      </section>
    </section>
  );
}
