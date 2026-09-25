import Link from 'next/link';
import styles from './PwaClubhouseHeader.module.css';

export function PwaClubhouseHeader({
  teamId,
  teamName,
  teamLogo,
  seasonName,
  matchHref,
  isCaptain,
  isCommissionerReview,
}: {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  seasonName: string;
  matchHref: string | null;
  isCaptain: boolean;
  isCommissionerReview: boolean;
}) {
  return (
    <section className={styles.header} data-pwa-surface="clubhouse" aria-label="Clubhouse">
      <div className={styles.identity}>
        <div className={styles.logo}>
          {teamLogo ? <img src={teamLogo} alt="" /> : <span>{teamName.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div>
          <span>{isCommissionerReview ? 'Commissioner review' : isCaptain ? 'Captain Clubhouse' : 'Team Clubhouse'}</span>
          <h1>{teamName}</h1>
          <p>{seasonName}</p>
        </div>
      </div>

      <nav className={styles.actions} aria-label="Clubhouse shortcuts">
        <Link href={`/teams/${teamId}`}>Team</Link>
        {matchHref ? <Link href={matchHref}>Matchday</Link> : null}
        {!isCommissionerReview ? <a href="#clubhouse-composer">Post</a> : null}
        {isCaptain && !isCommissionerReview ? <a href="#clubhouse-moderation">Moderation</a> : null}
      </nav>
    </section>
  );
}
