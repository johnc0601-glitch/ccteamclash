import type {ReactNode} from 'react';
import styles from './MatchdaySection.module.css';

export function MatchdaySection({title, collapsed = true, children}: {title: string; collapsed?: boolean; children: ReactNode}) {
  if (!collapsed) return <>{children}</>;
  return <details className={styles.section}><summary>{title}</summary><div className={styles.body}>{children}</div></details>;
}
