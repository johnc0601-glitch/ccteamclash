'use client';

import Link from 'next/link';
import {useHeaderAccess} from '@/components/HeaderAccessProvider';
import styles from '@/app/stats/Stats.module.css';

export function PlayerPortalLink({current = false}: {current?: boolean} = {}) {
  const {canCaptainManage} = useHeaderAccess();

  return (
    <Link
      className={canCaptainManage
        ? `${styles.playerSearchLink} ${styles.captainPlayerSearchLink}`
        : styles.playerSearchLink}
      href="/players"
      aria-current={current ? 'page' : undefined}
      prefetch={false}
    >
      {canCaptainManage ? 'Find / Add Player →' : 'Find Player →'}
    </Link>
  );
}
