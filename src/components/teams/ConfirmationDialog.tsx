import {DialogShell} from '@/components/teams/DialogShell';
import styles from './TeamManagement.module.css';

type ConfirmationDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  destructive = false,
  submitting,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) {
  return (
    <DialogShell title={title} eyebrow="Confirm action" onClose={onClose} size="small">
      <div className={styles.confirmationBody}>
        <p>{message}</p>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button
            type="button"
            autoFocus
            data-initial-focus
            className={destructive ? styles.dangerButton : styles.primaryButton}
            disabled={submitting}
            onClick={onConfirm}
          >
            {submitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
