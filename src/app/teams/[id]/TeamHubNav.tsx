'use client';

import Link from 'next/link';
import {ClubhouseUnreadDisc, useHeaderAccess} from '@/components/HeaderAccessProvider';
import styles from './TeamDetail.module.css';

export function TeamHubNav({teamId}: {teamId: string}) {
  const {
    currentTeamId,
    captainTeamId,
    canCaptainManage,
    hasClubhouse,
    clubhouseHasUnread,
  } = useHeaderAccess();
  const isOwnTeam = currentTeamId === teamId;
  const managesTeam = canCaptainManage && captainTeamId === teamId;

  return (
    <nav className={styles.hubNav} aria-label="Team sections">
      <a href="#overview">Overview</a>
      <a href="#schedule">Schedule</a>
      <a href="#roster">Roster / Stats</a>
      <a href="#history">History</a>
      {isOwnTeam && hasClubhouse ? (
        <Link className={styles.privateHubLink} href="/clubhouse">
          Clubhouse
          {clubhouseHasUnread ? <ClubhouseUnreadDisc /> : null}
        </Link>
      ) : null}
      {managesTeam ? <Link className={styles.privateHubLink} href="/captain">Captain</Link> : null}
    </nav>
  );
}
