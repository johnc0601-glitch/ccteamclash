'use client';

import Link from 'next/link';
import {useHeaderAccess} from '@/components/HeaderAccessProvider';
import styles from './TeamDetail.module.css';

export function TeamNextMatchActions({
  teamId,
  matchHref,
  availabilityOpen,
}: {
  teamId: string;
  matchHref: string;
  availabilityOpen: boolean;
}) {
  const {currentTeamId} = useHeaderAccess();
  const isOwnTeam = currentTeamId === teamId;

  return (
    <div className={styles.nextMatchActions}>
      {isOwnTeam && availabilityOpen ? (
        <Link className={styles.secondaryMatchAction} href={`${matchHref}#availability`}>
          Availability
        </Link>
      ) : null}
      <Link className={styles.primaryMatchAction} href={matchHref}>Matchday</Link>
    </div>
  );
}
