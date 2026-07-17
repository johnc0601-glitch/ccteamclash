import type {ImportStatus} from '@/domain/import/ImportJob';
import styles from './ImportManagement.module.css';

type StatusBadgeProps = {
  status: ImportStatus;
};

const STATUS_CLASS_NAMES: Record<ImportStatus, string> = {
  Pending: 'statusPending',
  Validating: 'statusValidating',
  Ready: 'statusReady',
  Applied: 'statusApplied',
  Failed: 'statusFailed',
  Cancelled: 'statusCancelled',
};

export function StatusBadge({status}: StatusBadgeProps) {
  return <span className={styles[STATUS_CLASS_NAMES[status]]}>{status}</span>;
}

