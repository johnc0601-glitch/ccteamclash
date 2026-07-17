import type {Season} from '@/domain/season/Season';
import styles from './SeasonManagement.module.css';

type StatusBadgeProps = {
  season: Season;
};

export function StatusBadge({season}: StatusBadgeProps) {
  if (season.archived) return <span className={styles.statusArchived}>Archived</span>;
  if (season.active) return <span className={styles.statusActive}>Active</span>;
  if (season.published) return <span className={styles.statusPublished}>Published</span>;
  return <span className={styles.statusDraft}>Draft</span>;
}
