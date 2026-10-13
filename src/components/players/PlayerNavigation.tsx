import Link from 'next/link';
import {PlayerPortalLink} from '@/components/stats/PlayerPortalLink';
import styles from './PlayerNavigation.module.css';

export function PlayerNavigation({current}: {current: 'rankings' | 'search'}) {
  return (
    <nav className={styles.navigation} aria-label="Players">
      <Link href="/stats" prefetch={false} aria-current={current === 'rankings' ? 'page' : undefined}>Rankings</Link>
      <PlayerPortalLink current={current === 'search'} />
    </nav>
  );
}
