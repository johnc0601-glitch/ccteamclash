import type {HistoricalImportStatus} from '@/domain/history/HistoricalRecord';
import styles from './ImportManagement.module.css';

type StatusBadgeProps = {
  status: HistoricalImportStatus;
};

const STATUS_CLASS_NAMES: Record<HistoricalImportStatus, string> = {
  Ready: 'statusReady',
  Applied: 'statusApplied',
};

export function StatusBadge({status}: StatusBadgeProps) {
  return <span className={styles[STATUS_CLASS_NAMES[status]]}>{status}</span>;
}
